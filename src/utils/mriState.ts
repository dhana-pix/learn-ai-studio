import {
  MRI_PARTS,
  MriLayerId,
  MriPartId,
  MriPartMeta,
  Vec3Tuple,
  ViewMode,
} from '../data/mriAnatomy';

export interface DisassemblyState {
  explode: number; // 0..1
  tableTravel: number; // 0 (out) .. 1 (inside bore)
  detachedIds: ReadonlySet<MriPartId>;
  hiddenIds: ReadonlySet<MriPartId>;
  isolatedId: MriPartId | null;
  viewMode: ViewMode;
}

export interface PartVisualPolicy {
  visible: boolean;
  opacity: number;
  interactive: boolean;
}

export const TABLE_TRAVEL_Z_DISTANCE = -1.08;
export const MIN_MACRO_DISTANCE = 0.18;
export const MIN_STANDARD_DISTANCE = 0.55;
export const MAX_CAMERA_DISTANCE = 14.5;

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampExplode(value: number): number {
  return clampNumber(value, 0, 1);
}

export function clampZoomDistance(distance: number, isMicroMode: boolean): number {
  const minD = isMicroMode ? MIN_MACRO_DISTANCE : MIN_STANDARD_DISTANCE;
  return clampNumber(distance, minD, MAX_CAMERA_DISTANCE);
}

/**
 * Computes the target local group translation offset [dx, dy, dz] for a part
 * relative to its assembled origin (0, 0, 0).
 */
export function computePartOffset(
  part: MriPartMeta,
  state: Pick<DisassemblyState, 'explode' | 'tableTravel' | 'detachedIds'>
): Vec3Tuple {
  const e = clampExplode(state.explode);
  const isDetached = state.detachedIds.has(part.id);
  const detachScale = isDetached ? 1 : 0;

  let dx = part.explodeOffset[0] * e + part.detachOffset[0] * detachScale;
  let dy = part.explodeOffset[1] * e + part.detachOffset[1] * detachScale;
  let dz = part.explodeOffset[2] * e + part.detachOffset[2] * detachScale;

  // Table travel slides the patient table & head coil smoothly into the bore when assembled
  if (part.movesWithTable && e < 0.35 && !isDetached) {
    const travelBlend = 1 - e / 0.35;
    dz += TABLE_TRAVEL_Z_DISTANCE * clampNumber(state.tableTravel, 0, 1) * travelBlend;
  }

  return [dx, dy, dz];
}

/**
 * Computes the live world position of a part's anchor (macro center or micro detail anchor).
 */
export function computePartWorldPoint(
  part: MriPartMeta,
  state: Pick<DisassemblyState, 'explode' | 'tableTravel' | 'detachedIds'>,
  useMicroAnchor = false
): Vec3Tuple {
  const offset = computePartOffset(part, state);
  const anchor = useMicroAnchor ? part.microDetail.localAnchor : part.baseAnchor;
  return [anchor[0] + offset[0], anchor[1] + offset[1], anchor[2] + offset[2]];
}

/**
 * Computes camera position and lookAt target when focusing on a part or its micro detail.
 */
export function computeFocusCamera(
  part: MriPartMeta,
  state: Pick<DisassemblyState, 'explode' | 'tableTravel' | 'detachedIds'>,
  microMode: boolean
): { target: Vec3Tuple; position: Vec3Tuple } {
  const target = computePartWorldPoint(part, state, microMode);
  const camOffset = microMode ? part.microDetail.cameraOffset : part.focusCameraOffset;
  return {
    target,
    position: [
      target[0] + camOffset[0],
      Math.max(0.28, target[1] + camOffset[1]),
      target[2] + camOffset[2],
    ],
  };
}

/**
 * Resolves visibility, opacity, and raycast interactivity for each part given
 * isolation, hidden list, and solid/cutaway/xray view mode.
 */
export function resolvePartVisualPolicy(
  part: MriPartMeta,
  state: Pick<DisassemblyState, 'hiddenIds' | 'isolatedId' | 'viewMode'>
): PartVisualPolicy {
  if (state.hiddenIds.has(part.id)) {
    return { visible: false, opacity: 0, interactive: false };
  }

  if (state.isolatedId !== null) {
    if (state.isolatedId === part.id) {
      return { visible: true, opacity: 1, interactive: true };
    }
    return { visible: true, opacity: 0.06, interactive: false };
  }

  if (state.viewMode === 'xray') {
    if (part.layerId === 'exterior') {
      return { visible: true, opacity: 0.16, interactive: true };
    }
    if (part.layerId === 'cryogenic') {
      return { visible: true, opacity: 0.34, interactive: true };
    }
    return { visible: true, opacity: 0.96, interactive: true };
  }

  if (state.viewMode === 'cutaway') {
    if (part.cutawayBehavior === 'hide') {
      return { visible: false, opacity: 0, interactive: false };
    }
    if (part.cutawayBehavior === 'fade') {
      return { visible: true, opacity: 0.18, interactive: true };
    }
  }

  return { visible: true, opacity: 1, interactive: true };
}

/**
 * Calculates how many MRI components are currently installed (not detached/hidden)
 * and overall assembly percentage.
 */
export function computeAssemblyStats(
  detachedIds: ReadonlySet<MriPartId>,
  hiddenIds: ReadonlySet<MriPartId>,
  totalParts = MRI_PARTS.length
): { installedCount: number; detachedCount: number; hiddenCount: number; assembledPercent: number } {
  let detachedCount = 0;
  let hiddenCount = 0;
  const affected = new Set<MriPartId>();

  for (const id of detachedIds) {
    detachedCount += 1;
    affected.add(id);
  }
  for (const id of hiddenIds) {
    hiddenCount += 1;
    affected.add(id);
  }

  const installedCount = Math.max(0, totalParts - affected.size);
  const assembledPercent = totalParts > 0 ? Math.round((installedCount / totalParts) * 100) : 100;

  return {
    installedCount,
    detachedCount,
    hiddenCount,
    assembledPercent,
  };
}

/**
 * Filters MRI parts by layer and optional Indonesian/English search query.
 */
export function filterMriParts(
  parts: readonly MriPartMeta[],
  layerFilter: MriLayerId | 'all',
  query = ''
): MriPartMeta[] {
  const normalized = query.trim().toLowerCase();
  return parts.filter((part) => {
    if (layerFilter !== 'all' && part.layerId !== layerFilter) {
      return false;
    }
    if (!normalized) return true;
    return (
      part.name.toLowerCase().includes(normalized) ||
      part.englishName.toLowerCase().includes(normalized) ||
      part.summary.toLowerCase().includes(normalized) ||
      part.microDetail.name.toLowerCase().includes(normalized) ||
      part.code.includes(normalized)
    );
  });
}

/**
 * Steps to the previous or next part in anatomical disassembly order.
 */
export function getAdjacentPartId(
  currentId: MriPartId | null,
  direction: 'prev' | 'next',
  parts: readonly MriPartMeta[] = MRI_PARTS
): MriPartId {
  if (parts.length === 0) {
    throw new Error('Parts catalog cannot be empty');
  }
  if (!currentId) {
    return direction === 'next' ? parts[0].id : parts[parts.length - 1].id;
  }
  const idx = parts.findIndex((p) => p.id === currentId);
  if (idx === -1) return parts[0].id;
  const nextIdx = (idx + (direction === 'next' ? 1 : -1) + parts.length) % parts.length;
  return parts[nextIdx].id;
}
