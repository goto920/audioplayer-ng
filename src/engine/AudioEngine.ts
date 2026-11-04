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
  private audioBuffer: AudioBuffer | null = null;
  private channelBuffers: Float32Array[] = [];

  // 再生状態
  public isPlaying = false;
  public duration = 0;
  public tempo = 1.0;
  public semitones = 0;
  public cents = 0;
  public volume = -6; // dB

  private callbacks: AudioEngineCallbacks;

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
  }

  // 波形描画用の AudioBuffer ゲッター
  public get rawAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  // ピッチの合計値 (半音 + セント/100)
  public get totalPitch(): number {
    return this.semitones + (this.cents / 100);
  }

  // AudioContext の初期化 (ユーザー操作直後に呼ぶ)
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

  // 音声ファイルのデコードと Wasm へのバッファ転送
  public async loadFile(file: File): Promise<string> {
    const ctx = await this.ensureContext();
    this.stop();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;

    // チャンネル配列 (L, R) を抽出
    this.channelBuffers = [];
    for (let c = 0; c < this.audioBuffer.numberOfChannels; c++) {
      this.channelBuffers.push(this.audioBuffer.getChannelData(c));
    }

    // 既存ノードの破棄
    if (this.stretchNode) {
      this.stretchNode.disconnect();
      this.stretchNode = null;
    }

    // Signalsmith Stretch Wasm ノードの生成
    this.stretchNode = await SignalsmithStretch(ctx);
    await this.stretchNode.addBuffers(this.channelBuffers);

    // ゲインノード接続: Stretch -> Gain -> Destination
    this.gainNode = ctx.createGain();
    this.setVolume(this.volume);

    this.stretchNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    // 再生位置の定期コールバック (0.05秒間隔)
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

  // 指定位置から再生開始
  public async play(offsetSec = 0) {
    if (!this.stretchNode || !this.ctx) return;
    await this.ensureContext();

    const safeOffset = Math.max(0, Math.min(offsetSec, this.duration));

    // Signalsmith に再生スケジュールを送信
    this.stretchNode.schedule({
      output: this.ctx.currentTime,
      active: true,
      input: safeOffset,
      rate: this.tempo,
      semitones: this.totalPitch
    });

    this.isPlaying = true;
  }

  // 一時停止
  public pause() {
    if (!this.stretchNode) return;
    this.stretchNode.schedule({ active: false });
    this.isPlaying = false;
  }

  // 完全停止
  public stop() {
    this.pause();
    if (this.stretchNode) {
      this.callbacks.onTimeUpdate(0);
    }
  }

  // シーク (再生中ならシームレスに位置ジャンプ)
  public seek(targetSec: number) {
    if (!this.stretchNode) return;
    const safeTarget = Math.max(0, Math.min(targetSec, this.duration));
    if (this.isPlaying) {
      this.play(safeTarget);
    } else {
      this.callbacks.onTimeUpdate(safeTarget);
    }
  }

  // テンポ変更 (0.5 ~ 2.0)
  public setTempo(tempo: number) {
    this.tempo = tempo;
    if (this.stretchNode && this.isPlaying) {
      this.stretchNode.schedule({ rate: tempo });
    }
  }

  // ピッチ変更
  public setPitch(semitones: number, cents: number) {
    this.semitones = semitones;
    this.cents = cents;
    if (this.stretchNode && this.isPlaying) {
      this.stretchNode.schedule({ semitones: this.totalPitch });
    }
  }

  // 音量変更 (dB)
  public setVolume(db: number) {
    this.volume = db;
    if (this.gainNode) {
      if (db <= -40) {
        this.gainNode.gain.value = 0; // 実質ミュート
      } else {
        this.gainNode.gain.value = Math.pow(10, db / 20);
      }
    }
  }

  // 現在位置の取得
  public getCurrentTime(): number {
    return this.stretchNode ? this.stretchNode.inputTime : 0;
  }

  // 高速オフライン書き出し (プレーンな OfflineAudioContext で一瞬で完了)
  public async exportWav(startSec: number, endSec: number): Promise<Blob> {
    if (!this.audioBuffer || this.channelBuffers.length === 0) {
      throw new Error("No audio buffer loaded");
    }

    const durationToRender = (endSec - startSec) / this.tempo;
    const sampleRate = this.audioBuffer.sampleRate;
    const numChannels = this.audioBuffer.numberOfChannels;
    const totalFrames = Math.ceil(durationToRender * sampleRate);

    const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtx(numChannels, totalFrames, sampleRate);

    // オフライン用 Signalsmith ノード
    const offlineStretch = await SignalsmithStretch(offlineCtx);
    await offlineStretch.addBuffers(this.channelBuffers);

    // ゲインノード (-6dB などの音量もそのまま適用)
    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = this.volume <= -40 ? 0 : Math.pow(10, this.volume / 20);

    offlineStretch.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    // レンダリング予約
    offlineStretch.schedule({
      output: 0,
      active: true,
      input: startSec,
      rate: this.tempo,
      semitones: this.totalPitch
    });

    // C++ レベルで高速レンダリング
    const renderedAudioBuffer = await offlineCtx.startRendering();
    return audioBufferToWavBlob(renderedAudioBuffer);
  }

// 高速オフライン書き出し (MP3版)
  public async exportMp3(startSec: number, endSec: number, kbps = 192): Promise<Blob> {
    if (!this.audioBuffer || this.channelBuffers.length === 0) {
      throw new Error("No audio buffer loaded");
    }

    const durationToRender = (endSec - startSec) / this.tempo;
    const sampleRate = this.audioBuffer.sampleRate;
    const numChannels = this.audioBuffer.numberOfChannels;
    const totalFrames = Math.ceil(durationToRender * sampleRate);

    const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtx(numChannels, totalFrames, sampleRate);

    // オフライン用 Signalsmith ノード
    // @ts-ignore
    const SignalsmithStretch = (await import('signalsmith-stretch')).default;
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
    // ★ ここで MP3 に変換！
    return audioBufferToMp3Blob(renderedAudioBuffer, kbps);
  }
}
