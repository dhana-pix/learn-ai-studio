import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Focus,
  PackageOpen,
  PackagePlus,
  Search,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  MRI_LAYERS,
  MRI_LAYER_MAP,
  MRI_PARTS,
  MriLayerId,
  MriPartId,
} from '../data/mriAnatomy';
import { filterMriParts } from '../utils/mriState';

interface AnatomyDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedPartId: MriPartId | null;
  detachedIds: ReadonlySet<MriPartId>;
  hiddenIds: ReadonlySet<MriPartId>;
  onSelectPart: (partId: MriPartId, microMode: boolean) => void;
  onToggleDetach: (partId: MriPartId) => void;
  onToggleHide: (partId: MriPartId) => void;
  onExplodePreset: (value: number) => void;
  onReassembleAll: () => void;
}

export const AnatomyDrawer: React.FC<AnatomyDrawerProps> = ({
  open,
  onClose,
  selectedPartId,
  detachedIds,
  hiddenIds,
  onSelectPart,
  onToggleDetach,
  onToggleHide,
  onExplodePreset,
  onReassembleAll,
}) => {
  const [layerFilter, setLayerFilter] = useState<MriLayerId | 'all'>('all');
  const [query, setQuery] = useState('');

  const filteredParts = useMemo(
    () => filterMriParts(MRI_PARTS, layerFilter, query),
    [layerFilter, query]
  );

  if (!open) return null;

  return (
    <aside
      aria-label="Navigasi Anatomi Mesin MRI"
      className="fixed z-40 top-16 sm:top-20 bottom-24 sm:bottom-28 left-3 right-3 sm:right-auto sm:w-[380px] flex flex-col rounded-2xl bg-white/97 border border-slate-200/95 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-base font-bold text-slate-900">Navigasi Anatomi MRI</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            4 lapisan struktur · 12 komponen utama &amp; detail mikro
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup navigasi anatomi"
          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Quick Disassembly Sequence Strip */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
        <button
          type="button"
          onClick={onReassembleAll}
          className="flex-1 min-h-[38px] rounded-lg bg-white border border-slate-200 px-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          Rakit Utuh
        </button>
        <button
          type="button"
          onClick={() => onExplodePreset(0.5)}
          className="flex-1 min-h-[38px] rounded-lg bg-white border border-slate-200 px-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          Bongkar 50%
        </button>
        <button
          type="button"
          onClick={() => onExplodePreset(1)}
          className="flex-1 min-h-[38px] rounded-lg bg-blue-700 px-2.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
        >
          Bongkar Total
        </button>
      </div>

      {/* Search & Layer Filter Tabs */}
      <div className="px-4 pt-3 pb-2 space-y-2.5 border-b border-slate-200/80">
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="anatomy-search" className="sr-only">
            Cari komponen MRI
          </label>
          <input
            id="anatomy-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari komponen, misal magnet, RF, LNA..."
            className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-slate-100 border border-slate-200/80 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter lapisan anatomi"
          className="flex items-center gap-1 overflow-x-auto pb-0.5 mri-scroll"
        >
          <button
            type="button"
            role="tab"
            aria-selected={layerFilter === 'all'}
            onClick={() => setLayerFilter('all')}
            className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              layerFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua (12)
          </button>
          {MRI_LAYERS.map((layer) => {
            const active = layerFilter === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLayerFilter(layer.id)}
                className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {layer.order}. {layer.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Component Hierarchy List */}
      <div className="flex-1 overflow-y-auto mri-scroll divide-y divide-slate-200/75">
        {filteredParts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">Komponen tidak ditemukan</p>
            <p className="text-xs text-slate-500 mt-1">
              Coba kata kunci lain atau pilih tab Semua lapisan.
            </p>
          </div>
        ) : (
          filteredParts.map((part) => {
            const layer = MRI_LAYER_MAP[part.layerId];
            const isSelected = selectedPartId === part.id;
            const isDetached = detachedIds.has(part.id);
            const isHidden = hiddenIds.has(part.id);

            const statusText = isHidden
              ? 'Tersembunyi'
              : isDetached
                ? 'Dilepas'
                : 'Terpasang';

            return (
              <div
                key={part.id}
                className={`px-4 py-3 transition-colors ${
                  isSelected ? 'bg-blue-50/90' : 'hover:bg-slate-50/90'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPart(part.id, false)}
                    className="text-left flex-1 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        {part.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{layer.shortName}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          isHidden
                            ? 'text-slate-400'
                            : isDetached
                              ? 'text-amber-700 font-semibold'
                              : 'text-emerald-700'
                        }
                      >
                        {statusText}
                      </span>
                    </div>
                    <h3
                      className={`text-sm font-bold mt-0.5 leading-snug ${
                        isSelected ? 'text-blue-800' : 'text-slate-900'
                      }`}
                    >
                      {part.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                      Detail mikro: {part.microDetail.name}
                    </p>
                  </button>
                </div>

                {/* Tactile Per-Component Controls */}
                <div className="mt-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectPart(part.id, false)}
                    aria-label={`Fokus ke ${part.name}`}
                    className="min-h-[36px] inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                  >
                    <Focus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Fokus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectPart(part.id, true)}
                    aria-label={`Zoom detail terkecil pada ${part.name}`}
                    className="min-h-[36px] inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap"
                  >
                    <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Zoom Mikro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleDetach(part.id)}
                    aria-label={
                      isDetached ? `Pasang kembali ${part.name}` : `Lepas komponen ${part.name}`
                    }
                    className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap ${
                      isDetached
                        ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isDetached ? (
                      <>
                        <PackagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Pasang</span>
                      </>
                    ) : (
                      <>
                        <PackageOpen className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Lepas</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleHide(part.id)}
                    aria-label={isHidden ? `Tampilkan ${part.name}` : `Sembunyikan ${part.name}`}
                    className="min-h-[36px] min-w-[36px] ml-auto inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    {isHidden ? (
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
