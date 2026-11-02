export type Lang = 'ja' | 'en';

export const messages = {
  ja: {
    appTitle: "Audio Player NG",
    appSub: "可変ピッチ & スピード、Signalsmith Wasm使用",
    dropZoneText: "音声/動画ファイルを選択 または ドラッグ＆ドロップ",
    dropZoneSub: "MP3, WAV, AAC, M4A, MP4, WebM 等",
    androidTip: "💡 Android/Galaxy: ファイル選択で「写真と動画」を選ぶと Google ドライブ内の音声も選択できます",
    unsupportedTitle: "⚠️ お使いのブラウザは非対応です",
    unsupportedMsg: "この端末/ブラウザは最新のオーディオ処理(AudioWorklet/Wasm)に対応していません。",
    legacyBtn: "旧バージョン(レガシー版)を開く",
    keyTitle: "ピッチ (半音)",
    centsTitle: "微調整 (セント)",
    totalPitch: "計",
    preset440: "A = 440Hz (±0¢)",
    preset442: "A = 442Hz (+8¢)",
    preset442Title: "440Hz音源を標準オーケストラ/ピアノの442Hzに合わせる (+7.85¢)",
    tempoTitle: "再生速度 (テンポ)",
    volumeTitle: "音量",
    mute: "Mute",
    standard: "標準",
    original: "原音",
    recNotice: "※ -6dB推奨 (音割れ防止)",
    reset: "リセット",
    setA: "A点に設定",
    setB: "B点に設定",
    resetAB: "区間リセット",
    loopWait: "ループ待機中... (残り {sec}秒)",
    loopActive: "ループON (2秒間隔)",
    loopInactive: "ループOFF",
    exportBtn: "WAV書き出し",
    exporting: "レンダリング中...",
    exportSuccess: "書き出し完了！",
    version: "バージョン",
  },
  en: {
    appTitle: "Audio Player NG",
    appSub: "Variable pitch/speed, powered by Signalsmith Wasm",
    dropZoneText: "Select or drop audio/video file",
    dropZoneSub: "MP3, WAV, AAC, M4A, MP4, WebM etc.",
    androidTip: "💡 Android/Galaxy: Select 'Photos & Videos' to choose audio files from Google Drive",
    unsupportedTitle: "⚠️ Unsupported Browser/Device",
    unsupportedMsg: "Your browser does not support modern Web Audio features (AudioWorklet/Wasm).",
    legacyBtn: "Open Legacy Player",
    keyTitle: "Pitch (Semitones)",
    centsTitle: "Fine Tune (Cents)",
    totalPitch: "Total",
    preset440: "A = 440Hz (±0¢)",
    preset442: "A = 442Hz (+8¢)",
    preset442Title: "Tune 440Hz audio to 442Hz standard (+7.85¢)",
    tempoTitle: "Speed (Tempo)",
    volumeTitle: "Volume",
    mute: "Mute",
    standard: "Std",
    original: "0dB",
    recNotice: "※ -6dB recommended",
    reset: "Reset",
    setA: "Set A",
    setB: "Set B",
    resetAB: "Reset AB",
    loopWait: "Waiting loop... ({sec}s)",
    loopActive: "Loop ON (2s interval)",
    loopInactive: "Loop OFF",
    exportBtn: "Export WAV",
    exporting: "Rendering...",
    exportSuccess: "Export Completed!",
    version: "Version",
  }
};

export const getDefaultLang = (): Lang => {
  if (typeof window !== 'undefined' && navigator.language) {
    return navigator.language.startsWith('ja') ? 'ja' : 'en';
  }
  return 'en';
};

export const formatTime = (secs: number): string => {
  if (isNaN(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
};

// 動作環境チェック (AudioWorklet と WebAssembly のサポート判定)
export const checkCompatibility = (): boolean => {
  if (typeof window === 'undefined') return true;
  const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window;
  const hasWorklet = 'AudioWorkletNode' in window;
  const hasWasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  return hasAudioContext && hasWorklet && hasWasm;
};
