import * as THREE from 'three';

export interface MriTextureBundle {
  touchscreenLeft: THREE.CanvasTexture;
  touchscreenRight: THREE.CanvasTexture;
  sideEmblem: THREE.CanvasTexture;
  copperWindingMap: THREE.CanvasTexture;
  copperWindingBump: THREE.CanvasTexture;
  gradientTraceMap: THREE.CanvasTexture;
  gradientTraceBump: THREE.CanvasTexture;
  brushedMetalBump: THREE.CanvasTexture;
  mliFoilMap: THREE.CanvasTexture;
  mliFoilBump: THREE.CanvasTexture;
  pcbLnaMap: THREE.CanvasTexture;
  heliumGaugeMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  clinicalFloorMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function finalizeDataTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function createTouchscreenCanvas(side: 'left' | 'right'): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(512, 340);

  // Soft clinical screen background
  const grad = ctx.createLinearGradient(0, 0, 0, 340);
  grad.addColorStop(0, '#f4f9ff');
  grad.addColorStop(1, '#e1eefb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 340);

  // Top clinical header bar
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 512, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 18px sans-serif';
  ctx.fillText(side === 'left' ? 'ISOCENTER 3.0T' : 'TABLE & COIL', 20, 30);
  ctx.fillStyle = '#93c5fd';
  ctx.font = '500 15px monospace';
  ctx.fillText('4.2 K  OK', 392, 29);

  // Left control tile grid
  const tiles =
    side === 'left'
      ? [
          { x: 22, y: 68, w: 140, h: 108, title: 'POSISI Z', val: '0.0 mm', accent: '#2563eb' },
          { x: 178, y: 68, w: 140, h: 108, title: 'LASER', val: 'SIAGA', accent: '#0284c7' },
          { x: 334, y: 68, w: 156, h: 108, title: 'BORE LED', val: '85%', accent: '#0ea5e9' },
          { x: 22, y: 194, w: 224, h: 118, title: 'VENTILASI BORE', val: 'LEVEL 2', accent: '#0d9488' },
          { x: 262, y: 194, w: 228, h: 118, title: 'HEAD COIL 32CH', val: 'TERPASANG', accent: '#1d4ed8' },
        ]
      : [
          { x: 22, y: 68, w: 224, h: 110, title: 'MEJA PASIEN', val: '88.0 cm', accent: '#1d4ed8' },
          { x: 262, y: 68, w: 228, h: 110, title: 'MEDAN B0', val: '3.000 T', accent: '#0284c7' },
          { x: 22, y: 196, w: 468, h: 116, title: 'RF BODY COIL 127.74 MHz', val: 'RESONANSI OPTIMAL', accent: '#0f766e' },
        ];

  for (const t of tiles) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(t.x, t.y, t.w, t.h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = t.accent;
    ctx.fillRect(t.x + 14, t.y + 16, 36, 4);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px sans-serif';
    ctx.fillText(t.title, t.x + 14, t.y + 42);

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px monospace';
    ctx.fillText(t.val, t.x + 14, t.y + 82);
  }

  return canvas;
}

function createSideEmblemCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(128, 384);
  const grad = ctx.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, '#2a43a5');
  grad.addColorStop(1, '#1c2f7a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 384);

  // Clean subtle vertical medical model stripe
  ctx.save();
  ctx.translate(64, 192);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '600 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('3.0T WIDE-BORE', 0, 8);
  ctx.restore();

  // Thin crisp silver top/bottom accent lines
  ctx.fillStyle = 'rgba(191, 219, 254, 0.7)';
  ctx.fillRect(16, 18, 96, 3);
  ctx.fillRect(16, 363, 96, 3);
  return canvas;
}

function createCopperWindingCanvases(): { map: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const [mapCanvas, mctx] = makeCanvas(512, 512);
  const [bumpCanvas, bctx] = makeCanvas(512, 512);

  mctx.fillStyle = '#9a4f23';
  mctx.fillRect(0, 0, 512, 512);
  bctx.fillStyle = '#505050';
  bctx.fillRect(0, 0, 512, 512);

  const strands = 64;
  const h = 512 / strands;
  for (let i = 0; i < strands; i++) {
    const y = i * h;
    const toneShift = (i % 4) * 5;
    const grad = mctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0.0, `rgb(${115 + toneShift}, ${56 + toneShift}, 22)`);
    grad.addColorStop(0.35, `rgb(${224 + toneShift}, ${138 + toneShift}, 72)`);
    grad.addColorStop(0.65, `rgb(${188 + toneShift}, ${98 + toneShift}, 42)`);
    grad.addColorStop(1.0, `rgb(${95 + toneShift}, ${44 + toneShift}, 18)`);
    mctx.fillStyle = grad;
    mctx.fillRect(0, y, 512, h);

    const bgrad = bctx.createLinearGradient(0, y, 0, y + h);
    bgrad.addColorStop(0.0, '#181818');
    bgrad.addColorStop(0.5, '#f2f2f2');
    bgrad.addColorStop(1.0, '#181818');
    bctx.fillStyle = bgrad;
    bctx.fillRect(0, y, 512, h);
  }

  // Add subtle cross-lacing fiberglass tension bands
  mctx.fillStyle = 'rgba(232, 224, 200, 0.22)';
  for (let x = 0; x < 512; x += 128) {
    mctx.fillRect(x, 0, 14, 512);
  }

  return { map: mapCanvas, bump: bumpCanvas };
}

