import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface WaveformProps {
  peaks: number[];
  currentTime: number;
  duration: number;
  loopA: number;
  loopB: number;
  isLoopEnabled: boolean;
  onSeek: (time: number) => void;
}

export const Waveform: React.FC<WaveformProps> = ({
  peaks,
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

  const [zoom, setZoom] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(500);

  const baseWidth = 500;
  const currentWidth = baseWidth * zoom;

  // コンテナの実際の画面幅を取得
  useEffect(() => {
    if (scrollContainerRef.current) {
      setContainerWidth(scrollContainerRef.current.clientWidth);
    }
    const handleResize = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 波形描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0 || duration === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / peaks.length;
    const loopAProgress = loopA / duration;
    const loopBProgress = loopB / duration;

    // 1. A-B ループ区間の背景ハイライト
    if (isLoopEnabled && loopB > loopA) {
      const aX = loopAProgress * width;
      const bX = loopBProgress * width;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.fillRect(aX, 0, bX - aX, height);

      ctx.fillStyle = 'rgba(129, 140, 248, 0.9)';
      ctx.fillRect(aX, 0, 2, height);
      ctx.fillRect(bX - 2, 0, 2, height);
    }

    // 2. 波形バーの描画
    const renderBarWidth = Math.max(1, Math.min(barWidth * 0.75, 4));

    for (let i = 0; i < peaks.length; i++) {
      const barHeight = Math.max(2, peaks[i] * (height * 0.88));
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      ctx.fillStyle = '#64748b'; // slate-500

      const radius = renderBarWidth > 2 ? 1 : 0.5;
      ctx.beginPath();
      ctx.roundRect(x, y, renderBarWidth, barHeight, radius);
      ctx.fill();
    }
  }, [peaks, duration, loopA, loopB, isLoopEnabled, zoom]);

  // ★ 画面内での赤線のピクセル位置を計算
  const [redLinePixelX, setRedLinePixelX] = useState<number>(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || duration === 0) return;

    const playProgress = currentTime / duration;
    const cursorX = playProgress * currentWidth;
    const maxScrollLeft = currentWidth - containerWidth;

    if (zoom === 1) {
      container.scrollLeft = 0;
      setRedLinePixelX(playProgress * containerWidth);
      return;
    }

    const halfContainer = containerWidth / 2;

    if (cursorX <= halfContainer) {
      // 【前半】波形は左端、赤線は左から中央へ
      container.scrollLeft = 0;
      setRedLinePixelX(cursorX);
    } else if (cursorX >= maxScrollLeft - halfContainer) {
      // 【後半】波形は右端、赤線は中央から右端へ
      container.scrollLeft = maxScrollLeft;
      const screenX = cursorX - maxScrollLeft;
      setRedLinePixelX(screenX);
    } else {
      // 【中盤】波形が動き、赤線は画面中央に完全固定
      if (!isDraggingRef.current) {
        container.scrollLeft = cursorX - halfContainer;
      }
      setRedLinePixelX(halfContainer);
    }
  }, [currentTime, duration, zoom, currentWidth, containerWidth]);

  const handleSeekFromEvent = useCallback((clientX: number) => {
    const container = scrollContainerRef.current;
    if (!container || duration === 0) return;

    const rect = container.getBoundingClientRect();
    const clickX = clientX - rect.left + container.scrollLeft;
    const totalWidth = container.scrollWidth;

    let targetTime = (clickX / totalWidth) * duration;

    if (isLoopEnabled) {
      if (targetTime <= loopA) targetTime = loopA;
      else if (targetTime >= loopB) targetTime = loopB;
    } else {
      if (targetTime <= 0) targetTime = 0;
      if (targetTime >= duration) targetTime = duration;
    }

    onSeek(targetTime);

    if (zoom > 1) {
      if (clientX < rect.left + 40) {
        container.scrollLeft -= 20;
      } else if (clientX > rect.right - 40) {
        container.scrollLeft += 20;
      }
    }
  }, [duration, isLoopEnabled, loopA, loopB, onSeek, zoom]);

  const handleStartDrag = (clientX: number) => {
    isDraggingRef.current = true;
    handleSeekFromEvent(clientX);

    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) handleSeekFromEvent(e.clientX);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev * 2, 32));
  const zoomOut = () => setZoom((prev) => Math.max(prev / 2, 1));
  const zoomReset = () => setZoom(1);

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

      {/* ★ 親要素を relative にし、スクロール領域と赤線を独立して重ねる */}
      <div className="relative w-full h-20 bg-slate-900/90 rounded-xl border border-slate-700/80 overflow-hidden select-none">
        
        {/* 1. スクロールする波形エリア */}
        <div
          ref={scrollContainerRef}
          className="w-full h-full overflow-x-auto overflow-y-hidden cursor-pointer"
          onMouseDown={(e) => handleStartDrag(e.clientX)}
          onTouchStart={(e) => {
            isDraggingRef.current = true;
            handleSeekFromEvent(e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (isDraggingRef.current) handleSeekFromEvent(e.touches[0].clientX);
          }}
          onTouchEnd={() => { isDraggingRef.current = false; }}
        >
          <div style={{ width: `${currentWidth}px`, height: '100%', position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={canvasPixelWidth}
              height={160}
              style={{ width: `${currentWidth}px`, height: '100%' }}
              className="block pointer-events-none"
            />
          </div>
        </div>

        {/* 2. 画面の上にフワッと重ねる「絶対配置の赤線」 (絶対に画面外へ飛び出さない) */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none shadow-md z-20"
          style={{
            left: `${redLinePixelX}px`,
            transform: 'translateX(-50%)',
          }}
        />
      </div>
    </div>
  );
};
