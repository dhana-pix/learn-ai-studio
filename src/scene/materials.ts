import * as THREE from 'three';
import { MriTextureBundle } from './textures';

export interface MriMaterialLibrary {
  glossWhiteShell: THREE.MeshPhysicalMaterial;
  matteWhiteInterior: THREE.MeshStandardMaterial;
  clinicalLightGray: THREE.MeshStandardMaterial;
  darkCharcoalTrim: THREE.MeshStandardMaterial;
  royalBlueEmblem: THREE.MeshStandardMaterial;
  mattressBlue: THREE.MeshStandardMaterial;
  carbonTabletop: THREE.MeshStandardMaterial;
  touchscreenLeft: THREE.MeshStandardMaterial;
  touchscreenRight: THREE.MeshStandardMaterial;
  brushedStainless: THREE.MeshPhysicalMaterial;
  darkSteelHardware: THREE.MeshStandardMaterial;
  cryoCopper: THREE.MeshPhysicalMaterial;
  superconductingWinding: THREE.MeshStandardMaterial;
  nbtiFilamentSilver: THREE.MeshStandardMaterial;
  mliGoldFoil: THREE.MeshStandardMaterial;
  gradientEpoxy: THREE.MeshStandardMaterial;
  waterTubeBlue: THREE.MeshStandardMaterial;
  g10Fiberglass: THREE.MeshStandardMaterial;
  shimSteel: THREE.MeshStandardMaterial;
  silverPlatedRf: THREE.MeshPhysicalMaterial;
  ceramicCapacitor: THREE.MeshStandardMaterial;
  boreLedHalo: THREE.MeshStandardMaterial;
  laserRedAccent: THREE.MeshStandardMaterial;
  pcbLna: THREE.MeshStandardMaterial;
  heliumGauge: THREE.MeshStandardMaterial;
  visorTranslucent: THREE.MeshPhysicalMaterial;
  brassFitting: THREE.MeshStandardMaterial;
  acousticFoam: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createMriMaterials(
  textures: MriTextureBundle,
  isSoftwareGl: boolean
): MriMaterialLibrary {
  const mats: MriMaterialLibrary = {
    glossWhiteShell: new THREE.MeshPhysicalMaterial({
      color: 0xeaf0f7,
      roughness: 0.24,
      metalness: 0.05,
      clearcoat: 0.82,
      clearcoatRoughness: 0.16,
      envMapIntensity: 0.9,
    }),
    matteWhiteInterior: new THREE.MeshStandardMaterial({
      color: 0xdce6f2,
      roughness: 0.62,
      metalness: 0.02,
    }),
    clinicalLightGray: new THREE.MeshStandardMaterial({
      color: 0xbccad9,
      roughness: 0.46,
      metalness: 0.18,
    }),
    darkCharcoalTrim: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.54,
      metalness: 0.28,
    }),
    royalBlueEmblem: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.sideEmblem,
      roughness: 0.26,
      metalness: 0.14,
    }),
    mattressBlue: new THREE.MeshStandardMaterial({
      color: 0x91b3e0,
      roughness: 0.84,
      metalness: 0.0,
    }),
    carbonTabletop: new THREE.MeshStandardMaterial({
      color: 0xcfdbe8,
      roughness: 0.34,
      metalness: 0.1,
    }),
    touchscreenLeft: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.touchscreenLeft,
      emissive: 0x7cb8ff,
      emissiveMap: textures.touchscreenLeft,
      emissiveIntensity: 0.55,
      roughness: 0.16,
      metalness: 0.05,
    }),
    touchscreenRight: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.touchscreenRight,
      emissive: 0x7cb8ff,
      emissiveMap: textures.touchscreenRight,
      emissiveIntensity: 0.55,
      roughness: 0.16,
      metalness: 0.05,
    }),
    brushedStainless: new THREE.MeshPhysicalMaterial({
      color: 0xcbd5e1,
      roughness: 0.26,
      metalness: 0.92,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.008,
      anisotropy: isSoftwareGl ? 0 : 0.72,
      envMapIntensity: 1.15,
    }),
    darkSteelHardware: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.36,
      metalness: 0.85,
    }),
    cryoCopper: new THREE.MeshPhysicalMaterial({
      color: 0xd87e4a,
      roughness: 0.24,
      metalness: 0.94,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.005,
      envMapIntensity: 1.15,
    }),
    superconductingWinding: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.copperWindingMap,
      bumpMap: textures.copperWindingBump,
      bumpScale: 0.018,
      roughness: 0.30,
      metalness: 0.86,
      envMapIntensity: 1.1,
    }),
    nbtiFilamentSilver: new THREE.MeshStandardMaterial({
      color: 0xd9e8ff,
      roughness: 0.18,
      metalness: 0.96,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.15,
    }),
    mliGoldFoil: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.mliFoilMap,
      bumpMap: textures.mliFoilBump,
      bumpScale: 0.025,
      roughness: 0.28,
      metalness: 0.88,
    }),
    gradientEpoxy: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.gradientTraceMap,
      bumpMap: textures.gradientTraceBump,
      bumpScale: 0.015,
      roughness: 0.42,
      metalness: 0.28,
    }),
    waterTubeBlue: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.32,
      metalness: 0.18,
    }),
    g10Fiberglass: new THREE.MeshStandardMaterial({
      color: 0x6ea684,
      roughness: 0.62,
      metalness: 0.05,
    }),
    shimSteel: new THREE.MeshStandardMaterial({
      color: 0x7c8aa0,
      roughness: 0.34,
      metalness: 0.86,
    }),
    silverPlatedRf: new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.16,
      metalness: 0.96,
      envMapIntensity: 1.25,
    }),
    ceramicCapacitor: new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.22,
      metalness: 0.06,
    }),
    boreLedHalo: new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x60a5fa,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.0,
    }),
    laserRedAccent: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.65,
      roughness: 0.32,
      metalness: 0.1,
    }),
    pcbLna: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.pcbLnaMap,
      roughness: 0.38,
      metalness: 0.26,
    }),
    heliumGauge: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.heliumGaugeMap,
      roughness: 0.22,
      metalness: 0.05,
    }),
    visorTranslucent: new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      roughness: 0.14,
      metalness: 0.0,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.85,
      ior: 1.49,
      thickness: 0.08,
      depthWrite: false,
    }),
    brassFitting: new THREE.MeshStandardMaterial({
      color: 0xd4a448,
      roughness: 0.28,
      metalness: 0.9,
    }),
    acousticFoam: new THREE.MeshStandardMaterial({
      color: 0x3b475c,
      roughness: 0.92,
      metalness: 0.0,
    }),
    dispose: () => {
      Object.values(mats).forEach((val) => {
        if (val instanceof THREE.Material) {
          val.dispose();
        }
      });
    },
  };

  return mats;
}