function createGradientTraceCanvases(): { map: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const [mapCanvas, mctx] = makeCanvas(1024, 512);
  const [bumpCanvas, bctx] = makeCanvas(1024, 512);

  // Amber/cream fiberglass epoxy potting base
  mctx.fillStyle = '#c8b48e';
  mctx.fillRect(0, 0, 1024, 512);
  bctx.fillStyle = '#707070';
  bctx.fillRect(0, 0, 1024, 512);

  // Draw 4 iconic Golay "fingerprint" saddle coil spiral patterns
  const centers = [
    { cx: 128, cy: 140 },
    { cx: 384, cy: 140 },
    { cx: 640, cy: 140 },
    { cx: 896, cy: 140 },
    { cx: 128, cy: 372 },
    { cx: 384, cy: 372 },
    { cx: 640, cy: 372 },
    { cx: 896, cy: 372 },
  ];

  for (const { cx, cy } of centers) {
    for (let ring = 1; ring <= 9; ring++) {
      const rx = ring * 11.5;
      const ry = ring * 9.5;
      mctx.strokeStyle = ring % 2 === 0 ? '#b45d28' : '#d27c3d';
      mctx.lineWidth = 4.2;
      mctx.beginPath();
      mctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      mctx.stroke();

      bctx.strokeStyle = '#e5e5e5';
      bctx.lineWidth = 4.2;
      bctx.beginPath();
      bctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      bctx.stroke();
    }
  }

  // Horizontal Maxwell Z-axis copper bands along center divider
  for (let y = 240; y <= 272; y += 8) {
    mctx.strokeStyle = '#9c4c1e';
    mctx.lineWidth = 3;
    mctx.beginPath();
    mctx.moveTo(0, y);
    mctx.lineTo(1024, y);
    mctx.stroke();

    bctx.strokeStyle = '#ffffff';
    bctx.lineWidth = 3;
    bctx.beginPath();
    bctx.moveTo(0, y);
    bctx.lineTo(1024, y);
    bctx.stroke();
  }

  // Subtle resin glass-fiber weave overlay
  mctx.strokeStyle = 'rgba(255, 250, 238, 0.14)';
  mctx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 16) {
    mctx.beginPath();
    mctx.moveTo(x, 0);
    mctx.lineTo(x, 512);
    mctx.stroke();
  }

  return { map: mapCanvas, bump: bumpCanvas };
}

function createBrushedMetalBumpCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  // Deterministic pseudo-random brushed lines
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 1600; i++) {
    const y = Math.floor(rand() * 512);
    const v = 96 + Math.floor(rand() * 68);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 512, 1 + Math.floor(rand() * 2));
  }
  return canvas;
}

function createMliFoilCanvases(): { map: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const [mapCanvas, mctx] = makeCanvas(512, 512);
  const [bumpCanvas, bctx] = makeCanvas(512, 512);

  mctx.fillStyle = '#d4b468';
  mctx.fillRect(0, 0, 512, 512);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 512, 512);

  let seed = 4201;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 240; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const s = 18 + rand() * 44;
    const bright = 165 + Math.floor(rand() * 75);
    mctx.fillStyle = `rgba(${bright}, ${Math.floor(bright * 0.84)}, ${Math.floor(bright * 0.44)}, 0.45)`;
    mctx.beginPath();
    mctx.moveTo(x, y);
    mctx.lineTo(x + s, y + (rand() - 0.5) * s);
    mctx.lineTo(x + (rand() - 0.5) * s, y + s);
    mctx.closePath();
    mctx.fill();

    const bv = 40 + Math.floor(rand() * 195);
    bctx.fillStyle = `rgba(${bv},${bv},${bv},0.55)`;
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x + s, y + (rand() - 0.5) * s);
    bctx.lineTo(x + (rand() - 0.5) * s, y + s);
    bctx.closePath();
    bctx.fill();
  }

  return { map: mapCanvas, bump: bumpCanvas };
}

function createPcbLnaCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#0d4a34';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle solder mask grid
  ctx.strokeStyle = 'rgba(22, 163, 74, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Gold RF microstrip traces
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 5;
  for (let row = 64; row <= 448; row += 96) {
    ctx.beginPath();
    ctx.moveTo(24, row);
    ctx.lineTo(140, row);
    ctx.lineTo(180, row - 28);
    ctx.lineTo(340, row - 28);
    ctx.lineTo(380, row);
    ctx.lineTo(488, row);
    ctx.stroke();

    // IC chip packages
    ctx.fillStyle = '#18181b';
    ctx.fillRect(210, row - 52, 76, 48);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '600 13px monospace';
    ctx.fillText('LNA-3T', 222, row - 23);

    // Gold contact pads
    ctx.fillStyle = '#facc15';
    for (let p = 0; p < 5; p++) {
      ctx.fillRect(216 + p * 14, row - 58, 7, 6);
      ctx.fillRect(216 + p * 14, row - 4, 7, 6);
    }
  }

  // White silkscreen markings
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 18px monospace';
  ctx.fillText('32CH RF PRE-AMP 127.7MHz', 28, 36);
  ctx.fillText('REV 4.2 NON-MAG', 320, 490);

  return canvas;
}

function createHeliumGaugeCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  // Outer dial ring
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.stroke();

  // Green safe arc & red burst arc
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(128, 128, 92, Math.PI * 0.78, Math.PI * 1.65);
  ctx.stroke();

  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(128, 128, 92, Math.PI * 1.72, Math.PI * 2.22);
  ctx.stroke();

  // Tick marks
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.75 + (i / 12) * Math.PI * 1.5;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = i % 3 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76);
    ctx.lineTo(128 + Math.cos(a) * 102, 128 + Math.sin(a) * 102);
    ctx.stroke();
  }

  // Text
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('He BAR', 128, 176);
  ctx.font = '600 15px monospace';
  ctx.fillStyle = '#0284c7';
  ctx.fillText('4.2 K', 128, 198);

  // Needle pointing to ~1.05 bar
  const needleAngle = Math.PI * 1.24;
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(needleAngle) * 78, 128 + Math.sin(needleAngle) * 78);
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(128, 128, 10, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

function createContactShadowCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(512, 512);
  const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 248);
  grad.addColorStop(0.0, 'rgba(30, 48, 84, 0.42)');
  grad.addColorStop(0.48, 'rgba(30, 48, 84, 0.24)');
  grad.addColorStop(0.8, 'rgba(30, 48, 84, 0.06)');
  grad.addColorStop(1.0, 'rgba(30, 48, 84, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  return canvas;
}

function createClinicalFloorCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#cbd7e6';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle architectural seamless clinical tile grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 510, 510);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Soft vinyl micro-speckles (deterministic)
  let seed = 9001;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 650; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.28)' : 'rgba(100,116,139,0.14)';
    ctx.fillRect(x, y, 2, 2);
  }
  return canvas;
}

export function createMriTextures(anisotropy: number): MriTextureBundle {
  const copper = createCopperWindingCanvases();
  const gradient = createGradientTraceCanvases();
  const mli = createMliFoilCanvases();

  const bundle: MriTextureBundle = {
    touchscreenLeft: finalizeColorTexture(createTouchscreenCanvas('left'), anisotropy),
    touchscreenRight: finalizeColorTexture(createTouchscreenCanvas('right'), anisotropy),
    sideEmblem: finalizeColorTexture(createSideEmblemCanvas(), anisotropy),
    copperWindingMap: finalizeColorTexture(copper.map, anisotropy, 4, 2),
    copperWindingBump: finalizeDataTexture(copper.bump, anisotropy, 4, 2),
    gradientTraceMap: finalizeColorTexture(gradient.map, anisotropy, 2, 1),
    gradientTraceBump: finalizeDataTexture(gradient.bump, anisotropy, 2, 1),
    brushedMetalBump: finalizeDataTexture(createBrushedMetalBumpCanvas(), anisotropy, 3, 2),
    mliFoilMap: finalizeColorTexture(mli.map, anisotropy, 3, 2),
    mliFoilBump: finalizeDataTexture(mli.bump, anisotropy, 3, 2),
    pcbLnaMap: finalizeColorTexture(createPcbLnaCanvas(), anisotropy),
    heliumGaugeMap: finalizeColorTexture(createHeliumGaugeCanvas(), anisotropy),
    contactShadowMap: finalizeColorTexture(createContactShadowCanvas(), anisotropy),
    clinicalFloorMap: finalizeColorTexture(createClinicalFloorCanvas(), anisotropy, 14, 14),
    dispose: () => {
      bundle.touchscreenLeft.dispose();
      bundle.touchscreenRight.dispose();
      bundle.sideEmblem.dispose();
      bundle.copperWindingMap.dispose();
      bundle.copperWindingBump.dispose();
      bundle.gradientTraceMap.dispose();
      bundle.gradientTraceBump.dispose();
      bundle.brushedMetalBump.dispose();
      bundle.mliFoilMap.dispose();
      bundle.mliFoilBump.dispose();
      bundle.pcbLnaMap.dispose();
      bundle.heliumGaugeMap.dispose();
      bundle.contactShadowMap.dispose();
      bundle.clinicalFloorMap.dispose();
    },
  };

  return bundle;
}
