import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Upload, Globe, 
  RotateCcw as RewindIcon, RotateCw as FastForwardIcon, Repeat, Download, Loader2,
  ExternalLink, Info
} from 'lucide-react';

import { messages, getDefaultLang, formatTime, checkCompatibility } from './messages';
import type { Lang } from './messages';
import { AudioEngine } from './engine/AudioEngine';
import { Waveform } from './components/Waveform';

export default function App() {
  const [lang, setLang] = useState<Lang>(getDefaultLang);
  const t = messages[lang];

  const [isSupported] = useState<boolean>(checkCompatibility);

  const [fileLoaded, setFileLoaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [exportFormat, setExportFormat] = useState<'mp3' | 'wav'>('mp3');

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // A-B ループ関連
  const [loopA, setLoopA] = useState(0);
  const [loopB, setLoopB] = useState(0);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [loopCountdown, setLoopCountdown] = useState<number | null>(null);

  // ピッチ・テンポ・音量
  const [semitones, setSemitones] = useState(0);
  const [cents, setCents] = useState(0);
  const [tempo, setTempo] = useState(1.0);
  const [volume, setVolume] = useState(-6);
  const [prevVolume, setPrevVolume] = useState(-6);

  const loopTimeoutRef = useRef<number | null>(null);
  const isWaitingLoopRef = useRef(false);

  // ★ 最新の設定を常に保持する Ref (古いクロージャ問題を完全に根絶)
  const isLoopEnabledRef = useRef(isLoopEnabled);
  const loopARef = useRef(loopA);
  const loopBRef = useRef(loopB);
  const durationRef = useRef(duration);
  useEffect(() => { isLoopEnabledRef.current = isLoopEnabled; }, [isLoopEnabled]);
  useEffect(() => { loopARef.current = loopA; }, [loopA]);
  useEffect(() => { loopBRef.current = loopB; }, [loopB]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // 待機タイマーの完全クリア
  const clearLoopTimeout = useCallback(() => {
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
    isWaitingLoopRef.current = false;
    setLoopCountdown(null);
  }, []);

  // ★ A-B ループ終端到達時の処理 (常に最新の Ref を参照)
  const handleEndReached = useCallback(() => {
    if (isWaitingLoopRef.current) return;

    const currentLoopEnabled = isLoopEnabledRef.current;
    const currentA = loopARef.current;

    if (currentLoopEnabled && engineRef.current) {
      isWaitingLoopRef.current = true;
      engineRef.current.pause();
      setIsPlaying(false);
      
      setCurrentTime(currentA);
      setLoopCountdown(2);

      setTimeout(() => {
        if (isWaitingLoopRef.current) setLoopCountdown(1);
      }, 1000);

      loopTimeoutRef.current = window.setTimeout(async () => {
        setLoopCountdown(null);
        isWaitingLoopRef.current = false;
        
        if (engineRef.current) {
          // iPad対策: 再生前にコンテキストを確実に起こして A点からスタート
          await engineRef.current.play(currentA);
          setIsPlaying(true);
        }
      }, 2000);
    } else {
      if (engineRef.current) engineRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // AudioEngine インスタンスの生成
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current && isSupported) {
    engineRef.current = new AudioEngine({
      onTimeUpdate: (time) => {
        if (!isWaitingLoopRef.current) {
          setCurrentTime(time);
        }
      },
      onEnded: () => {
        handleEndReached();
      }
    });
  }
  const engine = engineRef.current;

  // ループ B点 超過チェック (再生中)
  useEffect(() => {
    if (isPlaying && isLoopEnabled && !isWaitingLoopRef.current && currentTime >= loopB) {
      handleEndReached();
    }
  }, [currentTime, isPlaying, isLoopEnabled, loopB, handleEndReached]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !engine) return;

    clearLoopTimeout();

    const loadedName = await engine.loadFile(file);
    setFileName(loadedName);
    setDuration(engine.duration);
    setCurrentTime(0);
    setLoopA(0);
    setLoopB(engine.duration);
    setFileLoaded(true);
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (!engine) return;
    if (isPlaying || isWaitingLoopRef.current) {
      clearLoopTimeout();
      engine.pause();
      setIsPlaying(false);
    } else {
      clearLoopTimeout();
      const currentA = loopARef.current;
      const currentB = loopBRef.current;
      const startPos = (currentTime >= currentB - 0.1 || currentTime >= durationRef.current - 0.1) ? currentA : currentTime;
      setCurrentTime(startPos);
      await engine.play(startPos);
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    if (!engine) return;
    clearLoopTimeout();
    setCurrentTime(time);
    engine.seek(time);
  };

  const updatePitch = (semi: number, cnt: number) => {
    setSemitones(semi);
    setCents(cnt);
    if (engine) engine.setPitch(semi, cnt);
  };

  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo);
    if (engine) engine.setTempo(newTempo);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (engine) engine.setVolume(newVol);
  };

  const toggleMute = () => {
    if (volume <= -40) {
      handleVolumeChange(prevVolume || -6);
    } else {
      setPrevVolume(volume);
      handleVolumeChange(-40);
    }
  };

  const handleExport = async () => {
    if (isExporting || !engine) return;
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    }

    setIsExporting(true);

    try {
      const startSec = isLoopEnabled ? loopA : 0;
      const endSec = isLoopEnabled ? loopB : duration;

      let blob: Blob;
      if (exportFormat === 'mp3') {
        blob = await engine.exportMp3(startSec, endSec, 192);
      } else {
        blob = await engine.exportWav(startSec, endSec);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      const pitchStr = engine.totalPitch >= 0 ? `+${engine.totalPitch.toFixed(2)}` : engine.totalPitch.toFixed(2);
      const tempoStr = Math.round(tempo * 100);
      const rangeStr = isLoopEnabled ? `_AB(${formatTime(startSec)}-${formatTime(endSec)})` : '';
      
      a.href = url;
      a.download = `${baseName}_key${pitchStr}_tempo${tempoStr}%${rangeStr}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed: " + err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-xl bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 flex flex-col gap-6">
        
        {/* ヘッダー */}
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-wide">{t.appTitle}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{t.appSub}</p>
          </div>
          <button
            onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 transition"
          >
            <Globe className="w-3.5 h-3.5 text-slate-300" />
            <span>{lang === 'ja' ? 'EN' : '日本語'}</span>
          </button>
        </div>

        {/* 非対応ブラウザ警告 */}
        {!isSupported && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col gap-2.5">
            <div className="font-bold text-amber-400 text-sm">{t.unsupportedTitle}</div>
            <p className="text-xs text-slate-300 leading-relaxed">{t.unsupportedMsg}</p>
            <a
              href="https://goto920.github.io/variable-speed-pitch-audio-player/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              <span>{t.legacyBtn}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* ファイル選択 */}
        <div className="flex flex-col gap-2">
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-slate-700/50 transition">
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm font-medium text-slate-300 text-center truncate max-w-xs sm:max-w-md">
              {fileName || t.dropZoneText}
            </span>
            <span className="text-xs text-slate-500 mt-1">{t.dropZoneSub}</span>
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.aac,.m4a,.opus,.webm,video/*,.mp4"
              className="hidden"
              onChange={handleFileChange}
              disabled={!isSupported}
            />
          </label>

          <div className="flex items-start gap-1.5 px-2 text-[11px] text-slate-400 leading-tight">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>{t.androidTip}</span>
          </div>
        </div>

        {fileLoaded && (
          <div className="flex flex-col gap-5 animate-fade-in">

            {/* 時間表示 ＆ エクスポートコントロール */}
            <div className="flex justify-between items-center px-1">
              <div className="flex items-baseline gap-2">
                <div className="font-mono text-2xl font-bold text-white tracking-wider">
                  {formatTime(currentTime)}
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    / {formatTime(duration)}
                  </span>
                </div>

                {loopCountdown !== null && (
                  <div className="text-xs font-semibold text-amber-400 animate-pulse bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    {t.loopWait.replace('{sec}', String(loopCountdown))}
                  </div>
                )}
              </div>

              {/* エクスポート */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-700">
                <div className="flex text-[11px] font-bold bg-slate-800 rounded p-0.5">
                  <button
                    onClick={() => setExportFormat('mp3')}
                    className={`px-2 py-1 rounded transition ${
                      exportFormat === 'mp3' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    MP3
                  </button>
                  <button
                    onClick={() => setExportFormat('wav')}
                    className={`px-2 py-1 rounded transition ${
                      exportFormat === 'wav' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    WAV
                  </button>
                </div>

                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded text-xs font-bold shadow active:scale-95 transition"
                  title={`${exportFormat.toUpperCase()}でダウンロード`}
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{exportFormat.toUpperCase()}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ピーク波形シークバー */}
            <Waveform
              audioBuffer={engine?.rawAudioBuffer || null}
              currentTime={currentTime}
              duration={duration}
              loopA={loopA}
              loopB={loopB}
              isLoopEnabled={isLoopEnabled}
              onSeek={handleSeek}
            />

            {/* 再生コントロール */}
            <div className="flex justify-center items-center gap-4 py-1">
              <button
                onClick={() => handleSeek(currentTime - 5)}
                className="p-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 active:scale-95 transition"
                title="-5秒"
              >
                <RewindIcon className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition"
              >
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
              </button>

              <button
                onClick={() => handleSeek(currentTime + 5)}
                className="p-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 active:scale-95 transition"
                title="+5秒"
              >
                <FastForwardIcon className="w-5 h-5" />
              </button>
            </div>

            {/* A-B ループ パネル */}
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Repeat className="w-4 h-4 text-indigo-400" />
                  <span>A-B Repeat</span>
                </div>
                <button
                  onClick={() => setIsLoopEnabled(!isLoopEnabled)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    isLoopEnabled
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isLoopEnabled ? t.loopActive : t.loopInactive}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 mb-0.5">A 点</div>
                  <div className="font-mono text-xs font-bold text-indigo-300 mb-1.5">
                    {formatTime(loopA)}
                  </div>
                  <button
                    onClick={() => setLoopA(Math.max(0, Math.min(currentTime, loopB - 0.1)))}
                    className="w-full py-1 text-[11px] bg-slate-700 hover:bg-slate-600 rounded font-semibold active:scale-95 transition"
                  >
                    {t.setA}
                  </button>
                </div>

                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 mb-0.5">B 点</div>
                  <div className="font-mono text-xs font-bold text-indigo-300 mb-1.5">
                    {formatTime(loopB)}
                  </div>
                  <button
                    onClick={() => setLoopB(Math.min(duration, Math.max(currentTime, loopA + 0.1)))}
                    className="w-full py-1 text-[11px] bg-slate-700 hover:bg-slate-600 rounded font-semibold active:scale-95 transition"
                  >
                    {t.setB}
                  </button>
                </div>

                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 flex flex-col justify-end">
                  <button
                    onClick={() => { setLoopA(0); setLoopB(duration); }}
                    className="w-full py-2 text-[11px] bg-slate-700/60 hover:bg-slate-600 text-slate-300 rounded font-semibold active:scale-95 transition mt-auto"
                  >
                    {t.resetAB}
                  </button>
                </div>
              </div>
            </div>

            {/* キー / ピッチ */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-slate-300">{t.keyTitle}</span>
                  <span className="text-sm font-mono text-indigo-400 font-bold">
                    {semitones > 0 ? `+${semitones}` : semitones} semi
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updatePitch(Math.max(-12, semitones - 1), cents)}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold active:scale-95 transition"
                  >
                    -1
                  </button>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={semitones}
                    onChange={(e) => updatePitch(Number(e.target.value), cents)}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <button
                    onClick={() => updatePitch(Math.min(12, semitones + 1), cents)}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold active:scale-95 transition"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => updatePitch(0, cents)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 active:scale-95 transition"
                    title={t.reset}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* セント微調整 */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-400">{t.centsTitle}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {cents > 0 ? `+${cents}` : cents} ¢
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({t.totalPitch} {(semitones + cents / 100).toFixed(2)})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updatePitch(semitones, Math.max(-50, cents - 1))}
                    className="px-2 py-0.5 bg-slate-700/80 hover:bg-slate-600 rounded text-xs active:scale-95 transition"
                  >
                    -1¢
                  </button>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={cents}
                    onChange={(e) => updatePitch(semitones, Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <button
                    onClick={() => updatePitch(semitones, Math.min(50, cents + 1))}
                    className="px-2 py-0.5 bg-slate-700/80 hover:bg-slate-600 rounded text-xs active:scale-95 transition"
                  >
                    +1¢
                  </button>
                  <button
                    onClick={() => updatePitch(semitones, 0)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 active:scale-95 transition"
                    title={t.reset}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => updatePitch(semitones, 0)}
                    className={`text-[11px] px-2.5 py-0.5 rounded border transition ${
                      cents === 0
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {t.preset440}
                  </button>
                  <button
                    onClick={() => updatePitch(semitones, 8)}
                    className={`text-[11px] px-2.5 py-0.5 rounded border transition ${
                      cents === 8
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                    title={t.preset442Title}
                  >
                    {t.preset442}
                  </button>
                </div>
              </div>
            </div>

            {/* テンポコントロール */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-slate-300">{t.tempoTitle}</span>
                <span className="text-sm font-mono text-indigo-400 font-bold">
                  {Math.round(tempo * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTempoChange(Math.max(0.5, Number((tempo - 0.05).toFixed(2))))}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold active:scale-95 transition"
                >
                  -5%
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.01"
                  value={tempo}
                  onChange={(e) => handleTempoChange(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <button
                  onClick={() => handleTempoChange(Math.min(2.0, Number((tempo + 0.05).toFixed(2))))}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold active:scale-95 transition"
                >
                  +5%
                </button>
                <button
                  onClick={() => handleTempoChange(1.0)}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 active:scale-95 transition"
                  title={t.reset}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 音量 */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-1 text-slate-400 hover:text-slate-200 transition"
                    title={volume <= -40 ? "Unmute" : "Mute"}
                  >
                    {volume <= -40 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <span className="text-sm font-semibold text-slate-300">{t.volumeTitle}</span>
                </div>
                <span className="text-sm font-mono text-emerald-400 font-bold">
                  {volume <= -40 ? t.mute.toUpperCase() : `${volume > 0 ? `+${volume}` : volume} dB`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-40"
                  max="6"
                  step="1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVolumeChange(-40)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded"
                  >
                    {t.mute}
                  </button>
                  <button
                    onClick={() => handleVolumeChange(-6)}
                    className={`px-2 py-0.5 border rounded transition ${
                      volume === -6
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    -6 dB ({t.standard})
                  </button>
                  <button
                    onClick={() => handleVolumeChange(0)}
                    className={`px-2 py-0.5 border rounded transition ${
                      volume === 0
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    0 dB ({t.original})
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">{t.recNotice}</span>
              </div>
            </div>

          </div>
        )}

        {/* フッター */}
        <div className="border-t border-slate-700/60 pt-3 flex justify-between items-center text-[11px] text-slate-500">
          <span>Audio Player Next Generation</span>
          <span className="font-mono">{__BUILD_VERSION__}</span>
        </div>

      </div>
    </div>
  );
}
