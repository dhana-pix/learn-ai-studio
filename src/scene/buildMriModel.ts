import * as THREE from 'three';
import { MRI_PARTS, MriPartId } from '../data/mriAnatomy';
import {
  bindPartScopedMaterials,
  MriMaterialLibrary,
  PartMaterialRecord,
} from './materials';
import { MriTextureBundle } from './textures';

export interface BuiltPartEntry {
  id: MriPartId;
  group: THREE.Group;
  materials: PartMaterialRecord[];
  microBeacon: THREE.Mesh;
}

export interface BuiltMriRig {
  root: THREE.Group;
  parts: Record<MriPartId, BuiltPartEntry>;
  tableShadowMesh: THREE.Mesh;
  interactables: THREE.Object3D[];
  dispose: () => void;
}

const BORE_Y = 1.15;

/**
 * Helper to create a hollow cylindrical shell using ExtrudeGeometry or LatheGeometry
 * centered around the Z axis (default Lathe revolves around Y, so rotateX(PI/2)).
 */
function createHollowCylinderLathe(
  innerR: number,
  outerR: number,
  length: number,
  bevel = 0.012,
  radialSegments = 48
): THREE.BufferGeometry {
  const half = length / 2;
  const b = Math.min(bevel, (outerR - innerR) * 0.35, half * 0.25);
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(innerR, -half + b),
    new THREE.Vector2(innerR + b, -half),
    new THREE.Vector2(outerR - b, -half),
    new THREE.Vector2(outerR, -half + b),
    new THREE.Vector2(outerR, half - b),
    new THREE.Vector2(outerR - b, half),
    new THREE.Vector2(innerR + b, half),
    new THREE.Vector2(innerR, half - b),
    new THREE.Vector2(innerR, -half + b),
  ];
  const geo = new THREE.LatheGeometry(pts, radialSegments);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted medical MRI gantry shroud profile revolved around Z.
 * Generous outer radius (1.13m) and rounded barrel ensure 100% clean encapsulation
 * of internal cryostat vessels when assembled (zero poke-through).
 */
function createFrontShroudLathe(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.365, 0.0),
    new THREE.Vector2(0.365, 0.58),
    new THREE.Vector2(0.395, 0.68),
    new THREE.Vector2(0.49, 0.76),
    new THREE.Vector2(0.64, 0.80),
    new THREE.Vector2(0.88, 0.78),
    new THREE.Vector2(1.03, 0.69),
    new THREE.Vector2(1.11, 0.54),
    new THREE.Vector2(1.13, 0.32),
    new THREE.Vector2(1.13, 0.0),
    // Solid inner wall cavity
    new THREE.Vector2(1.05, 0.0),
    new THREE.Vector2(1.03, 0.48),
    new THREE.Vector2(0.92, 0.68),
    new THREE.Vector2(0.58, 0.72),
    new THREE.Vector2(0.42, 0.56),
    new THREE.Vector2(0.42, 0.0),
    new THREE.Vector2(0.365, 0.0),
  ];
  const geo = new THREE.LatheGeometry(pts, 56);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createRearShroudLathe(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.365, 0.0),
    new THREE.Vector2(0.365, -0.58),
    new THREE.Vector2(0.45, -0.71),
    new THREE.Vector2(0.64, -0.78),
    new THREE.Vector2(0.92, -0.76),
    new THREE.Vector2(1.07, -0.64),
    new THREE.Vector2(1.13, -0.44),
    new THREE.Vector2(1.13, 0.0),
    new THREE.Vector2(1.05, 0.0),
    new THREE.Vector2(1.03, -0.48),
    new THREE.Vector2(0.90, -0.68),
    new THREE.Vector2(0.56, -0.70),
    new THREE.Vector2(0.42, -0.56),
    new THREE.Vector2(0.42, 0.0),
    new THREE.Vector2(0.365, 0.0),
  ];
  const geo = new THREE.LatheGeometry(pts, 56);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Contoured pedestal skirt anchoring the cylindrical gantry flush to y = 0.
 */
function createGantryBaseSkirt(zLength: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.92, 0.04);
  shape.lineTo(0.92, 0.04);
  shape.quadraticCurveTo(0.88, 0.42, 0.96, 0.72);
  shape.lineTo(-0.96, 0.72);
  shape.quadraticCurveTo(-0.88, 0.42, -0.92, 0.04);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: zLength,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -zLength / 2);
  geo.computeVertexNormals();
  return geo;
}

