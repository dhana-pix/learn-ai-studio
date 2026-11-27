import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MRI_PARTS, MRI_PART_MAP, MriPartId, ViewMode } from './data/mriAnatomy';
import {
  clampExplode,
  computeAssemblyStats,
  getAdjacentPartId,
} from './utils/mriState';
import { MriViewport, MriViewportHandle } from './scene/MriViewport';
import { TopBar } from './components/TopBar';
import { BottomDock } from './components/BottomDock';
import { AnatomyDrawer } from './components/AnatomyDrawer';
import { PartInspector } from './components/PartInspector';

export default function App() {
  const viewportRef = useRef<MriViewportHandle | null>(null);

  const [explode, setExplode] = useState(0);
  const [tableInside, setTableInside] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('solid');
  const [selectedPartId, setSelectedPartId] = useState<MriPartId | null>(null);
  const [microZoomActive, setMicroZoomActive] = useState(false);
  const [isolatedPartId, setIsolatedPartId] = useState<MriPartId | null>(null);
  const [detachedIds, setDetachedIds] = useState<Set<MriPartId>>(() => new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<MriPartId>>(() => new Set());
  const [showPins, setShowPins] = useState(false);
  const [anatomyOpen, setAnatomyOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraDistance, setCameraDistance] = useState(5.0);

  const assemblyStats = useMemo(
    () => computeAssemblyStats(detachedIds, hiddenIds, MRI_PARTS.length),
    [detachedIds, hiddenIds]
  );

  const selectedPart = selectedPartId ? MRI_PART_MAP[selectedPartId] : null;

  const hasDisassembledChanges =
    explode > 0.01 ||
    detachedIds.size > 0 ||
    hiddenIds.size > 0 ||
    isolatedPartId !== null ||
    viewMode !== 'solid';

  const handleSelectPart = useCallback(
    (partId: MriPartId | null, activateMicro = false) => {
      setSelectedPartId(partId);
      setMicroZoomActive(partId !== null ? activateMicro : false);
      if (partId === null) {
        setIsolatedPartId(null);
        return;
      }
      // Make sure selected part is visible if previously hidden
      setHiddenIds((prev) => {
        if (!prev.has(partId)) return prev;
        const next = new Set(prev);
        next.delete(partId);
        return next;
      });
      // Schedule smooth camera glide after state sync
      window.setTimeout(() => {
        viewportRef.current?.focusPart(partId, activateMicro);
      }, 24);
    },
    []
  );

  const handleToggleDetach = useCallback(
    (partId: MriPartId) => {
      setDetachedIds((prev) => {
        const next = new Set(prev);
        if (next.has(partId)) {
          next.delete(partId);
        } else {
          next.add(partId);
        }
        return next;
      });
      if (selectedPartId === partId) {
        window.setTimeout(() => {
          viewportRef.current?.focusPart(partId, microZoomActive);
        }, 40);
      }
    },
    [selectedPartId, microZoomActive]
  );

  const handleToggleHide = useCallback(
    (partId: MriPartId) => {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        if (next.has(partId)) {
          next.delete(partId);
        } else {
          next.add(partId);
        }
        return next;
      });
      if (isolatedPartId === partId) {
        setIsolatedPartId(null);
      }
    },
    [isolatedPartId]
  );

  const handleToggleIsolate = useCallback(
    (partId: MriPartId) => {
      setIsolatedPartId((prev) => (prev === partId ? null : partId));
      window.setTimeout(() => {
        viewportRef.current?.focusPart(partId, microZoomActive);
      }, 24);
    },
    [microZoomActive]
  );

  const handleToggleMicroZoom = useCallback(() => {
    if (!selectedPartId) return;
    const nextMicro = !microZoomActive;
    setMicroZoomActive(nextMicro);
    // Automatically isolate inner parts when zooming into micro detail while assembled
    const part = MRI_PART_MAP[selectedPartId];
    if (nextMicro && explode < 0.25 && part.layerId !== 'exterior') {
      setIsolatedPartId(selectedPartId);
    }
    window.setTimeout(() => {
      viewportRef.current?.focusPart(selectedPartId, nextMicro);
    }, 24);
  }, [selectedPartId, microZoomActive, explode]);

  const handleReassembleAll = useCallback(() => {
    setExplode(0);
    setDetachedIds(new Set());
    setHiddenIds(new Set());
    setIsolatedPartId(null);
    setViewMode('solid');
    setMicroZoomActive(false);
    setTableInside(false);
  }, []);

  const handleResetView = useCallback(() => {
    handleReassembleAll();
    setSelectedPartId(null);
    viewportRef.current?.resetCamera();
  }, [handleReassembleAll]);

  const handleStepPart = useCallback(
    (dir: 'prev' | 'next') => {
      const nextId = getAdjacentPartId(selectedPartId, dir);
      handleSelectPart(nextId, false);
    },
    [selectedPartId, handleSelectPart]
  );

  // Keyboard shortcuts for desktop ergonomics
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        handleResetView();
      } else if (e.key === 'e' || e.key === 'E') {
        setExplode((prev) => (prev > 0.5 ? 0 : 1));
      } else if (e.key === 'Escape') {
        if (microZoomActive && selectedPartId) {
          setMicroZoomActive(false);
          viewportRef.current?.focusPart(selectedPartId, false);
        } else if (selectedPartId) {
          setSelectedPartId(null);
          setIsolatedPartId(null);
        } else if (anatomyOpen) {
          setAnatomyOpen(false);
        }
      } else if (e.key === '+' || e.key === '=') {
        viewportRef.current?.zoomBy(0.78);
      } else if (e.key === '-') {
        viewportRef.current?.zoomBy(1.28);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleResetView, microZoomActive, selectedPartId, anatomyOpen]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#e6eef8]">
      {/* Full-Viewport Interactive 3D MRI Scene */}
      <MriViewport
        ref={viewportRef}
        explode={explode}
        tableTravel={tableInside ? 1 : 0}
        viewMode={viewMode}
        selectedPartId={selectedPartId}
        microZoomActive={microZoomActive}
        isolatedPartId={isolatedPartId}
        detachedIds={detachedIds}
        hiddenIds={hiddenIds}
        showPins={showPins}
        onSelectPart={handleSelectPart}
        onCameraZoomChange={setCameraDistance}
      />

      {/* Minimal Top Clinical Title & Quick Utility Actions */}
      <TopBar
        installedCount={assemblyStats.installedCount}
        totalCount={MRI_PARTS.length}
        cameraDistanceMeters={cameraDistance}
        showPins={showPins}
        onTogglePins={() => setShowPins((prev) => !prev)}
        onResetView={handleResetView}
      />

      {/* Slide-Over Anatomy Navigator Drawer (On Demand — Keeps Initial Center Unobstructed) */}
      <AnatomyDrawer
        open={anatomyOpen}
        onClose={() => setAnatomyOpen(false)}
        selectedPartId={selectedPartId}
        detachedIds={detachedIds}
        hiddenIds={hiddenIds}
        onSelectPart={(id, micro) => {
          handleSelectPart(id, micro);
          if (window.innerWidth < 768) {
            setAnatomyOpen(false);
          }
        }}
        onToggleDetach={handleToggleDetach}
        onToggleHide={handleToggleHide}
        onExplodePreset={(val) => {
          const clamped = clampExplode(val);
          setExplode(clamped);
          setIsolatedPartId(null);
          viewportRef.current?.frameExplodedOverview(clamped);
        }}
        onReassembleAll={handleReassembleAll}
      />

      {/* Contextual Selected Part & Micro-Detail Inspector */}
      {selectedPart && (
        <PartInspector
          part={selectedPart}
          microZoomActive={microZoomActive}
          isDetached={detachedIds.has(selectedPart.id)}
          isIsolated={isolatedPartId === selectedPart.id}
          isHidden={hiddenIds.has(selectedPart.id)}
          onClose={() => {
            setSelectedPartId(null);
            setMicroZoomActive(false);
            setIsolatedPartId(null);
          }}
          onPrevPart={() => handleStepPart('prev')}
          onNextPart={() => handleStepPart('next')}
          onToggleMicroZoom={handleToggleMicroZoom}
          onFocusMacro={() => {
            setMicroZoomActive(false);
            viewportRef.current?.focusPart(selectedPart.id, false);
          }}
          onToggleDetach={() => handleToggleDetach(selectedPart.id)}
          onToggleIsolate={() => handleToggleIsolate(selectedPart.id)}
          onToggleHide={() => handleToggleHide(selectedPart.id)}
        />
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <BottomDock
        collapsed={dockCollapsed}
        onToggleCollapsed={() => setDockCollapsed((prev) => !prev)}
        explode={explode}
        onChangeExplode={(v) => setExplode(clampExplode(v))}
        viewMode={viewMode}
        onChangeViewMode={(mode) => {
          setViewMode(mode);
          if (mode !== 'solid') {
            setIsolatedPartId(null);
          }
        }}
        tableInside={tableInside}
        onToggleTable={() => {
          setExplode(0);
          setTableInside((prev) => !prev);
        }}
        anatomyOpen={anatomyOpen}
        onToggleAnatomy={() => setAnatomyOpen((prev) => !prev)}
        hasDisassembledChanges={hasDisassembledChanges}
        onReassembleAll={handleReassembleAll}
        onZoomIn={() => viewportRef.current?.zoomBy(0.75)}
        onZoomOut={() => viewportRef.current?.zoomBy(1.33)}
      />
    </main>
  );
}
