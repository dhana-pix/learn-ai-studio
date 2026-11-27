import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  PackageOpen,
  PackagePlus,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MRI_LAYER_MAP, MriPartMeta } from '../data/mriAnatomy';

interface PartInspectorProps {
  part: MriPartMeta;
  microZoomActive: boolean;
  isDetached: boolean;
  isIsolated: boolean;
  isHidden: boolean;
  onClose: () => void;
  onPrevPart: () => void;
  onNextPart: () => void;
  onToggleMicroZoom: () => void;
  onFocusMacro: () => void;
  onToggleDetach: () => void;
  onToggleIsolate: () => void;
  onToggleHide: () => void;
}

export const PartInspector: React.FC<PartInspectorProps> = ({
  part,
  microZoomActive,
  isDetached,
  isIsolated,
  isHidden,
  onClose,
  onPrevPart,
  onNextPart,
  onToggleMicroZoom,
  onFocusMacro,
  onToggleDetach,
  onToggleIsolate,
  onToggleHide,
}) => {
  const layer = MRI_LAYER_MAP[part.layerId];
  const activeSpecs = microZoomActive ? part.microDetail.specs : part.specs;

  return (
    <section
      aria-label={`Detail komponen ${part.name}`}
      className="fixed z-30 top-16 sm:top-20 right-3 left-3 sm:left-auto sm:w-[360px] max-h-[calc(100vh-11.5rem)] flex flex-col rounded-2xl bg-white/97 border border-slate-200/95 shadow-xl overflow-hidden"
    >
      {/* Top Part Navigation Bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/80 bg-slate-50/90">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 min-w-0">
          <span className="font-mono font-bold text-slate-900 tabular-nums">{part.code}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{layer.shortName}</span>
          <span aria-hidden="true">·</span>
          <span className={isDetached ? 'text-amber-700 font-semibold' : 'text-emerald-700'}>
            {isDetached ? 'Dilepas' : 'Terpasang'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPrevPart}
            aria-label="Komponen sebelumnya"
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200/80 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onNextPart}
            aria-label="Komponen berikutnya"
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200/80 transition-colors"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail komponen"
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/80 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-4 overflow-y-auto mri-scroll space-y-4">
        {/* Heading */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-950 leading-snug">
            {microZoomActive ? part.microDetail.name : part.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {microZoomActive ? part.microDetail.subtitle : part.englishName}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed mt-2.5">
            {microZoomActive ? part.microDetail.description : part.functionDetail}
          </p>
        </div>

        {/* Primary Focal CTA: Zoom into Micro-Detail */}
        <div className="pt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={onToggleMicroZoom}
            className={`w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              microZoomActive
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-blue-700 text-white hover:bg-blue-800'
            }`}
          >
            {microZoomActive ? (
              <>
                <ZoomOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Kembali ke Tampilan Komponen</span>
              </>
            ) : (
              <>
                <ZoomIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Zoom Detail Terkecil</span>
              </>
            )}
          </button>

          {!microZoomActive && (
            <p className="text-xs text-slate-600 leading-snug">
              Sub-komponen mikro: <span className="font-semibold text-slate-800">{part.microDetail.name}</span>
            </p>
          )}
        </div>

        {/* Mechanical Disassembly Controls */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/80">
          <button
            type="button"
            onClick={onToggleDetach}
            className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold border transition-colors whitespace-nowrap ${
              isDetached
                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
          >
            {isDetached ? (
              <>
                <PackagePlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Pasang</span>
              </>
            ) : (
              <>
                <PackageOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Lepas</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleIsolate}
            aria-pressed={isIsolated}
            className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold border transition-colors whitespace-nowrap ${
              isIsolated
                ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
          >
            {isIsolated ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Batal</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Isolasi</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={isHidden ? onToggleHide : onFocusMacro}
            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            {isHidden ? (
              <>
                <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Tampil</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Fokus</span>
              </>
            )}
          </button>
        </div>

        {/* Technical Specifications (Tabular Monospace Values) */}
        <div className="pt-2 border-t border-slate-200/80">
          <h3 className="text-xs font-semibold text-slate-500 mb-2">
            Spesifikasi Teknis
          </h3>
          <dl className="divide-y divide-slate-100">
            {activeSpecs.map((spec) => (
              <div
                key={spec.label}
                className="py-1.5 flex items-baseline justify-between gap-3 text-xs"
              >
                <dt className="text-slate-600 shrink-0">{spec.label}</dt>
                <dd className="font-mono font-medium text-slate-900 tabular-nums text-right">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Hide Shell Shortcut for Outer Layers */}
        {!isHidden && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onToggleHide}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 py-1"
            >
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sembunyikan bagian ini untuk melihat lapisan dalam</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