export function buildMriRig(
  mats: MriMaterialLibrary,
  textures: MriTextureBundle,
  isSoftwareGl: boolean
): BuiltMriRig {
  const root = new THREE.Group();
  root.name = 'mri-studio-root';

  const geometries: THREE.BufferGeometry[] = [];
  const extraMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    extraMaterials.push(m);
    return m;
  };

  const castShadows = !isSoftwareGl;

  // =========================================================================
  // 0. CLINICAL SUITE ENVIRONMENT (Floor, Contact Shadows, Overhead Halo)
  // =========================================================================
  const envGroup = new THREE.Group();
  envGroup.name = 'clinical-suite-env';

  const floorGeo = trackGeo(new THREE.CircleGeometry(18, 64));
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.clinicalFloorMap,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  envGroup.add(floorMesh);

  // Subtle clinical center zone ring on floor (like reference radiology suite)
  const zoneRingGeo = trackGeo(new THREE.RingGeometry(1.92, 1.98, 64));
  zoneRingGeo.rotateX(-Math.PI / 2);
  const zoneRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  const zoneRing = new THREE.Mesh(zoneRingGeo, zoneRingMat);
  zoneRing.position.set(0, 0.008, 0.3);
  envGroup.add(zoneRing);

  // Soft radial contact shadow under gantry
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    })
  );
  const gantryShadowGeo = trackGeo(new THREE.PlaneGeometry(3.2, 2.7));
  gantryShadowGeo.rotateX(-Math.PI / 2);
  const gantryShadow = new THREE.Mesh(gantryShadowGeo, shadowMat);
  gantryShadow.position.set(0, 0.014, 0.0);
  envGroup.add(gantryShadow);

  // Soft radial contact shadow under patient table (updated dynamically)
  const tableShadowGeo = trackGeo(new THREE.PlaneGeometry(1.65, 2.8));
  tableShadowGeo.rotateX(-Math.PI / 2);
  const tableShadowMesh = new THREE.Mesh(tableShadowGeo, shadowMat);
  tableShadowMesh.position.set(0, 0.016, 1.72);
  envGroup.add(tableShadowMesh);

  // Overhead subtle cool-blue clinical ceiling light cove ring (from reference photo)
  const ceilingRingGeo = trackGeo(new THREE.TorusGeometry(2.35, 0.032, 12, 64));
  ceilingRingGeo.rotateX(Math.PI / 2);
  const ceilingRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.75,
    })
  );
  const ceilingRing = new THREE.Mesh(ceilingRingGeo, ceilingRingMat);
  ceilingRing.position.set(0, 3.65, 0.1);
  envGroup.add(ceilingRing);

  root.add(envGroup);

  // Helper to create part group and tag all descendant meshes for raycasting
  const parts = {} as Record<MriPartId, BuiltPartEntry>;
  const interactables: THREE.Object3D[] = [];
  const beaconGeo = trackGeo(new THREE.TorusGeometry(0.024, 0.0032, 10, 24));

  function registerPart(id: MriPartId, builder: (g: THREE.Group) => void) {
    const group = new THREE.Group();
    group.name = `mri-part-${id}`;
    builder(group);

    // Subtle thin micro-detail indicator ring (never occludes micro-geometry)
    const meta = MRI_PARTS.find((p) => p.id === id)!;
    const beaconMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x2563eb,
        transparent: true,
        opacity: 0.0,
        depthTest: true,
      })
    );
    const microBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    microBeacon.position.set(...meta.microDetail.localAnchor);
    microBeacon.renderOrder = 12;
    microBeacon.visible = false;
    group.add(microBeacon);

    // Scope materials to this part so opacity/highlight work independently
    const materials = bindPartScopedMaterials(group);

    group.traverse((child) => {
      if (child === microBeacon) return;
      if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
        child.userData.partId = id;
        if (castShadows) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        interactables.push(child);
      }
    });

    root.add(group);
    parts[id] = { id, group, materials, microBeacon };
  }

  // =========================================================================
  // 01. FRONT SHROUD & DUAL TOUCH CONSOLES
  // =========================================================================
  registerPart('front-shroud', (g) => {
    const frontShell = new THREE.Mesh(trackGeo(createFrontShroudLathe()), mats.glossWhiteShell);
    frontShell.position.set(0, BORE_Y, 0);
    g.add(frontShell);

    // Sculpted lower base pedestal skirt + charcoal floor plinth
    const skirt = new THREE.Mesh(trackGeo(createGantryBaseSkirt(0.62)), mats.glossWhiteShell);
    skirt.position.set(0, 0, 0.34);
    g.add(skirt);

    const plinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.88, 0.045, 0.66)),
      mats.darkCharcoalTrim
    );
    plinth.position.set(0, 0.0225, 0.34);
    g.add(plinth);

    // Recessed accent trim groove around bore face (matches Philips styling)
    const accentRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.95, 0.011, 12, 56)),
      mats.clinicalLightGray
    );
    accentRing.position.set(0, BORE_Y, 0.745);
    g.add(accentRing);

    // Signature deep royal-blue vertical brand strip on left & right curved cheeks
    const emblemGeo = trackGeo(new THREE.BoxGeometry(0.032, 0.38, 0.13));
    const emblemLeft = new THREE.Mesh(emblemGeo, mats.royalBlueEmblem);
    emblemLeft.position.set(-1.105, 1.08, 0.44);
    emblemLeft.rotation.y = 0.24;
    g.add(emblemLeft);

    const emblemRight = new THREE.Mesh(emblemGeo, mats.royalBlueEmblem);
    emblemRight.position.set(1.105, 1.08, 0.44);
    emblemRight.rotation.y = -0.24;
    g.add(emblemRight);

    // Twin Front Operator Touchscreen Consoles
    const bezelGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.25, 0.045));
    const screenGeo = trackGeo(new THREE.PlaneGeometry(0.27, 0.18));
    const btnGeo = trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.016, 14));
    btnGeo.rotateX(Math.PI / 2);

    const buildConsole = (side: -1 | 1) => {
      const panel = new THREE.Group();
      panel.position.set(side * 0.62, 1.54, 0.80);
      panel.rotation.y = side * 0.14;
      panel.rotation.x = -0.05;

      const bezel = new THREE.Mesh(bezelGeo, mats.glossWhiteShell);
      panel.add(bezel);

      const screen = new THREE.Mesh(
        screenGeo,
        side === -1 ? mats.touchscreenLeft : mats.touchscreenRight
      );
      screen.position.set(0, 0.016, 0.024);
      panel.add(screen);

      // Tactile E-Stop red button + positioning buttons underneath
      const estop = new THREE.Mesh(btnGeo, mats.laserRedAccent);
      estop.position.set(-0.095, -0.095, 0.024);
      panel.add(estop);

      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(btnGeo, mats.darkCharcoalTrim);
        b.position.set(-0.02 + i * 0.042, -0.095, 0.023);
        panel.add(b);
      }

      // Micro-detail: Laser crosshair emitter barrel on left console underside
      if (side === -1) {
        const laserBody = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.018, 0.022, 0.04, 16)),
          mats.darkSteelHardware
        );
        laserBody.rotation.x = Math.PI / 2;
        laserBody.position.set(0.11, -0.095, 0.024);
        panel.add(laserBody);

        const laserLens = new THREE.Mesh(
          trackGeo(new THREE.CircleGeometry(0.012, 16)),
          mats.laserRedAccent
        );
        laserLens.position.set(0.11, -0.095, 0.045);
        panel.add(laserLens);
      }

      g.add(panel);
    };
    buildConsole(-1);
    buildConsole(1);

    // Top Bore Laser Positioning Indicator Lens
    const topLaserPod = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.09, 0.04, 0.04)),
      mats.darkCharcoalTrim
    );
    topLaserPod.position.set(0, 1.72, 0.805);
    g.add(topLaserPod);

    const topLaserLed = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.036, 0.012, 0.01)),
      mats.laserRedAccent
    );
    topLaserLed.position.set(0, 1.72, 0.826);
    g.add(topLaserLed);

    // Pneumatic Acoustic Headphones hanging on front-left hook (from reference photo!)
    const hpGroup = new THREE.Group();
    hpGroup.position.set(-0.34, 1.68, 0.815);

    const hook = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 10)),
      mats.darkSteelHardware
    );
    hook.rotation.x = Math.PI / 2;
    hpGroup.add(hook);

    const headband = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.082, 0.011, 10, 24, Math.PI)),
      mats.darkCharcoalTrim
    );
    headband.position.set(0, -0.078, 0.015);
    hpGroup.add(headband);

    const earCupGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.038, 0.032, 18));
    earCupGeo.rotateZ(Math.PI / 2);
    const cupL = new THREE.Mesh(earCupGeo, mats.darkCharcoalTrim);
    cupL.position.set(-0.082, -0.095, 0.015);
    const cupR = new THREE.Mesh(earCupGeo, mats.darkCharcoalTrim);
    cupR.position.set(0.082, -0.095, 0.015);
    hpGroup.add(cupL, cupR);

    // Hanging acoustic tube looping gracefully downward
    const tubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.075, -0.13, 0.015),
      new THREE.Vector3(-0.09, -0.45, 0.04),
      new THREE.Vector3(-0.02, -0.68, 0.03),
      new THREE.Vector3(0.08, -0.46, 0.02),
      new THREE.Vector3(0.075, -0.13, 0.015),
    ]);
    const tubeMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(tubeCurve, 28, 0.007, 8, false)),
      mats.darkCharcoalTrim
    );
    hpGroup.add(tubeMesh);
    g.add(hpGroup);
  });

  // =========================================================================
  // 02. REAR ACOUSTIC HOUSING & SERVICE PANELS
  // =========================================================================
  registerPart('rear-housing', (g) => {
    const rearShell = new THREE.Mesh(trackGeo(createRearShroudLathe()), mats.glossWhiteShell);
    rearShell.position.set(0, BORE_Y, 0);
    g.add(rearShell);

    const rearSkirt = new THREE.Mesh(trackGeo(createGantryBaseSkirt(0.64)), mats.glossWhiteShell);
    rearSkirt.position.set(0, 0, -0.35);
    g.add(rearSkirt);

    const rearPlinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.88, 0.045, 0.68)),
      mats.darkCharcoalTrim
    );
    rearPlinth.position.set(0, 0.0225, -0.35);
    g.add(rearPlinth);

    // Rear ventilation louver grille
    const ventGroup = new THREE.Group();
    ventGroup.position.set(0, 0.62, -0.74);
    const ventFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.66, 0.24, 0.03)),
      mats.clinicalLightGray
    );
    ventGroup.add(ventFrame);
    const slatGeo = trackGeo(new THREE.BoxGeometry(0.58, 0.016, 0.036));
    for (let i = 0; i < 6; i++) {
      const slat = new THREE.Mesh(slatGeo, mats.darkCharcoalTrim);
      slat.position.set(0, -0.08 + i * 0.032, 0.006);
      slat.rotation.x = 0.25;
      ventGroup.add(slat);
    }
    g.add(ventGroup);

    // Micro-detail: Service Latch Assembly & Interior Acoustic Foam Ribs at [0.82, 1.25, -0.55]
    const latchGroup = new THREE.Group();
    latchGroup.position.set(0.82, 1.25, -0.55);
    latchGroup.rotation.y = Math.PI * 0.38;

    const plate = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.16, 0.22, 0.02)),
      mats.brushedStainless
    );
    latchGroup.add(plate);

    const camHandle = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.03, 0.095, 0.032)),
      mats.darkSteelHardware
    );
    camHandle.position.set(0, 0.01, 0.02);
    latchGroup.add(camHandle);

    // Acoustic foam wedge ribs on inner face
    const ribGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.026, 0.04));
    for (let i = 0; i < 5; i++) {
      const rib = new THREE.Mesh(ribGeo, mats.acousticFoam);
      rib.position.set(0, -0.075 + i * 0.038, -0.03);
      latchGroup.add(rib);
    }
    g.add(latchGroup);
  });

  // =========================================================================
  // 03. MOTORIZED PATIENT TABLE & BALL-SCREW ACTUATOR
  // =========================================================================
  registerPart('patient-table', (g) => {
    // Undercarriage mobile steel frame (sits on casters at y = 0)
    const railGeo = trackGeo(new THREE.BoxGeometry(0.065, 0.07, 1.72));
    const railL = new THREE.Mesh(railGeo, mats.clinicalLightGray);
    railL.position.set(-0.34, 0.14, 1.72);
    const railR = new THREE.Mesh(railGeo, mats.clinicalLightGray);
    railR.position.set(0.34, 0.14, 1.72);
    g.add(railL, railR);

    const crossBarGeo = trackGeo(new THREE.BoxGeometry(0.74, 0.065, 0.09));
    const frontCross = new THREE.Mesh(crossBarGeo, mats.clinicalLightGray);
    frontCross.position.set(0, 0.14, 2.52);
    const backCross = new THREE.Mesh(crossBarGeo, mats.clinicalLightGray);
    backCross.position.set(0, 0.14, 0.92);
    g.add(frontCross, backCross);

    // 4 Swivel Medical Caster Wheels resting flush on y = 0.0
    const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.036, 20));
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.042, 14));
    hubGeo.rotateZ(Math.PI / 2);
    const forkGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.065, 0.05));

    const casterPositions: [number, number][] = [
      [-0.34, 0.96],
      [0.34, 0.96],
      [-0.34, 2.48],
      [0.34, 2.48],
    ];
    for (const [cx, cz] of casterPositions) {
      const wheel = new THREE.Mesh(wheelGeo, mats.darkCharcoalTrim);
      wheel.position.set(cx, 0.055, cz);
      const hub = new THREE.Mesh(hubGeo, mats.brushedStainless);
      hub.position.set(cx, 0.055, cz);
      const fork = new THREE.Mesh(forkGeo, mats.brushedStainless);
      fork.position.set(cx, 0.105, cz);
      g.add(wheel, hub, fork);
    }

    // Tiered 3-stage telescoping white lift pedestal column (exact reference style)
    const tier1 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.46, 0.22, 0.88)),
      mats.darkCharcoalTrim
    );
    tier1.position.set(0, 0.26, 1.62);
    const tier2 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.52, 0.20, 0.96)),
      mats.glossWhiteShell
    );
    tier2.position.set(0, 0.45, 1.62);
    const tier3 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.58, 0.19, 1.08)),
      mats.glossWhiteShell
    );
    tier3.position.set(0, 0.63, 1.62);
    g.add(tier1, tier2, tier3);

    // Sculpted upper table cradle shell
    const cradleBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.68, 0.12, 1.92)),
      mats.glossWhiteShell
    );
    cradleBody.position.set(0, 0.78, 1.62);
    g.add(cradleBody);

    // Carbon-fiber sliding patient tabletop
    const tabletop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.60, 0.036, 1.98)),
      mats.carbonTabletop
    );
    tabletop.position.set(0, 0.858, 1.60);
    g.add(tabletop);

    // Light-blue ergonomic patient mattress & headrest cushion
    const mattress = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.54, 0.044, 1.62)),
      mats.mattressBlue
    );
    mattress.position.set(0, 0.896, 1.72);
    g.add(mattress);

    const headrest = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.44, 0.055, 0.26)),
      mats.mattressBlue
    );
    headrest.position.set(0, 0.905, 0.82);
    g.add(headrest);

    // Side metallic accessory rails + blue lock clips
    const sideBarGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 1.84, 12));
    sideBarGeo.rotateX(Math.PI / 2);
    const sideBarL = new THREE.Mesh(sideBarGeo, mats.brushedStainless);
    sideBarL.position.set(-0.37, 0.74, 1.62);
    const sideBarR = new THREE.Mesh(sideBarGeo, mats.brushedStainless);
    sideBarR.position.set(0.37, 0.74, 1.62);
    g.add(sideBarL, sideBarR);

    // Ergonomic Front Push-Handle Bar (curved U-frame like reference image!)
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.34, 0.16, 2.52),
      new THREE.Vector3(-0.34, 0.82, 2.66),
      new THREE.Vector3(-0.24, 0.96, 2.74),
      new THREE.Vector3(0.24, 0.96, 2.74),
      new THREE.Vector3(0.34, 0.82, 2.66),
      new THREE.Vector3(0.34, 0.16, 2.52),
    ]);
    const pushHandle = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(handleCurve, 36, 0.022, 12, false)),
      mats.clinicalLightGray
    );
    g.add(pushHandle);

    // Micro-detail: Precision Ball-Screw Linear Actuator & Optical Encoder at [0, 0.80, 1.98]
    const actuatorGroup = new THREE.Group();
    actuatorGroup.position.set(0, 0.80, 1.98);

    // Machined leadscrew shaft
    const screwGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.72, 16));
    screwGeo.rotateX(Math.PI / 2);
    const leadscrew = new THREE.Mesh(screwGeo, mats.brushedStainless);
    actuatorGroup.add(leadscrew);

    // Instanced ball-screw thread rings for crisp close-up texture
    const threadGeo = trackGeo(new THREE.TorusGeometry(0.0175, 0.0032, 6, 16));
    const threadCount = 34;
    const threads = new THREE.InstancedMesh(threadGeo, mats.darkSteelHardware, threadCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < threadCount; i++) {
      dummy.position.set(0, 0, -0.32 + i * 0.019);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      threads.setMatrixAt(i, dummy.matrix);
    }
    threads.instanceMatrix.needsUpdate = true;
    threads.computeBoundingSphere();
    actuatorGroup.add(threads);

    // Ball-nut bronze carriage block + twin chrome guide rods
    const nutBlock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.11, 0.06, 0.085)),
      mats.brassFitting
    );
    actuatorGroup.add(nutBlock);

    const guideGeo = trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.72, 12));
    guideGeo.rotateX(Math.PI / 2);
    const guideL = new THREE.Mesh(guideGeo, mats.silverPlatedRf);
    guideL.position.set(-0.085, 0, 0);
    const guideR = new THREE.Mesh(guideGeo, mats.silverPlatedRf);
    guideR.position.set(0.085, 0, 0);
    actuatorGroup.add(guideL, guideR);

    // Non-magnetic Servo Motor & Optical Encoder Disc at rear end of actuator
    const servo = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.12, 18)),
      mats.darkCharcoalTrim
    );
    servo.rotation.x = Math.PI / 2;
    servo.position.set(0, 0, 0.38);
    actuatorGroup.add(servo);

    const encoderDisc = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.008, 24)),
      mats.cryoCopper
    );
    encoderDisc.rotation.x = Math.PI / 2;
    encoderDisc.position.set(0, 0, 0.30);
    actuatorGroup.add(encoderDisc);

    g.add(actuatorGroup);
  });

  // =========================================================================
  // 04. CRYOCOOLER COLDHEAD TURRET & QUENCH VENT
  // =========================================================================
  registerPart('cryo-turret', (g) => {
    // Sleek sculpted white vertical turret fairing matching reference Philips column,
    // with a clean rear-right cutaway bay so the copper coldhead is clearly visible on inspection
    const shroudGeo = trackGeo(
      new THREE.CylinderGeometry(0.46, 0.56, 0.82, 40, 1, true, -Math.PI * 0.55, Math.PI * 1.45)
    );
    const shroudMat = mats.glossWhiteShell.clone();
    shroudMat.side = THREE.DoubleSide;
    trackMat(shroudMat);
    const shroud = new THREE.Mesh(shroudGeo, shroudMat);
    shroud.position.set(0, 2.48, -0.02);
    g.add(shroud);

    // Top turret collar plate
    const topCollar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.47, 0.47, 0.05, 36)),
      mats.glossWhiteShell
    );
    topCollar.position.set(0, 2.90, -0.02);
    g.add(topCollar);

    // Stainless base mounting flange seated cleanly on top of gantry crown
    const baseFlange = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.32, 0.34, 0.05, 32)),
      mats.brushedStainless
    );
    baseFlange.position.set(0, 2.12, -0.02);
    g.add(baseFlange);

    // 16 instanced hex bolts on turret flange
    const boltGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.024, 6));
    const boltCount = 16;
    const flangeBolts = new THREE.InstancedMesh(boltGeo, mats.darkSteelHardware, boltCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < boltCount; i++) {
      const a = (i / boltCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 0.27, 2.155, -0.02 + Math.sin(a) * 0.27);
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      flangeBolts.setMatrixAt(i, dummy.matrix);
    }
    flangeBolts.instanceMatrix.needsUpdate = true;
    flangeBolts.computeBoundingSphere();
    g.add(flangeBolts);

    // Gifford-McMahon 2-Stage Coldhead Core (45K & 4.2K copper stages)
    const stage1 = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 24)),
      mats.brushedStainless
    );
    stage1.position.set(0, 2.28, -0.02);
    g.add(stage1);

    const stage2Copper = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.085, 0.085, 0.22, 24)),
      mats.cryoCopper
    );
    stage2Copper.position.set(0, 2.52, -0.02);
    g.add(stage2Copper);

    // Copper cooling fins on Coldhead head
    const finGeo = trackGeo(new THREE.CylinderGeometry(0.135, 0.135, 0.012, 24));
    for (let i = 0; i < 6; i++) {
      const fin = new THREE.Mesh(finGeo, mats.cryoCopper);
      fin.position.set(0, 2.45 + i * 0.032, -0.02);
      g.add(fin);
    }

    // Quench exhaust vent pipe + brass burst disc valve
    const quenchPipe = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.74, 20)),
      mats.brushedStainless
    );
    quenchPipe.position.set(-0.18, 2.52, -0.14);
    g.add(quenchPipe);

    const burstValve = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.06, 16)),
      mats.brassFitting
    );
    burstValve.position.set(-0.18, 2.38, -0.02);
    burstValve.rotation.x = Math.PI / 2;
    g.add(burstValve);

    // Dual braided stainless helium compressor flex hoses
    const hoseCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.09, 2.58, 0.02),
      new THREE.Vector3(0.24, 2.60, 0.08),
      new THREE.Vector3(0.26, 2.36, -0.12),
      new THREE.Vector3(0.16, 2.19, -0.22),
    ]);
    const hose1 = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(hoseCurve1, 24, 0.016, 10, false)),
      mats.silverPlatedRf
    );
    g.add(hose1);

    // Micro-detail: Cryogenic Helium Pressure Gauge Dial at [0.10, 2.38, 0.14]
    const gaugeBody = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.056, 0.056, 0.034, 24)),
      mats.brassFitting
    );
    gaugeBody.rotation.x = Math.PI / 2;
    gaugeBody.rotation.z = -0.35;
    gaugeBody.position.set(0.10, 2.38, 0.14);
    g.add(gaugeBody);

    const gaugeFace = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.048, 24)),
      mats.heliumGauge
    );
    gaugeFace.rotation.y = 0.35;
    gaugeFace.position.set(0.107, 2.38, 0.158);
    g.add(gaugeFace);
  });

  // =========================================================================
  // 05. OUTER VACUUM CRYOSTAT VESSEL (OVC) — tucked cleanly inside outer shell!
  // =========================================================================
  registerPart('vacuum-vessel', (g) => {
    const ovcShell = new THREE.Mesh(
      trackGeo(createHollowCylinderLathe(0.83, 0.89, 1.00, 0.012, 48)),
      mats.brushedStainless
    );
    ovcShell.position.set(0, BORE_Y, -0.02);
    g.add(ovcShell);

    // Front & rear heavy bolted flange rings (rOuter 0.925 fits 100% inside shroud!)
    const flangeGeo = trackGeo(createHollowCylinderLathe(0.815, 0.925, 0.044, 0.008, 48));
    const frontFlange = new THREE.Mesh(flangeGeo, mats.brushedStainless);
    frontFlange.position.set(0, BORE_Y, 0.47);
    const rearFlange = new THREE.Mesh(flangeGeo, mats.brushedStainless);
    rearFlange.position.set(0, BORE_Y, -0.51);
    g.add(frontFlange, rearFlange);

    // 48 Instanced M12 Hex Bolts (24 front + 24 rear)
    const hexGeo = trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.024, 6));
    hexGeo.rotateX(Math.PI / 2);
    const bolts = new THREE.InstancedMesh(hexGeo, mats.darkSteelHardware, 48);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const bx = Math.cos(a) * 0.875;
      const by = BORE_Y + Math.sin(a) * 0.875;

      dummy.position.set(bx, by, 0.502);
      dummy.rotation.set(0, 0, a);
      dummy.updateMatrix();
      bolts.setMatrixAt(i, dummy.matrix);

      dummy.position.set(bx, by, -0.542);
      dummy.updateMatrix();
      bolts.setMatrixAt(i + 24, dummy.matrix);
    }
    bolts.instanceMatrix.needsUpdate = true;
    bolts.computeBoundingSphere();
    g.add(bolts);

    // Viton O-ring elastomer vacuum seal + Multi-Layer Insulation (MLI) Gold Foil Collar
    const oring = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.835, 0.008, 10, 48)),
      mats.darkCharcoalTrim
    );
    oring.position.set(0, BORE_Y, 0.494);
    g.add(oring);

    const mliRing = new THREE.Mesh(
      trackGeo(createHollowCylinderLathe(0.805, 0.828, 0.96, 0.004, 42)),
      mats.mliGoldFoil
    );
    mliRing.position.set(0, BORE_Y, -0.02);
    g.add(mliRing);

    // Side Vacuum Turbomolecular Pumping Port (kept inside envelope)
    const vacPort = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.12, 20)),
      mats.brushedStainless
    );
    vacPort.rotation.z = Math.PI / 2;
    vacPort.position.set(-0.92, BORE_Y + 0.14, 0.02);
    g.add(vacPort);
  });

  // =========================================================================
  // 06. 40K THERMAL SHIELD & SEALED LIQUID HELIUM VESSEL
  // =========================================================================
  registerPart('helium-vessel', (g) => {
    // 40K OFHC Copper Radiation Shield Cylinder
    const thermalShield = new THREE.Mesh(
      trackGeo(createHollowCylinderLathe(0.755, 0.79, 0.94, 0.01, 44)),
      mats.cryoCopper
    );
    thermalShield.position.set(0, BORE_Y, -0.02);
    g.add(thermalShield);

    // Inner Sealed Liquid Helium Cryostat Tank
    const heTank = new THREE.Mesh(
      trackGeo(createHollowCylinderLathe(0.685, 0.735, 0.90, 0.012, 44)),
      mats.brushedStainless
    );
    heTank.position.set(0, BORE_Y, -0.02);
    g.add(heTank);

    // Sealed BlueSeal Micro-Condenser Helical Copper Cooling Tubing
    const spiralPts: THREE.Vector3[] = [];
    const turns = 4.5;
    const steps = 90;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2 * turns;
      const z = -0.42 + t * 0.84;
      spiralPts.push(new THREE.Vector3(Math.cos(angle) * 0.798, BORE_Y + Math.sin(angle) * 0.798, z));
    }
    const condenserTube = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 110, 0.010, 8, false)),
      mats.cryoCopper
    );
    g.add(condenserTube);

    // Micro-detail: Cryogenic Cernox Temperature Probe & Ceramic Feedthrough at [0.56, 1.68, 0.42]
    const sensorMount = new THREE.Group();
    sensorMount.position.set(0.56, 1.68, 0.42);
    sensorMount.rotation.z = -0.78;

    const ceramicBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.042, 0.045, 16)),
      mats.ceramicCapacitor
    );
    sensorMount.add(ceramicBase);

    const probePin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 12)),
      mats.brassFitting
    );
    probePin.position.y = 0.055;
    sensorMount.add(probePin);

    const probeCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.018, 12, 12)),
      mats.nbtiFilamentSilver
    );
    probeCap.position.y = 0.095;
    sensorMount.add(probeCap);

    g.add(sensorMount);
  });

  // =========================================================================
  // 07. 3.0T SUPERCONDUCTING MAIN MAGNET COILS (NbTi)
  // =========================================================================
  registerPart('superconducting-magnet', (g) => {
    // Structural machined aluminum-bronze coil former drum
    const former = new THREE.Mesh(
      trackGeo(createHollowCylinderLathe(0.585, 0.612, 0.98, 0.008, 44)),
      mats.brushedStainless
    );
    former.position.set(0, BORE_Y, -0.02);
    g.add(former);

    // 6 High-Precision Main Solenoid NbTi Superconducting Winding Rings
    const coilZPositions = [-0.41, -0.25, -0.09, 0.07, 0.23, 0.39];
    const mainCoilGeo = trackGeo(createHollowCylinderLathe(0.612, 0.672, 0.115, 0.008, 44));
    for (const cz of coilZPositions) {
      const coil = new THREE.Mesh(mainCoilGeo, mats.superconductingWinding);
      coil.position.set(0, BORE_Y, cz);
      g.add(coil);
    }

    // 2 Active-Shielding Outer Bucking Coils (counter-wound to contain fringe field)
    const shieldCoilGeo = trackGeo(createHollowCylinderLathe(0.675, 0.715, 0.13, 0.008, 44));
    const shieldFront = new THREE.Mesh(shieldCoilGeo, mats.cryoCopper);
    shieldFront.position.set(0, BORE_Y, 0.36);
    const shieldRear = new THREE.Mesh(shieldCoilGeo, mats.cryoCopper);
    shieldRear.position.set(0, BORE_Y, -0.40);
    g.add(shieldFront, shieldRear);

    // 8 Axial Titanium Structural Tie-Rods clamping the solenoid stack
    const rodGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.014, 1.04, 12));
    rodGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const rod = new THREE.Mesh(rodGeo, mats.darkSteelHardware);
      rod.position.set(Math.cos(a) * 0.645, BORE_Y + Math.sin(a) * 0.645, -0.02);
      g.add(rod);
    }

    // Micro-detail: NbTi Filament Copper-Matrix Cross-Section & Persistent Switch at [0.52, 1.48, 0.46]
    const microBlock = new THREE.Group();
    microBlock.position.set(0.52, 1.48, 0.46);
    microBlock.rotation.z = -0.58;

    // Splice housing block
    const housing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.11, 0.072, 0.095)),
      mats.cryoCopper
    );
    microBlock.add(housing);

    // Cutaway copper-matrix cylinder exposing 19 gleaming NbTi superconducting filaments!
    const matrixGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.055, 24));
    matrixGeo.rotateX(Math.PI / 2);
    const matrix = new THREE.Mesh(matrixGeo, mats.cryoCopper);
    matrix.position.set(0, 0, 0.055);
    microBlock.add(matrix);

    const filGeo = trackGeo(new THREE.CylinderGeometry(0.0038, 0.0038, 0.064, 10));
    filGeo.rotateX(Math.PI / 2);
    const filaments = new THREE.InstancedMesh(filGeo, mats.nbtiFilamentSilver, 19);
    const dummy = new THREE.Object3D();
    let idx = 0;
    // Center filament
    dummy.position.set(0, 0, 0.058);
    dummy.updateMatrix();
    filaments.setMatrixAt(idx++, dummy.matrix);
    // Ring 1 (6 filaments)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 0.012, Math.sin(a) * 0.012, 0.058);
      dummy.updateMatrix();
      filaments.setMatrixAt(idx++, dummy.matrix);
    }
    // Ring 2 (12 filaments)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0.058);
      dummy.updateMatrix();
      filaments.setMatrixAt(idx++, dummy.matrix);
    }
    filaments.instanceMatrix.needsUpdate = true;
    filaments.computeBoundingSphere();
    microBlock.add(filaments);

    // Persistent-mode switch ceramic heater capsule beside splice block
    const switchHeater = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.068, 14)),
      mats.ceramicCapacitor
    );
    switchHeater.position.set(0.072, 0.01, 0.01);
    microBlock.add(switchHeater);

    g.add(microBlock);
  });

  // =========================================================================
  // 08. PASSIVE SHIM TRAYS & HOMOGENEITY CORE
  // =========================================================================
  registerPart('shim-tray', (g) => {
    // Twin G10 end-retainer rings
    const retainerGeo = trackGeo(createHollowCylinderLathe(0.515, 0.562, 0.045, 0.005, 42));
    const frontRet = new THREE.Mesh(retainerGeo, mats.g10Fiberglass);
    frontRet.position.set(0, BORE_Y, 0.44);
    const rearRet = new THREE.Mesh(retainerGeo, mats.g10Fiberglass);
    rearRet.position.set(0, BORE_Y, -0.48);
    g.add(frontRet, rearRet);

    // 24 Axial G10 Fiberglass Shim Drawers (InstancedMesh)
    const railGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.026, 0.90));
    const rails = new THREE.InstancedMesh(railGeo, mats.g10Fiberglass, 24);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 0.538, BORE_Y + Math.sin(a) * 0.538, -0.02);
      dummy.rotation.set(0, 0, a + Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rails.setMatrixAt(i, dummy.matrix);
    }
    rails.instanceMatrix.needsUpdate = true;
    rails.computeBoundingSphere();
    g.add(rails);

    // 72 Calibrated Silicon-Steel Shim Plates inside drawers (3 per rail)
    const plateGeo = trackGeo(new THREE.BoxGeometry(0.028, 0.014, 0.16));
    const plates = new THREE.InstancedMesh(plateGeo, mats.shimSteel, 72);
    let pIdx = 0;
    const zSlots = [-0.28, -0.02, 0.24];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      for (const zs of zSlots) {
        dummy.position.set(Math.cos(a) * 0.548, BORE_Y + Math.sin(a) * 0.548, zs);
        dummy.rotation.set(0, 0, a + Math.PI / 2);
        dummy.scale.set(1, 0.8 + ((i + pIdx) % 3) * 0.35, 1);
        dummy.updateMatrix();
        plates.setMatrixAt(pIdx++, dummy.matrix);
      }
    }
    plates.instanceMatrix.needsUpdate = true;
    plates.computeBoundingSphere();
    g.add(plates);

    // Micro-detail: Partially pulled-out hero shim pocket drawer at [0.39, 1.42, 0.44]
    const heroDrawer = new THREE.Group();
    heroDrawer.position.set(0.39, 1.42, 0.44);
    heroDrawer.rotation.z = -0.78;

    const drawerBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.044, 0.028, 0.22)),
      mats.g10Fiberglass
    );
    heroDrawer.add(drawerBody);

    // Stacked tiered silicon-steel shims + brass lock pin
    for (let s = 0; s < 4; s++) {
      const shim = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.032, 0.005, 0.055)),
        mats.shimSteel
      );
      shim.position.set(0, 0.016 + s * 0.006, 0.04);
      heroDrawer.add(shim);
    }

    const brassPin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.042, 10)),
      mats.brassFitting
    );
    brassPin.position.set(0, 0.015, 0.095);
    heroDrawer.add(brassPin);

    g.add(heroDrawer);
  });

  // =========================================================================
  // 09. 3-AXIS GRADIENT COIL ASSEMBLY (X, Y, Z) & CHILLED WATER LOOPS
  // =========================================================================
  registerPart('gradient-coil', (g) => {
    // Main epoxy-potted gradient cylinder with procedural Golay/Maxwell copper trace map!
    const gradGeo = trackGeo(new THREE.CylinderGeometry(0.485, 0.485, 1.00, 48, 1, true));
    gradGeo.rotateX(Math.PI / 2);
    const gradOuter = new THREE.Mesh(gradGeo, mats.gradientEpoxy);
    gradOuter.position.set(0, BORE_Y, -0.02);
    g.add(gradOuter);

    // Solid epoxy structural core wall
    const gradCore = new THREE.Mesh(
      trackGeo(createHollowCylinderLathe(0.435, 0.482, 1.00, 0.01, 44)),
      mats.clinicalLightGray
    );
    gradCore.position.set(0, BORE_Y, -0.02);
    g.add(gradCore);

    // Helical chilled-water cooling loop wrapped around gradient exterior
    const waterPts: THREE.Vector3[] = [];
    const wSteps = 84;
    for (let i = 0; i <= wSteps; i++) {
      const t = i / wSteps;
      const a = t * Math.PI * 2 * 5;
      const z = -0.45 + t * 0.90;
      waterPts.push(new THREE.Vector3(Math.cos(a) * 0.497, BORE_Y + Math.sin(a) * 0.497, z));
    }
    const waterTube = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(waterPts), 100, 0.009, 8, false)),
      mats.waterTubeBlue
    );
    g.add(waterTube);

    // Micro-detail: High-Current Laminated Copper Busbars & Brass Manifold at [0.36, 1.38, 0.48]
    const busbarGroup = new THREE.Group();
    busbarGroup.position.set(0.36, 1.38, 0.48);
    busbarGroup.rotation.z = -0.62;

    const terminalBase = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.075, 0.085)),
      mats.darkCharcoalTrim
    );
    busbarGroup.add(terminalBase);

    // 3 laminated high-current copper busbars (X, Y, Z axes)
    const barGeo = trackGeo(new THREE.BoxGeometry(0.026, 0.042, 0.09));
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(barGeo, mats.cryoCopper);
      bar.position.set(-0.042 + i * 0.042, 0.022, 0.028);
      busbarGroup.add(bar);

      const fitting = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.048, 12)),
        mats.brassFitting
      );
      fitting.rotation.x = Math.PI / 2;
      fitting.position.set(-0.042 + i * 0.042, -0.024, 0.042);
      busbarGroup.add(fitting);
    }

    g.add(busbarGroup);
  });

  // =========================================================================
  // 10. QUADRATURE RF BODY BIRDCAGE COIL (127.74 MHz)
  // =========================================================================
  registerPart('rf-body-coil', (g) => {
    const birdcageR = 0.392;
    const halfLen = 0.45;

    // Front & Rear silver-plated copper end-rings
    const endRingGeo = trackGeo(new THREE.TorusGeometry(birdcageR, 0.014, 14, 48));
    const frontRing = new THREE.Mesh(endRingGeo, mats.silverPlatedRf);
    frontRing.position.set(0, BORE_Y, halfLen - 0.02);
    const rearRing = new THREE.Mesh(endRingGeo, mats.silverPlatedRf);
    rearRing.position.set(0, BORE_Y, -halfLen - 0.02);
    g.add(frontRing, rearRing);

    // 16 Silver-Plated Axial Birdcage Rungs (InstancedMesh)
    const rungGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.012, halfLen * 2));
    const rungs = new THREE.InstancedMesh(rungGeo, mats.silverPlatedRf, 16);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * birdcageR, BORE_Y + Math.sin(a) * birdcageR, -0.02);
      dummy.rotation.set(0, 0, a + Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rungs.setMatrixAt(i, dummy.matrix);
    }
    rungs.instanceMatrix.needsUpdate = true;
    rungs.computeBoundingSphere();
    g.add(rungs);

    // 32 Non-Magnetic High-Voltage Porcelain Tuning Capacitors at every rung junction
    const capGeo = trackGeo(new THREE.BoxGeometry(0.026, 0.018, 0.022));
    const caps = new THREE.InstancedMesh(capGeo, mats.ceramicCapacitor, 32);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const cx = Math.cos(a) * (birdcageR + 0.012);
      const cy = BORE_Y + Math.sin(a) * (birdcageR + 0.012);

      dummy.position.set(cx, cy, halfLen - 0.02);
      dummy.rotation.set(0, 0, a + Math.PI / 2);
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);

      dummy.position.set(cx, cy, -halfLen - 0.02);
      dummy.updateMatrix();
      caps.setMatrixAt(i + 16, dummy.matrix);
    }
    caps.instanceMatrix.needsUpdate = true;
    caps.computeBoundingSphere();
    g.add(caps);

    // Micro-detail: High-Voltage Capacitor Pair, PIN Detuning Diode & SMA Feed at [0.28, 1.43, 0.44]
    const rfMicro = new THREE.Group();
    rfMicro.position.set(0.28, 1.43, 0.44);
    rfMicro.rotation.z = -0.78;

    const solderPad = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.068, 0.016, 0.056)),
      mats.cryoCopper
    );
    rfMicro.add(solderPad);

    const hvCap1 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.024, 0.022, 0.028)),
      mats.ceramicCapacitor
    );
    hvCap1.position.set(-0.016, 0.018, 0);
    const hvCap2 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.024, 0.022, 0.028)),
      mats.ceramicCapacitor
    );
    hvCap2.position.set(0.016, 0.018, 0);
    rfMicro.add(hvCap1, hvCap2);

    // Miniature cylindrical PIN Diode & Brass SMA Coaxial Feed
    const pinDiode = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.007, 0.007, 0.026, 12)),
      mats.laserRedAccent
    );
    pinDiode.rotation.z = Math.PI / 2;
    pinDiode.position.set(0, 0.014, 0.024);
    rfMicro.add(pinDiode);

    const smaConn = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.032, 12)),
      mats.brassFitting
    );
    smaConn.rotation.x = Math.PI / 2;
    smaConn.position.set(0, 0.016, 0.044);
    rfMicro.add(smaConn);

    g.add(rfMicro);
  });

  // =========================================================================
  // 11. 70 CM WIDE-BORE LINER & AMBIENT LED HALO
  // =========================================================================
  registerPart('bore-liner', (g) => {
    const boreTube = new THREE.Mesh(
      trackGeo(createHollowCylinderLathe(0.35, 0.372, 1.14, 0.008, 48)),
      mats.matteWhiteInterior
    );
    boreTube.position.set(0, BORE_Y, 0.0);
    g.add(boreTube);

    // Soft glowing cool-blue ambient LED halo rings inside bore (matching reference!)
    const ledGeo = trackGeo(new THREE.TorusGeometry(0.351, 0.009, 10, 48));
    const ledFront = new THREE.Mesh(ledGeo, mats.boreLedHalo);
    ledFront.position.set(0, BORE_Y, 0.49);
    const ledMid = new THREE.Mesh(ledGeo, mats.boreLedHalo);
    ledMid.position.set(0, BORE_Y, 0.0);
    const ledRear = new THREE.Mesh(ledGeo, mats.boreLedHalo);
    ledRear.position.set(0, BORE_Y, -0.49);
    g.add(ledFront, ledMid, ledRear);

    // Micro-detail: Upper LED Diffuser Pod, Ventilation Louvers & Intercom Grille at [0, 1.48, 0.52]
    const intercomPod = new THREE.Group();
    intercomPod.position.set(0, 1.485, 0.51);

    const diffuser = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.018, 0.07)),
      mats.boreLedHalo
    );
    intercomPod.add(diffuser);

    const grille = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.016, 16)),
      mats.darkSteelHardware
    );
    grille.position.set(0, -0.012, -0.055);
    intercomPod.add(grille);

    g.add(intercomPod);
  });

  // =========================================================================
  // 12. 32-CHANNEL PHASED-ARRAY HEAD COIL & LNA PCB
  // =========================================================================
  registerPart('head-coil', (g) => {
    const hcGroup = new THREE.Group();
    hcGroup.position.set(0, 0.94, 1.06);

    // Base cradle docked onto the patient headrest
    const basePlate = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.045, 0.34)),
      mats.glossWhiteShell
    );
    hcGroup.add(basePlate);

    // Lower U-shaped contoured headrest shell
    const lowerCradle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.155, 0.155, 0.30, 28, 1, true, Math.PI * 0.72, Math.PI * 0.56)),
      mats.mattressBlue
    );
    lowerCradle.rotation.x = Math.PI / 2;
    lowerCradle.position.set(0, 0.17, 0);
    hcGroup.add(lowerCradle);

    // Upper slotted neuroimaging visor arch (open-window white medical frame + translucent dome)
    const archGeo = trackGeo(new THREE.TorusGeometry(0.155, 0.018, 12, 32, Math.PI));
    const archFront = new THREE.Mesh(archGeo, mats.glossWhiteShell);
    archFront.position.set(0, 0.06, 0.13);
    const archMid = new THREE.Mesh(archGeo, mats.glossWhiteShell);
    archMid.position.set(0, 0.06, 0.0);
    const archRear = new THREE.Mesh(archGeo, mats.glossWhiteShell);
    archRear.position.set(0, 0.06, -0.13);
    hcGroup.add(archFront, archMid, archRear);

    // Longitudinal frame struts
    const strutGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 10));
    strutGeo.rotateX(Math.PI / 2);
    const strutAngles = [0.22, 0.75, Math.PI - 0.75, Math.PI - 0.22];
    for (const a of strutAngles) {
      const strut = new THREE.Mesh(strutGeo, mats.glossWhiteShell);
      strut.position.set(Math.cos(a) * 0.155, 0.06 + Math.sin(a) * 0.155, 0);
      hcGroup.add(strut);
    }

    // Translucent polycarbonate inspection canopy
    const visorDome = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.148, 0.148, 0.26, 28, 1, true, -Math.PI * 0.42, Math.PI * 0.84)),
      mats.visorTranslucent
    );
    visorDome.rotation.x = Math.PI / 2;
    visorDome.position.set(0, 0.06, 0);
    visorDome.renderOrder = 4;
    hcGroup.add(visorDome);

    // Internal Phased-Array Copper Receiver Loops visible inside the visor!
    const loopGeo = trackGeo(new THREE.TorusGeometry(0.044, 0.0045, 8, 20));
    const loopAngles = [0.45, 1.05, 1.57, 2.09, 2.69];
    for (const a of loopAngles) {
      for (const lz of [-0.065, 0.065]) {
        const loop = new THREE.Mesh(loopGeo, mats.cryoCopper);
        loop.position.set(Math.cos(a) * 0.138, 0.06 + Math.sin(a) * 0.138, lz);
        loop.lookAt(0, 0.06, lz);
        hcGroup.add(loop);
      }
    }

    // Multi-pin dStream Optical/Coax Connector Plug docking into the table
    const dockCable = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.12, 0.02, -0.15),
            new THREE.Vector3(-0.18, 0.01, -0.24),
            new THREE.Vector3(-0.14, -0.02, -0.32),
          ]),
          18,
          0.012,
          8,
          false
        )
      ),
      mats.darkCharcoalTrim
    );
    hcGroup.add(dockCable);

    const dockPlug = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.056, 0.032, 0.064)),
      mats.royalBlueEmblem
    );
    dockPlug.position.set(-0.14, -0.02, -0.34);
    hcGroup.add(dockPlug);

    g.add(hcGroup);

    // Micro-detail: Recessed 32-Channel Low-Noise Amplifier (LNA) PCB tucked neatly inside side housing at [0.13, 1.13, 1.06]
    const pcbGroup = new THREE.Group();
    pcbGroup.position.set(0.13, 1.13, 1.06);
    pcbGroup.rotation.z = -0.82;

    const pcbBoard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.062, 0.007, 0.088)),
      mats.pcbLna
    );
    pcbGroup.add(pcbBoard);

    // Surface-mount GaAs FET LNA chips + coaxial balun cylinders
    const chipGeo = trackGeo(new THREE.BoxGeometry(0.014, 0.006, 0.014));
    for (let i = 0; i < 3; i++) {
      const chip = new THREE.Mesh(chipGeo, mats.darkCharcoalTrim);
      chip.position.set(0, 0.006, -0.024 + i * 0.024);
      pcbGroup.add(chip);
    }

    const balun = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.007, 0.007, 0.022, 12)),
      mats.brassFitting
    );
    balun.rotation.x = Math.PI / 2;
    balun.position.set(-0.020, 0.007, 0.024);
    pcbGroup.add(balun);

    g.add(pcbGroup);
  });

  return {
    root,
    parts,
    tableShadowMesh,
    interactables,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      extraMaterials.forEach((m) => m.dispose());
      Object.values(parts).forEach((entry) => {
        entry.materials.forEach((rec) => rec.material.dispose());
      });
    },
  };
}
