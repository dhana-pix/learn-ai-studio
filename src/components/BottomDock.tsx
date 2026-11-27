import React from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Minus,
  Plus,
  Wrench,
} from 'lucide-react';
import { ViewMode } from '../data/mriAnatomy';

interface BottomDockProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  explode: number;
  onChangeExplode: (value: number) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  tableInside: boolean;
  onToggleTable: () => void;
  anatomyOpen: boolean;
  onToggleAnatomy: () => void;
  hasDisassembledChanges: boolean;
  onReassembleAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'solid', label: 'Utuh' },
  { id: 'cutaway', label: 'Potong' },
  { id: 'xray', label: 'X-Ray' },
];

export const BottomDock: React.FC<BottomDockProps> = ({
  collapsed,
  onToggleCollapsed,
  explode,
  onChangeExplode,
  viewMode,
  onChangeViewMode,
  tableInside,
  onToggleTable,
  anatomyOpen,
  onToggleAnatomy,
  hasDisassembledChanges,
  onReassembleAll,
  onZoomIn,
  onZoomOut,
}) => {
  const explodePct = Math.round(explode * 100);

  return (
    <div className="pointer-events-none fixed bottom-2.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(1020px,95vw)] flex flex-col items-center">
      {/* Collapsible Zen / Cinema Drawer Handle */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Tampilkan panel kontrol' : 'Sembunyikan panel kontrol'}
        className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-t-xl rounded-b-lg bg-white/95 border border-slate-200/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:text-slate-950 hover:bg-slate-50 transition-colors duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tampilkan Kontrol</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sembunyikan Kontrol</span>
          </>
        )}
      </button>

      {/* Unified Collapsible Bottom Control Dock */}
      <div
        className={`pointer-events-auto w-full rounded-2xl bg-white/95 border border-slate-200/90 shadow-lg transition-all duration-200 ease-out overflow-hidden ${
          collapsed
            ? 'max-h-0 opacity-0 pointer-events-none border-transparent shadow-none'
            : 'max-h-[260px] opacity-100'
        }`}
      >
        <div className="p-2.5 sm:px-4 sm:py-3 flex flex-col lg:flex-row lg:items-center gap-2 sm:gap-3">
          {/* Primary Action: Anatomy Navigator Drawer Toggle */}
          <div className="flex items-center justify-between lg:justify-start gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleAnatomy}
              aria-expanded={anatomyOpen}
              className={`min-h-[42px] sm:min-h-[44px] inline-flex items-center gap-2 rounded-xl px-3.5 sm:px-4 text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                anatomyOpen
                  ? 'bg-blue-700 text-white hover:bg-blue-800'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Anatomi</span>
            </button>

            {/* Segmented View Modes (Utuh / Potong / X-Ray) */}
            <div
              role="group"
              aria-label="Mode tampilan irisan"
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0"
            >
              {VIEW_MODES.map((m) => {
                const active = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeViewMode(m.id)}
                    aria-pressed={active}
                    className={`min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      active
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Continuous Touch Disassembly (Explode) Slider */}
          <div className="flex-1 min-w-0 flex items-center gap-2.5 px-1">
            <label
              htmlFor="mri-explode-slider"
              className="text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap shrink-0"
            >
              Bongkar
            </label>
            <input
              id="mri-explode-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={explodePct}
              onChange={(e) => onChangeExplode(Number(e.target.value) / 100)}
              aria-label="Persentase bongkar komponen MRI"
              aria-valuetext={`${explodePct} persen terbongkar`}
              className="mri-slider flex-1 min-w-[90px] h-10 sm:h-11"
            />
            <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 tabular-nums w-11 text-right shrink-0">
              {explodePct}%
            </span>
          </div>

          {/* Right Quick Mechanical & Touch Zoom Controls */}
          <div className="flex items-center justify-between lg:justify-end gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTable}
              aria-pressed={tableInside}
              className={`min-h-[42px] sm:min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-3 text-xs sm:text-sm font-semibold border transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                tableInside
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{tableInside ? 'Keluarkan Meja' : 'Masuk Bore'}</span>
            </button>

            {hasDisassembledChanges && (
              <button
                type="button"
                onClick={onReassembleAll}
                className="min-h-[42px] sm:min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-3 text-xs sm:text-sm font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Wrench className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Rakit Utuh</span>
              </button>
            )}

            <div className="inline-flex items-center gap-1 shrink-0" role="group" aria-label="Kontrol zoom sentuh">
              <button
                type="button"
                onClick={onZoomOut}
                aria-label="Perkecil tampilan"
                className="min-h-[42px] min-w-[42px] sm:min-h-[44px] sm:min-w-[44px] inline-flex items-center justify-center rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onZoomIn}
                aria-label="Perbesar tampilan hingga detail mikro"
                className="min-h-[42px] min-w-[42px] sm:min-h-[44px] sm:min-w-[44px] inline-flex items-center justify-center rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
