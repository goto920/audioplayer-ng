import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface WaveformProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  loopA: number;
  loopB: number;
  isLoopEnabled: boolean;
  onSeek: (time: number) => void;
}

export const Waveform: React.FC<WaveformProps> = ({
  audioBuffer,
  currentTime,
  duration,
  loopA,
  loopB,
  isLoopEnabled,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  // ズーム倍率: 1x, 2x, 4x, 8x, 16x, 32x
  const [zoom, setZoom] = useState<number>(1);

  // 基準幅
  const baseWidth = 500;
  const currentWidth = baseWidth * zoom;
  // ズームに応じたバーの本数 (32倍でも超高解像度)
  const numberOfBars = 150 * zoom;

  // ピークデータの事前計算
  const peaks = useMemo(() => {
    if (!audioBuffer) return [];

    const rawData = audioBuffer.getChannelData(0);
    const totalSamples = rawData.length;
    const blockSize = Math.floor(totalSamples / numberOfBars);
    const calculatedPeaks: number[] = [];

    for (let i = 0; i < numberOfBars; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j += 4) {
        const val = Math.abs(rawData[start + j] || 0);
        if (val > max) max = val;
      }
      calculatedPeaks.push(Math.pow(max, 0.8));
    }

    return calculatedPeaks;
  }, [audioBuffer, numberOfBars]);

  // Canvas の描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0 || duration === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / peaks.length;
    const playProgress = currentTime / duration;
    const loopAProgress = loopA / duration;
    const loopBProgress = loopB / duration;

    // 1. A-B ループ区間の背景ハイライト
    if (isLoopEnabled && loopB > loopA) {
      const aX = loopAProgress * width;
      const bX = loopBProgress * width;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.fillRect(aX, 0, bX - aX, height);

      // A点・B点の縦ライン
      ctx.fillStyle = 'rgba(129, 140, 248, 0.85)';
      ctx.fillRect(aX, 0, 2, height);
      ctx.fillRect(bX - 2, 0, 2, height);
    }

    // 2. 波形バーの描画
    for (let i = 0; i < peaks.length; i++) {
      const barHeight = Math.max(3, peaks[i] * (height * 0.85));
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      const progress = i / peaks.length;

      if (progress <= playProgress) {
        ctx.fillStyle = '#818cf8'; // 再生済み: indigo-400
      } else {
        ctx.fillStyle = '#475569'; // 未再生: slate-600
      }

      const radius = 1.2;
      const w = Math.max(1, barWidth - 1);
      ctx.beginPath();
      ctx.roundRect(x, y, w, barHeight, radius);
      ctx.fill();
    }

    // 3. 再生ヘッド
    const cursorX = playProgress * width;
    ctx.fillStyle = '#f43f5e'; // rose-500
    ctx.fillRect(cursorX - 1.5, 0, 3, height);
  }, [peaks, currentTime, duration, loopA, loopB, isLoopEnabled]);

  // 再生ヘッドへの自動スクロール追従
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || zoom === 1 || duration === 0 || isDraggingRef.current) return;

    const playProgress = currentTime / duration;
    const cursorX = playProgress * container.scrollWidth;
    const containerWidth = container.clientWidth;

    container.scrollLeft = cursorX - containerWidth / 2;
  }, [currentTime, duration, zoom]);

  // クリック / ドラッグによるシーク
  const handleSeekFromEvent = (clientX: number) => {
    const container = scrollContainerRef.current;
    if (!container || duration === 0) return;

    const rect = container.getBoundingClientRect();
    const clickX = clientX - rect.left + container.scrollLeft;
    const totalWidth = container.scrollWidth;
    const safeX = Math.max(0, Math.min(clickX, totalWidth));
    const targetTime = (safeX / totalWidth) * duration;
    onSeek(targetTime);
  };

  // ★ 32倍まで拡大可能に
  const zoomIn = () => setZoom((prev) => Math.min(prev * 2, 32));
  const zoomOut = () => setZoom((prev) => Math.max(prev / 2, 1));
  const zoomReset = () => setZoom(1);

  // Safari等のCanvas最大幅制限 (16,384px) を超えない安全スケーリング
  const canvasPixelWidth = Math.min(currentWidth * (zoom > 8 ? 1 : 1.5), 16000);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* ズームヘッダー */}
      <div className="flex justify-between items-center px-1 text-xs text-slate-400">
        <span className="font-semibold text-[11px] text-slate-300">
          Waveform {zoom > 1 && `(${zoom}x Zoom)`}
        </span>
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/60">
          <button
            onClick={zoomOut}
            disabled={zoom <= 1}
            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] w-7 text-center font-bold text-indigo-300">
            {zoom}x
          </span>
          <button
            onClick={zoomIn}
            disabled={zoom >= 32}
            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {zoom > 1 && (
            <button
              onClick={zoomReset}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 transition"
              title="リセット (1x)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* スクロールコンテナ */}
      <div
        ref={scrollContainerRef}
        className="relative w-full h-20 bg-slate-900/90 rounded-xl border border-slate-700/80 overflow-x-auto overflow-y-hidden cursor-pointer select-none"
        style={{ scrollBehavior: isDraggingRef.current ? 'auto' : 'smooth' }}
        onMouseDown={(e) => {
          isDraggingRef.current = true;
          handleSeekFromEvent(e.clientX);
        }}
        onMouseMove={(e) => {
          if (isDraggingRef.current) handleSeekFromEvent(e.clientX);
        }}
        onMouseUp={() => { isDraggingRef.current = false; }}
        onMouseLeave={() => { isDraggingRef.current = false; }}
        onTouchStart={(e) => {
          isDraggingRef.current = true;
          handleSeekFromEvent(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          if (isDraggingRef.current) handleSeekFromEvent(e.touches[0].clientX);
        }}
        onTouchEnd={() => { isDraggingRef.current = false; }}
      >
        <canvas
          ref={canvasRef}
          width={canvasPixelWidth}
          height={160}
          style={{ width: `${currentWidth}px`, height: '100%' }}
          className="block"
        />
      </div>
    </div>
  );
};
