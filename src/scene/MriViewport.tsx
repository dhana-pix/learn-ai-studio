import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  MRI_LAYER_MAP,
  MRI_PARTS,
  MRI_PART_MAP,
  MriPartId,
  ViewMode,
} from '../data/mriAnatomy';
import {
  clampZoomDistance,
  computeFocusCamera,
  computePartOffset,
  MAX_CAMERA_DISTANCE,
  MIN_MACRO_DISTANCE,
  resolvePartVisualPolicy,
} from '../utils/mriState';
import { buildMriRig, BuiltMriRig } from './buildMriModel';
import { createMriMaterials } from './materials';
import { createMriTextures } from './textures';

export interface MriViewportHandle {
  zoomBy: (factor: number) => void;
  resetCamera: () => void;
  focusPart: (partId: MriPartId, microMode: boolean) => void;
  frameExplodedOverview: (factor: number) => void;
}

export interface MriViewportProps {
  explode: number;
  tableTravel: number;
  viewMode: ViewMode;
  selectedPartId: MriPartId | null;
  microZoomActive: boolean;
  isolatedPartId: MriPartId | null;
  detachedIds: ReadonlySet<MriPartId>;
  hiddenIds: ReadonlySet<MriPartId>;
  showPins: boolean;
  onSelectPart: (partId: MriPartId | null, activateMicro?: boolean) => void;
  onCameraZoomChange?: (distanceMeters: number) => void;
}

// Default hero camera framed closely to match the user's reference 3/4 radiology suite view
const DEFAULT_CAM_POS = new THREE.Vector3(3.35, 1.92, 4.05);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0.0, 1.08, 0.72);
const MOBILE_CAM_POS = new THREE.Vector3(4.35, 2.35, 5.45);
const MOBILE_CAM_TARGET = new THREE.Vector3(0.0, 1.05, 0.85);

