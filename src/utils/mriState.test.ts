import test from 'node:test';
import assert from 'node:assert/strict';
import { MRI_PARTS, MRI_PART_MAP, MriPartId } from '../data/mriAnatomy';
import {
  clampExplode,
  clampZoomDistance,
  computeAssemblyStats,
  computeFocusCamera,
  computePartOffset,
  computePartWorldPoint,
  filterMriParts,
  getAdjacentPartId,
  MIN_MACRO_DISTANCE,
  MIN_STANDARD_DISTANCE,
  resolvePartVisualPolicy,
  TABLE_TRAVEL_Z_DISTANCE,
} from './mriState';

test('MRI anatomy catalog defines all 12 distinct components with valid micro-details', () => {
  assert.equal(MRI_PARTS.length, 12);
  const ids = new Set(MRI_PARTS.map((p) => p.id));
  assert.equal(ids.size, 12);

  for (const part of MRI_PARTS) {
    assert.ok(part.name.length > 0);
    assert.ok(part.microDetail.name.length > 0);
    assert.ok(part.specs.length >= 3);
    assert.ok(part.microDetail.specs.length >= 3);
  }
});

test('computePartOffset returns zero offset when fully assembled and table at home', () => {
  const magnet = MRI_PART_MAP['superconducting-magnet'];
  const offset = computePartOffset(magnet, {
    explode: 0,
    tableTravel: 0,
    detachedIds: new Set<MriPartId>(),
  });
  assert.deepEqual(offset, [0, 0, 0]);
});

test('computePartOffset combines explode factor and individual detach offset', () => {
  const cryo = MRI_PART_MAP['cryo-turret'];
  const detached = new Set<MriPartId>(['cryo-turret']);

  const halfExplode = computePartOffset(cryo, {
    explode: 0.5,
    tableTravel: 0,
    detachedIds: new Set<MriPartId>(),
  });
  assert.equal(halfExplode[1], cryo.explodeOffset[1] * 0.5);

  const detachedAndFull = computePartOffset(cryo, {
    explode: 1,
    tableTravel: 0,
    detachedIds: detached,
  });
  assert.equal(detachedAndFull[1], cryo.explodeOffset[1] + cryo.detachOffset[1]);
});

test('patient table and head coil slide into bore when tableTravel is active and assembled', () => {
  const table = MRI_PART_MAP['patient-table'];
  const headCoil = MRI_PART_MAP['head-coil'];
  const state = {
    explode: 0,
    tableTravel: 1,
    detachedIds: new Set<MriPartId>(),
  };

  assert.equal(computePartOffset(table, state)[2], TABLE_TRAVEL_Z_DISTANCE);
  assert.equal(computePartOffset(headCoil, state)[2], TABLE_TRAVEL_Z_DISTANCE);

  // When heavily exploded, table travel blends out so parts don't collide
  const explodedState = {
    explode: 0.8,
    tableTravel: 1,
    detachedIds: new Set<MriPartId>(),
  };
  assert.equal(computePartOffset(table, explodedState)[2], table.explodeOffset[2] * 0.8);
});

test('computeFocusCamera focuses tighter in micro mode than standard part mode', () => {
  const rf = MRI_PART_MAP['rf-body-coil'];
  const state = {
    explode: 0.4,
    tableTravel: 0,
    detachedIds: new Set<MriPartId>(),
  };

  const standardCam = computeFocusCamera(rf, state, false);
  const microCam = computeFocusCamera(rf, state, true);

  const dist = (a: [number, number, number], b: [number, number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  const stdDist = dist(standardCam.position, standardCam.target);
  const microDist = dist(microCam.position, microCam.target);

  assert.ok(microDist < stdDist, `Expected micro distance (${microDist}) < standard (${stdDist})`);
  assert.deepEqual(microCam.target, computePartWorldPoint(rf, state, true));
});

test('resolvePartVisualPolicy enforces isolation, cutaway, xray, and hidden states', () => {
  const rear = MRI_PART_MAP['rear-housing'];
  const magnet = MRI_PART_MAP['superconducting-magnet'];
  const front = MRI_PART_MAP['front-shroud'];

  // Cutaway hides rear housing and fades front shroud while keeping magnet opaque
  assert.deepEqual(
    resolvePartVisualPolicy(rear, {
      hiddenIds: new Set(),
      isolatedId: null,
      viewMode: 'cutaway',
    }),
    { visible: false, opacity: 0, interactive: false }
  );
  assert.equal(
    resolvePartVisualPolicy(front, {
      hiddenIds: new Set(),
      isolatedId: null,
      viewMode: 'cutaway',
    }).opacity,
    0.18
  );
  assert.equal(
    resolvePartVisualPolicy(magnet, {
      hiddenIds: new Set(),
      isolatedId: null,
      viewMode: 'cutaway',
    }).opacity,
    1
  );

  // Isolation dims non-selected parts and makes them non-interactive
  const ghostPolicy = resolvePartVisualPolicy(front, {
    hiddenIds: new Set(),
    isolatedId: 'superconducting-magnet',
    viewMode: 'solid',
  });
  assert.equal(ghostPolicy.interactive, false);
  assert.ok(ghostPolicy.opacity < 0.1);

  const activePolicy = resolvePartVisualPolicy(magnet, {
    hiddenIds: new Set(),
    isolatedId: 'superconducting-magnet',
    viewMode: 'solid',
  });
  assert.equal(activePolicy.opacity, 1);
  assert.equal(activePolicy.interactive, true);
});

test('computeAssemblyStats tracks detached and hidden parts accurately', () => {
  const full = computeAssemblyStats(new Set(), new Set());
  assert.equal(full.installedCount, 12);
  assert.equal(full.assembledPercent, 100);

  const partial = computeAssemblyStats(
    new Set<MriPartId>(['front-shroud', 'head-coil']),
    new Set<MriPartId>(['rear-housing', 'front-shroud']) // front-shroud overlaps both sets
  );
  assert.equal(partial.detachedCount, 2);
  assert.equal(partial.hiddenCount, 2);
  assert.equal(partial.installedCount, 9);
  assert.equal(partial.assembledPercent, 75);
});

test('filterMriParts filters by layer and searches Indonesian and English terms', () => {
  const magnetParts = filterMriParts(MRI_PARTS, 'magnet');
  assert.equal(magnetParts.length, 3);

  const lnaSearch = filterMriParts(MRI_PARTS, 'all', 'LNA');
  assert.equal(lnaSearch.length, 1);
  assert.equal(lnaSearch[0].id, 'head-coil');

  const boreSearch = filterMriParts(MRI_PARTS, 'rf', '70 cm');
  assert.equal(boreSearch.length, 1);
  assert.equal(boreSearch[0].id, 'bore-liner');
});

test('clamp helpers and adjacent part navigation behave safely at bounds', () => {
  assert.equal(clampExplode(-0.4), 0);
  assert.equal(clampExplode(1.7), 1);
  assert.equal(clampZoomDistance(0.05, true), MIN_MACRO_DISTANCE);
  assert.equal(clampZoomDistance(0.05, false), MIN_STANDARD_DISTANCE);

  assert.equal(getAdjacentPartId(null, 'next'), 'front-shroud');
  assert.equal(getAdjacentPartId('front-shroud', 'prev'), 'head-coil');
  assert.equal(getAdjacentPartId('head-coil', 'next'), 'front-shroud');
});
