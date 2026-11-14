export type Lang = 'ja' | 'en';

export const messages = {
  ja: {
    appTitle: "Audio Player NG",
    appSub: "Audio Player Next Generation (キー & テンポ 練習用)",
    dropZoneText: "音声/動画ファイルを選択 または ドラッグ＆ドロップ",
    dropZoneSub: "MP3, WAV, AAC, M4A, MP4, WebM 等",
    androidTip: "💡 Android/Galaxy: ファイル選択で「写真と動画」を選ぶと Google ドライブ内の音声も選択できます",
    unsupportedTitle: "⚠️ お使いのブラウザは非対応です",
    unsupportedMsg: "この端末/ブラウザは最新のオーディオ処理(AudioWorklet/Wasm)に対応していません。",
    legacyBtn: "旧バージョン(レガシー版)を開く",
    keyTitle: "キー (半音)",
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
    exportBtn: "書き出し",
    exporting: "処理中...",
    exportSuccess: "書き出し完了！",
    newVersionNotice: "✨ 新しいバージョンが利用可能です",
    updateBtn: "今すぐ更新",
    helpTitle: "クイック操作ガイド",
    helpClose: "閉じる",
    helpItems: [
      {
        title: "🥁 A-B間ループ ＆ 2秒インターバル",
        desc: "苦手なフレーズの頭で「A点」、終わりで「B点」を押すと自動リピートします。終端に達すると自動で2秒待機してから先頭に戻るため、スティックや楽器を構え直す時間が作れます。"
      },
      {
        title: "🔍 最大32倍ズーム波形 ＆ 吸着シーク",
        desc: "「+」ボタンで最大32倍まで拡大可能。ドラムのスネアやキックのアタック山がクッキリ見えます。大雑把に左端へドラッグしても、A点（または先頭0秒）にピタッと吸着して止まります。"
      },
      {
        title: "🎯 ピッチ微調整 (半音 ＆ セント)",
        desc: "半音単位のキー変更に加え、1セント（1/100半音）単位のチューニングが可能。昔の音源や442Hzピアノに合わせる「A=442Hz」ボタンも搭載。"
      },
      {
        title: "💾 WAV ＆ MP3 書き出し",
        desc: "練習用にテンポやキーを変えた音源をファイル保存できます。一瞬で終わる「WAV」と、スマホ保存に最適な軽量「MP3」を用途に合わせて選べます。"
      },
      {
        title: "🔒 安心設計 ＆ 完全オフライン動作",
        desc: "選んだ音源ファイルはブラウザ内部でのみ処理され、外部サーバーには一切送信されません。インストールしなくても、ブックマークしておくだけで電波のない地下スタジオでそのままオフライン利用できます。"
      }
    ]
  },
  en: {
    appTitle: "Audio Player NG",
    appSub: "Audio Player Next Generation (Practice Tool)",
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
    exportBtn: "Export",
    exporting: "Processing...",
    exportSuccess: "Export Completed!",
    newVersionNotice: "✨ A new version is available",
    updateBtn: "Update Now",
    helpTitle: "Quick User Guide",
    helpClose: "Close",
    helpItems: [
      {
        title: "🥁 A-B Repeat with 2-Second Interval",
        desc: "Set 'A' and 'B' to loop difficult phrases. A 2-second pause is automatically inserted between loops so you can reposition your sticks or hands."
      },
      {
        title: "🔍 32x Zoom Waveform & Snap Seek",
        desc: "Zoom in up to 32x using '+' to clearly see drum transients. Dragging roughly towards the left will magnetically snap to Point A or 0:00."
      },
      {
        title: "🎯 Fine Pitch Tuning (Semitones & Cents)",
        desc: "Adjust key by semitones and fine-tune by 1 cent (1/100 semitone). Includes an 'A=442Hz' preset for standard concert pitch."
      },
      {
        title: "💾 WAV & MP3 Export",
        desc: "Save your customized practice tracks. Choose ultra-fast lossless WAV or compact 192kbps MP3 for mobile storage."
      },
      {
        title: "🔒 100% Privacy & Full Offline Support",
        desc: "Your audio files are processed entirely locally and never uploaded to any server. Works completely offline in underground practice studios without installation."
      }
    ]
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

export const checkCompatibility = (): boolean => {
  if (typeof window === 'undefined') return true;
  const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window;
  const hasWorklet = 'AudioWorkletNode' in window;
  const hasWasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  return hasAudioContext && hasWorklet && hasWasm;
};