// Scratch math objects pre-allocated outside render loop (zero GC)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _rayNdc = new THREE.Vector2();

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const MriViewport = React.forwardRef<MriViewportHandle, MriViewportProps>(
  function MriViewport(props, ref) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const pinButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [webglUnavailable, setWebglUnavailable] = useState(false);

    // Keep latest props in a ref so the mounted WebGL engine never tears down
    const stateRef = useRef({
      explode: props.explode,
      tableTravel: props.tableTravel,
      viewMode: props.viewMode,
      selectedPartId: props.selectedPartId,
      microZoomActive: props.microZoomActive,
      isolatedPartId: props.isolatedPartId,
      detachedIds: props.detachedIds,
      hiddenIds: props.hiddenIds,
      showPins: props.showPins,
      onSelectPart: props.onSelectPart,
      onCameraZoomChange: props.onCameraZoomChange,
    });

    stateRef.current = {
      explode: props.explode,
      tableTravel: props.tableTravel,
      viewMode: props.viewMode,
      selectedPartId: props.selectedPartId,
      microZoomActive: props.microZoomActive,
      isolatedPartId: props.isolatedPartId,
      detachedIds: props.detachedIds,
      hiddenIds: props.hiddenIds,
      showPins: props.showPins,
      onSelectPart: props.onSelectPart,
      onCameraZoomChange: props.onCameraZoomChange,
    };

    // Imperative hooks bridge into mounted scene controller
    const controllerRef = useRef<{
      requestRender: () => void;
      flyTo: (pos: [number, number, number], target: [number, number, number], isMicro: boolean) => void;
      zoomBy: (factor: number) => void;
      resetCamera: () => void;
    } | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        zoomBy(factor: number) {
          controllerRef.current?.zoomBy(factor);
        },
        resetCamera() {
          controllerRef.current?.resetCamera();
        },
        focusPart(partId: MriPartId, microMode: boolean) {
          const part = MRI_PART_MAP[partId];
          if (!part) return;
          const s = stateRef.current;
          const cam = computeFocusCamera(
            part,
            {
              explode: s.explode,
              tableTravel: s.tableTravel,
              detachedIds: s.detachedIds,
            },
            microMode
          );
          controllerRef.current?.flyTo(cam.position, cam.target, microMode);
        },
        frameExplodedOverview(factor: number) {
          const t = Math.max(0, Math.min(1, factor));
          controllerRef.current?.flyTo(
            [3.35 + t * 2.15, 1.92 + t * 0.95, 4.05 + t * 2.15],
            [0.0, 1.12, 0.72 + t * 0.15],
            false
          );
        },
      }),
      []
    );

    // Trigger on-demand render whenever React props change
    useEffect(() => {
      controllerRef.current?.requestRender();
    }, [
      props.explode,
      props.tableTravel,
      props.viewMode,
      props.selectedPartId,
      props.microZoomActive,
      props.isolatedPartId,
      props.detachedIds,
      props.hiddenIds,
      props.showPins,
    ]);

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareGl();

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
        });
      } catch {
        setWebglUnavailable(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.96;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.touchAction = 'none';
      renderer.domElement.setAttribute('aria-label', 'Tampilan 3D Interaktif Mesin MRI');
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Luminous cool-white/ice-blue radiology suite atmosphere (matching reference image)
      const scene = new THREE.Scene();
      const suiteBgColor = new THREE.Color(0xdce8f6);
      scene.background = suiteBgColor;
      scene.fog = new THREE.Fog(0xdce8f6, 12.0, 23.0);

      // Studio PBR Environment Reflections via RoomEnvironment (mandatory on all devices)
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();

      // Perspective camera with ultra-close near plane for micro-detail inspection
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const isPortrait = width / height < 0.85;
      const camera = new THREE.PerspectiveCamera(isPortrait ? 46 : 40, width / height, 0.03, 55);
      camera.position.copy(isPortrait ? MOBILE_CAM_POS : DEFAULT_CAM_POS);

      // Touch-friendly OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(isPortrait ? MOBILE_CAM_TARGET : DEFAULT_CAM_TARGET);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.78;
      controls.zoomSpeed = 0.95;
      controls.panSpeed = 0.75;
      controls.minDistance = MIN_MACRO_DISTANCE;
      controls.maxDistance = MAX_CAMERA_DISTANCE;
      controls.maxPolarAngle = Math.PI * 0.492; // Prevent going underneath the floor
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
      controls.update();

      // Balanced 3-Point Clinical Lighting Rig (sculptural contrast matching reference suite)
      const hemiLight = new THREE.HemisphereLight(0xd4e7ff, 0x6d809c, 0.78);
      hemiLight.position.set(0, 12, 0);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff7eb, 1.32);
      keyLight.position.set(4.8, 7.2, 5.2);
      if (!isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 1.0;
        keyLight.shadow.camera.far = 20.0;
        const d = 4.6;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.02;
      }
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x8ec5ff, 0.88);
      rimLight.position.set(-4.8, 4.2, -4.5);
      scene.add(rimLight);

      // Subtle cool interior bore bounce light
      const boreFill = new THREE.PointLight(0x7cb9ff, 1.05, 5.2, 2);
      boreFill.position.set(0, 1.15, 0.35);
      scene.add(boreFill);

      // Build procedural textures, PBR materials, and 12-part MRI rig
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const textures = createMriTextures(maxAniso);
      const materials = createMriMaterials(textures, isSoftwareGl);
      const mriRig: BuiltMriRig = buildMriRig(materials, textures, isSoftwareGl);
      scene.add(mriRig.root);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // Mutable transition & animation states (damped smoothly per render frame)
      const partCurrentOffsets: Record<MriPartId, THREE.Vector3> = {} as Record<MriPartId, THREE.Vector3>;
      const partCurrentOpacities: Record<MriPartId, number> = {} as Record<MriPartId, number>;
      for (const part of MRI_PARTS) {
        partCurrentOffsets[part.id] = new THREE.Vector3(0, 0, 0);
        partCurrentOpacities[part.id] = 1;
      }

      let hoveredPartId: MriPartId | null = null;
      let camFlightActive = false;
      const camGoalPos = new THREE.Vector3().copy(DEFAULT_CAM_POS);
      const camGoalTarget = new THREE.Vector3().copy(DEFAULT_CAM_TARGET);

      let frameId = 0;
      let renderBusy = false;
      let renderDirty = false;
      let lastFrameTime = performance.now();
      let lastZoomReportTime = 0;
      let disposed = false;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      function updatePinOverlays() {
        const s = stateRef.current;
        const w = renderer.domElement.clientWidth || 1;
        const h = renderer.domElement.clientHeight || 1;

        for (const part of MRI_PARTS) {
          const btn = pinButtonRefs.current[part.id];
          if (!btn) continue;

          const policy = resolvePartVisualPolicy(part, {
            hiddenIds: s.hiddenIds,
            isolatedId: s.isolatedPartId,
            viewMode: s.viewMode,
          });

          if (!s.showPins || !policy.visible || policy.opacity < 0.12) {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
            continue;
          }

          const entry = mriRig.parts[part.id];
          const useMicro = s.selectedPartId === part.id && s.microZoomActive;
          const anchor = useMicro ? part.microDetail.localAnchor : part.pinLocalOffset;

          _proj.set(
            anchor[0] + entry.group.position.x,
            anchor[1] + entry.group.position.y,
            anchor[2] + entry.group.position.z
          );
          _proj.project(camera);

          const inFront = _proj.z >= -1 && _proj.z <= 1;
          const px = (_proj.x * 0.5 + 0.5) * w;
          const py = (-_proj.y * 0.5 + 0.5) * h;
          const onScreen = inFront && px > 28 && px < w - 28 && py > 64 && py < h - 108;

          if (!onScreen) {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
          } else {
            btn.style.opacity = s.selectedPartId === part.id ? '1' : '0.92';
            btn.style.pointerEvents = 'auto';
            btn.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0) translate(-50%, -50%)`;
          }
        }
      }

      function stepScene(dt: number): boolean {
        const s = stateRef.current;
        // On software WebGL settle briskly so low-fps CPU rendering responds immediately
        const dampLambda = isSoftwareGl ? 24 : 9.5;
        let stillMoving = false;

        // 1. Update each MRI part's damped transform, opacity, and selection highlight
        for (const part of MRI_PARTS) {
          const entry = mriRig.parts[part.id];
          const targetOffset = computePartOffset(part, {
            explode: s.explode,
            tableTravel: s.tableTravel,
            detachedIds: s.detachedIds,
          });

          const curPos = partCurrentOffsets[part.id];
          const nx = THREE.MathUtils.damp(curPos.x, targetOffset[0], dampLambda, dt);
          const ny = THREE.MathUtils.damp(curPos.y, targetOffset[1], dampLambda, dt);
          const nz = THREE.MathUtils.damp(curPos.z, targetOffset[2], dampLambda, dt);

          if (
            Math.abs(nx - targetOffset[0]) > 0.004 ||
            Math.abs(ny - targetOffset[1]) > 0.004 ||
            Math.abs(nz - targetOffset[2]) > 0.004
          ) {
            curPos.set(nx, ny, nz);
            stillMoving = true;
          } else {
            curPos.set(targetOffset[0], targetOffset[1], targetOffset[2]);
          }
          entry.group.position.copy(curPos);

          // Sync table contact shadow with table motion
          if (part.id === 'patient-table') {
            mriRig.tableShadowMesh.position.set(curPos.x, 0.016, 1.72 + curPos.z);
          }

          // Visual policy (visibility, cutaway, xray, isolation)
          const policy = resolvePartVisualPolicy(part, {
            hiddenIds: s.hiddenIds,
            isolatedId: s.isolatedPartId,
            viewMode: s.viewMode,
          });

          const curOp = partCurrentOpacities[part.id];
          const nextOp = THREE.MathUtils.damp(curOp, policy.opacity, dampLambda, dt);
          if (Math.abs(nextOp - policy.opacity) > 0.01) {
            partCurrentOpacities[part.id] = nextOp;
            stillMoving = true;
          } else {
            partCurrentOpacities[part.id] = policy.opacity;
          }

          const finalOp = partCurrentOpacities[part.id];
          entry.group.visible = policy.visible && finalOp > 0.01;

          const isSelected = s.selectedPartId === part.id;
          const isHovered = hoveredPartId === part.id && !isSelected;

          // Subtle micro-detail locator ring when selected (hidden during close-up so detail is 100% crisp)
          entry.microBeacon.visible = isSelected && !s.microZoomActive && entry.group.visible;
          if (entry.microBeacon.material instanceof THREE.MeshBasicMaterial) {
            entry.microBeacon.material.opacity = 0.7;
          }

          for (const rec of entry.materials) {
            const m = rec.material;
            const targetMatOpacity = rec.baseOpacity * finalOp;
            const shouldBeTransparent = rec.baseTransparent || finalOp < 0.98;
            if (m.transparent !== shouldBeTransparent) {
              m.transparent = shouldBeTransparent;
              m.needsUpdate = true;
            }
            m.opacity = targetMatOpacity;
            m.depthWrite = shouldBeTransparent ? false : rec.baseDepthWrite;

            // Keep metallic copper & stainless tones authentic — only a very gentle highlight lift
            if (isSelected && !s.microZoomActive) {
              m.emissive.setHex(0x1d4ed8);
              m.emissiveIntensity = Math.max(rec.baseEmissiveIntensity, 0.08);
            } else if (isHovered) {
              m.emissive.setHex(0x0284c7);
              m.emissiveIntensity = Math.max(rec.baseEmissiveIntensity, 0.06);
            } else {
              m.emissive.setHex(rec.baseEmissiveHex);
              m.emissiveIntensity = rec.baseEmissiveIntensity;
            }
          }
        }

        // 2. Smooth scripted camera flight (cancelled automatically on manual OrbitControls input)
        if (camFlightActive) {
          const camLambda = isSoftwareGl ? 24 : 7.5;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, camGoalPos.x, camLambda, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, camGoalPos.y, camLambda, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, camGoalPos.z, camLambda, dt);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, camGoalTarget.x, camLambda, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, camGoalTarget.y, camLambda, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, camGoalTarget.z, camLambda, dt);

          const posErr = camera.position.distanceTo(camGoalPos);
          const tgtErr = controls.target.distanceTo(camGoalTarget);
          if (posErr > 0.012 || tgtErr > 0.012) {
            stillMoving = true;
          } else {
            camera.position.copy(camGoalPos);
            controls.target.copy(camGoalTarget);
            camFlightActive = false;
          }
        }

        controls.update();

        // Throttled zoom distance readout update (<= 8 Hz)
        const now = performance.now();
        if (s.onCameraZoomChange && now - lastZoomReportTime > 120) {
          lastZoomReportTime = now;
          s.onCameraZoomChange(camera.position.distanceTo(controls.target));
        }

        return stillMoving;
      }

      function requestRender() {
        if (disposed) return;
        if (renderBusy) {
          renderDirty = true;
          return;
        }
        renderBusy = true;
        frameId = requestAnimationFrame(() => {
          if (disposed) return;
          renderDirty = false;
          const now = performance.now();
          const maxDt = isSoftwareGl ? 0.55 : 0.08;
          const dt = Math.max(0.016, Math.min((now - lastFrameTime) / 1000, maxDt));
          lastFrameTime = now;

          const needsMore = stepScene(dt);
          renderer.render(scene, camera);
          updatePinOverlays();

          const done = () => {
            if (disposed) return;
            renderBusy = false;
            if (renderDirty || needsMore) {
              requestRender();
            }
          };

          if (isSoftwareGl) {
            afterDraw(done);
          } else {
            done();
          }
        });
      }

      // Cancel scripted camera flight as soon as user drags/pinches
      const onControlsStart = () => {
        camFlightActive = false;
      };
      const onControlsChange = () => {
        requestRender();
      };
      controls.addEventListener('start', onControlsStart);
      controls.addEventListener('change', onControlsChange);

      // Expose imperative methods
      controllerRef.current = {
        requestRender,
        flyTo(pos, target, _isMicro) {
          camGoalPos.set(pos[0], pos[1], pos[2]);
          camGoalTarget.set(target[0], target[1], target[2]);
          camFlightActive = true;
          requestRender();
        },
        zoomBy(factor: number) {
          camFlightActive = false;
          _vecA.subVectors(camera.position, controls.target);
          const curDist = _vecA.length();
          const nextDist = clampZoomDistance(curDist * factor, true);
          _vecA.normalize().multiplyScalar(nextDist);
          camera.position.copy(controls.target).add(_vecA);
          controls.update();
          requestRender();
        },
        resetCamera() {
          const w = container.clientWidth || window.innerWidth;
          const h = container.clientHeight || window.innerHeight;
          const portrait = w / h < 0.85;
          camGoalPos.copy(portrait ? MOBILE_CAM_POS : DEFAULT_CAM_POS);
          camGoalTarget.copy(portrait ? MOBILE_CAM_TARGET : DEFAULT_CAM_TARGET);
          camFlightActive = true;
          requestRender();
        },
      };

      // Raycasting for tap-to-select, double-tap micro-zoom, and throttled hover
      const raycaster = new THREE.Raycaster();
      let pointerDownX = 0;
      let pointerDownY = 0;
      let lastTapTime = 0;
      let lastTapPart: MriPartId | null = null;
      let lastHoverCheck = 0;

      function pickPartAt(clientX: number, clientY: number): MriPartId | null {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        _rayNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        _rayNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(_rayNdc, camera);

        const s = stateRef.current;
        const hits = raycaster.intersectObjects(mriRig.interactables, false);
        for (const hit of hits) {
          const partId = hit.object.userData.partId as MriPartId | undefined;
          if (!partId) continue;
          const partMeta = MRI_PART_MAP[partId];
          const policy = resolvePartVisualPolicy(partMeta, {
            hiddenIds: s.hiddenIds,
            isolatedId: s.isolatedPartId,
            viewMode: s.viewMode,
          });
          if (policy.visible && policy.interactive) {
            return partId;
          }
        }
        return null;
      }

      const onPointerDown = (e: PointerEvent) => {
        pointerDownX = e.clientX;
        pointerDownY = e.clientY;
      };

      const onPointerUp = (e: PointerEvent) => {
        const moved = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
        if (moved > 8) return; // Was an orbit/pan drag, not a tap

        const picked = pickPartAt(e.clientX, e.clientY);
        const now = performance.now();
        const isDoubleTap = picked !== null && picked === lastTapPart && now - lastTapTime < 380;
        lastTapTime = now;
        lastTapPart = picked;

        stateRef.current.onSelectPart(picked, isDoubleTap);
        requestRender();
      };

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        const now = performance.now();
        if (now - lastHoverCheck < 75) return;
        lastHoverCheck = now;

        const picked = pickPartAt(e.clientX, e.clientY);
        if (picked !== hoveredPartId) {
          hoveredPartId = picked;
          renderer.domElement.style.cursor = picked ? 'pointer' : 'grab';
          requestRender();
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('pointermove', onPointerMove);

      // ResizeObserver keeps viewport razor-sharp across desktop & mobile rotations
      const handleResize = () => {
        if (!container || disposed) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        const portrait = w / h < 0.85;
        camera.fov = portrait ? 46 : 40;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        // If no part is focused, re-center nicely for portrait vs landscape switch
        if (!stateRef.current.selectedPartId && !camFlightActive) {
          camera.position.copy(portrait ? MOBILE_CAM_POS : DEFAULT_CAM_POS);
          controls.target.copy(portrait ? MOBILE_CAM_TARGET : DEFAULT_CAM_TARGET);
          controls.update();
        }
        requestRender();
      };
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // WebGL context loss safety
      const onContextLost = (e: Event) => {
        e.preventDefault();
        setWebglUnavailable(true);
      };
      const onContextRestored = () => {
        setWebglUnavailable(false);
        requestRender();
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      // Initial render
      requestRender();

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        controllerRef.current = null;
        resizeObserver.disconnect();
        controls.removeEventListener('start', onControlsStart);
        controls.removeEventListener('change', onControlsChange);
        controls.dispose();

        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

        mriRig.dispose();
        materials.dispose();
        textures.dispose();
        envRT.dispose();
        renderer.dispose();
      };
    }, []);

    return (
      <div
        className="relative w-full h-full overflow-hidden bg-[#e6eef8] select-none"
        data-testid="mri-viewport"
        data-selected-part={props.selectedPartId ?? 'none'}
        data-explode={Math.round(props.explode * 100)}
        data-view-mode={props.viewMode}
        data-micro-zoom={props.microZoomActive ? 'true' : 'false'}
        data-detached-count={props.detachedIds.size}
      >
        {/* Dedicated empty WebGL canvas mount — sibling HUD overlays never live inside this ref */}
        <div ref={mountRef} className="w-full h-full" />

        {/* Graceful fallback when WebGL context is unavailable */}
        {webglUnavailable && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#e6eef8] p-6 text-center">
            <img
              src="/assets/aistudio/image_6d10f934.png"
              alt="Pratinjau Mesin MRI 3.0T"
              className="max-w-md w-full rounded-xl shadow-md mb-4 border border-slate-200"
            />
            <h2 className="text-lg font-semibold text-slate-900">
              Pratinjau 3D WebGL Tidak Tersedia
            </h2>
            <p className="text-sm text-slate-600 max-w-sm mt-1">
              Peramban Anda sementara menghentikan konteks grafis 3D. Muat ulang halaman untuk mengaktifkan kembali tampilan interaktif.
            </p>
          </div>
        )}

        {/* Interactive 3D projected anatomy pin buttons (positioned via DOM refs on render) */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden z-10"
          aria-label="Penanda Anatomi 3D"
        >
          {MRI_PARTS.map((part) => {
            const isSelected = props.selectedPartId === part.id;
            const layer = MRI_LAYER_MAP[part.layerId];
            return (
              <button
                key={part.id}
                ref={(el) => {
                  pinButtonRefs.current[part.id] = el;
                }}
                type="button"
                onClick={() => props.onSelectPart(part.id, false)}
                aria-label={`Pilih ${part.name}`}
                style={{ opacity: 0, pointerEvents: 'none' }}
                className={`absolute top-0 left-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-700 text-white border border-blue-800 z-20'
                    : 'bg-white/95 text-slate-800 border border-slate-300/90 hover:bg-blue-50 hover:border-blue-400'
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? '#ffffff' : layer.color }}
                  aria-hidden="true"
                />
                <span className="font-mono text-[11px] tabular-nums">{part.code}</span>
                <span className="hidden sm:inline max-w-[140px] truncate">{part.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);
