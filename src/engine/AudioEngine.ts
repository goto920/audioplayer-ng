// @ts-ignore
import SignalsmithStretch from 'signalsmith-stretch';
import { audioBufferToWavBlob } from '../lib/wav';
import { audioBufferToMp3Blob } from '../lib/mp3';

export interface AudioEngineCallbacks {
  onTimeUpdate: (currentTime: number) => void;
  onEnded: () => void;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private stretchNode: any = null;
  private gainNode: GainNode | null = null;
  
  // 生の PCM 配列 (エクスポート用)
  private channelBuffers: Float32Array[] = [];
  private sampleRate = 44100;
  private numberOfChannels = 2;

  // 波形描画用の軽量ピーク配列 (数KB)
  public peaks: number[] = [];

  // 再生状態
  public isPlaying = false;
  public duration = 0;
  public tempo = 1.0;
  public semitones = 0;
  public cents = 0;
  public volume = -6;

  private callbacks: AudioEngineCallbacks;

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public get totalPitch(): number {
    return this.semitones + (this.cents / 100);
  }

  // ★ AudioContext の初期化 (1つだけ生成して使い回す)
  private async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  // ★ AudioContext は閉じず、dropBuffers で Wasm メモリのみを完全解放
  public async disposeCurrentSound() {
    this.pause();

    if (this.stretchNode) {
      try {
        if (typeof this.stretchNode.dropBuffers === 'function') {
          await this.stretchNode.dropBuffers();
        }
        this.stretchNode.disconnect();
      } catch (e) {
        console.warn('dropBuffers error:', e);
      }
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {}
    }

    this.channelBuffers = [];
    this.peaks = [];
    this.duration = 0;
  }

  public async loadFile(file: File): Promise<string> {
    const ctx = await this.ensureContext();
    await this.disposeCurrentSound();

    const arrayBuffer = await file.arrayBuffer();
    const decodedAudio = await ctx.decodeAudioData(arrayBuffer);
    this.duration = decodedAudio.duration;
    this.sampleRate = decodedAudio.sampleRate;
    this.numberOfChannels = decodedAudio.numberOfChannels;

    this.channelBuffers = [];
    for (let c = 0; c < this.numberOfChannels; c++) {
      this.channelBuffers.push(decodedAudio.getChannelData(c));
    }

    // 波形ピークの計算
    this.calculatePeaks(this.channelBuffers[0]);

    // stretchNode が無ければ作る (Safari で Blob 登録が何度も走るのを防ぐ)
    if (!this.stretchNode) {
      this.stretchNode = await SignalsmithStretch(ctx);
    }
    await this.stretchNode.addBuffers(this.channelBuffers);

    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.setVolume(this.volume);
    }

    this.stretchNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.stretchNode.setUpdateInterval(0.05, () => {
      if (this.isPlaying && this.stretchNode) {
        const time = this.stretchNode.inputTime;
        this.callbacks.onTimeUpdate(time);
        if (time >= this.duration) {
          this.pause();
          this.callbacks.onEnded();
        }
      }
    });

    return file.name;
  }

  // 1秒あたり40本の高精細ピーク計算
  private calculatePeaks(channelData: Float32Array) {
    const pointsPerSecond = 40;
    const totalBars = Math.max(600, Math.floor(this.duration * pointsPerSecond));
    const totalSamples = channelData.length;
    const blockSize = Math.floor(totalSamples / totalBars);
    this.peaks = [];

    for (let i = 0; i < totalBars; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j += 4) {
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      this.peaks.push(Math.pow(max, 0.7));
    }
  }

  public async play(offsetSec = 0) {
    if (!this.stretchNode || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const safeOffset = Math.max(0, Math.min(offsetSec, this.duration));

    this.stretchNode.schedule({
      output: this.ctx.currentTime,
      active: true,
      input: safeOffset,
      rate: this.tempo,
      semitones: this.totalPitch
    });

    this.isPlaying = true;
  }

  public pause() {
    if (!this.stretchNode) return;
    this.stretchNode.schedule({ active: false });
    this.isPlaying = false;
  }

  public stop() {
    this.pause();
    if (this.stretchNode) {
      this.callbacks.onTimeUpdate(0);
    }
  }

  public seek(targetSec: number) {
    if (!this.stretchNode) return;
    const safeTarget = Math.max(0, Math.min(targetSec, this.duration));
    if (this.isPlaying) {
      this.play(safeTarget);
    } else {
      this.callbacks.onTimeUpdate(safeTarget);
    }
  }

  public setTempo(tempo: number) {
    this.tempo = tempo;
    if (this.stretchNode && this.isPlaying) {
      this.stretchNode.schedule({ rate: tempo });
    }
  }

  public setPitch(semitones: number, cents: number) {
    this.semitones = semitones;
    this.cents = cents;
    if (this.stretchNode && this.isPlaying) {
      this.stretchNode.schedule({ semitones: this.totalPitch });
    }
  }

  public setVolume(db: number) {
    this.volume = db;
    if (this.gainNode) {
      if (db <= -40) {
        this.gainNode.gain.value = 0;
      } else {
        this.gainNode.gain.value = Math.pow(10, db / 20);
      }
    }
  }

  public getCurrentTime(): number {
    return this.stretchNode ? this.stretchNode.inputTime : 0;
  }

  public async exportWav(startSec: number, endSec: number): Promise<Blob> {
    if (this.channelBuffers.length === 0) throw new Error("No audio loaded");

    const durationToRender = (endSec - startSec) / this.tempo;
    const totalFrames = Math.ceil(durationToRender * this.sampleRate);

    const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtx(this.numberOfChannels, totalFrames, this.sampleRate);

    const offlineStretch = await SignalsmithStretch(offlineCtx);
    await offlineStretch.addBuffers(this.channelBuffers);

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = this.volume <= -40 ? 0 : Math.pow(10, this.volume / 20);

    offlineStretch.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    offlineStretch.schedule({
      output: 0,
      active: true,
      input: startSec,
      rate: this.tempo,
      semitones: this.totalPitch
    });

    const renderedAudioBuffer = await offlineCtx.startRendering();
    await offlineStretch.dropBuffers?.();
    return audioBufferToWavBlob(renderedAudioBuffer);
  }

  public async exportMp3(startSec: number, endSec: number, kbps = 192): Promise<Blob> {
    if (this.channelBuffers.length === 0) throw new Error("No audio loaded");

    const durationToRender = (endSec - startSec) / this.tempo;
    const totalFrames = Math.ceil(durationToRender * this.sampleRate);

    const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtx(this.numberOfChannels, totalFrames, this.sampleRate);

    const offlineStretch = await SignalsmithStretch(offlineCtx);
    await offlineStretch.addBuffers(this.channelBuffers);

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = this.volume <= -40 ? 0 : Math.pow(10, this.volume / 20);

    offlineStretch.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    offlineStretch.schedule({
      output: 0,
      active: true,
      input: startSec,
      rate: this.tempo,
      semitones: this.totalPitch
    });

    const renderedAudioBuffer = await offlineCtx.startRendering();
    await offlineStretch.dropBuffers?.();
    return audioBufferToMp3Blob(renderedAudioBuffer, kbps);
  }
}