export interface PartMaterialRecord {
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  baseOpacity: number;
  baseTransparent: boolean;
  baseEmissiveHex: number;
  baseEmissiveIntensity: number;
  baseDepthWrite: boolean;
}

/**
 * Clones materials per part group so every MRI assembly can smoothly fade,
 * ghost, or highlight independently without mutating sibling assemblies.
 */
export function bindPartScopedMaterials(group: THREE.Group): PartMaterialRecord[] {
  const cloneCache = new Map<THREE.Material, THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>();
  const records: PartMaterialRecord[] = [];

  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh)) return;
    if (Array.isArray(obj.material)) return;

    const src = obj.material;
    if (!(src instanceof THREE.MeshStandardMaterial || src instanceof THREE.MeshPhysicalMaterial)) {
      return;
    }

    let cloned = cloneCache.get(src);
    if (!cloned) {
      cloned = src.clone();
      cloneCache.set(src, cloned);
      records.push({
        material: cloned,
        baseOpacity: cloned.opacity,
        baseTransparent: cloned.transparent,
        baseEmissiveHex: cloned.emissive.getHex(),
        baseEmissiveIntensity: cloned.emissiveIntensity,
        baseDepthWrite: cloned.depthWrite,
      });
    }
    obj.material = cloned;
  });

  return records;
}
