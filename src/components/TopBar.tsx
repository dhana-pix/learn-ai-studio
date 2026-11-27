import React from 'react';
import { RotateCcw, Tag } from 'lucide-react';

interface TopBarProps {
  installedCount: number;
  totalCount: number;
  cameraDistanceMeters: number;
  showPins: boolean;
  onTogglePins: () => void;
  onResetView: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  installedCount,
  totalCount,
  cameraDistanceMeters,
  showPins,
  onTogglePins,
  onResetView,
}) => {
  const formattedDistance =
    cameraDistanceMeters < 1
      ? `${Math.round(cameraDistanceMeters * 100)} cm`
      : `${cameraDistanceMeters.toFixed(1).replace('.', ',')} m`;

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 flex items-start justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
      {/* Minimal Top-Left Title & Unboxed Assembly Metadata */}
      <div className="pointer-events-auto bg-white/95 border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-sm max-w-[70vw] sm:max-w-none">
        <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
          MRI 3.0T Anatomy Studio
        </h1>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-600 font-medium whitespace-nowrap">
          <span className="font-mono tabular-nums text-slate-800">
            {installedCount}/{totalCount} terpasang
          </span>
          <span aria-hidden="true" className="text-slate-400">
            ·
          </span>
          <span className="font-mono tabular-nums">Jarak {formattedDistance}</span>
        </div>
      </div>

      {/* Top-Right Quiet Utility Actions */}
      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onTogglePins}
          aria-pressed={showPins}
          aria-label={showPins ? 'Sembunyikan label anatomi 3D' : 'Tampilkan label anatomi 3D'}
          className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-3.5 text-xs sm:text-sm font-semibold border transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            showPins
              ? 'bg-blue-700 text-white border-blue-700 hover:bg-blue-800'
              : 'bg-white/95 text-slate-800 border-slate-200/90 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <Tag className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Label 3D</span>
        </button>

        <button
          type="button"
          onClick={onResetView}
          aria-label="Reset posisi kamera dan perakitan"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-3.5 text-xs sm:text-sm font-semibold bg-white/95 text-slate-800 border border-slate-200/90 hover:bg-slate-50 shadow-sm transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
