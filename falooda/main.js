// Kulfi Falooda, taken apart: a scroll-driven Three.js scene.
// One GSAP timeline (scrubbed by ScrollTrigger) tweens the plain `state` object;
// the render loop reads `state` every frame. Nothing else drives the scene.
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const canvas = document.querySelector('.stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = matchMedia('(max-width: 760px)').matches;
const lowPower = narrow || (navigator.hardwareConcurrency || 8) <= 4;

// Particle budgets per device class.
const Q = lowPower
  ? { dpr: 1.5, sev: 80, sabja: 110, drops: 18, pista: 26, tube: 160, radial: 12, shadows: false, glass: 'simple' }
  : { dpr: 2, sev: 170, sabja: 240, drops: 34, pista: 44, tube: 260, radial: 16, shadows: true, glass: 'physical' };

// ---------- Renderer ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no-webgl', 'is-ready');
  document.querySelector('.fallback').hidden = false;
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = Q.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const STUDIO = new THREE.Color('#120A0D');
const scene = new THREE.Scene();
scene.background = STUDIO;
scene.fog = new THREE.Fog(STUDIO, 12, 26);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
const camTarget = new THREE.Vector3();

// ---------- Studio: backdrop glow, floor, lights ----------
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(70, 34),
  new THREE.ShaderMaterial({
    fog: false, depthWrite: false,
    uniforms: { cA: { value: STUDIO }, cB: { value: new THREE.Color('#4A1526') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 cA; uniform vec3 cB;
      void main(){ vec2 p = (vUv - vec2(.5,.56)) * vec2(1.6,1.); float g = smoothstep(.62, 0., length(p));
      gl_FragColor = vec4(mix(cA, cB, g*g*.85), 1.);
      #include <colorspace_fragment>
      }`,
  }),
);
backdrop.position.set(0, 3, -14);
scene.add(backdrop);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(16, 72),
  new THREE.MeshStandardMaterial({ color: '#3A1220', roughness: 0.62, metalness: 0.05, envMapIntensity: 0.2 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

scene.add(new THREE.HemisphereLight('#ffe9d6', '#2a0f18', 0.35));
const key = new THREE.SpotLight('#fff1e0', 160, 0, 0.42, 0.65, 2);
key.position.set(1.5, 8.5, 4.5);
key.target.position.set(0, 1.2, 0);
key.castShadow = Q.shadows;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0004;
key.shadow.radius = 6;
scene.add(key, key.target);
const rim = new THREE.SpotLight('#ff5d85', 90, 0, 0.45, 0.8, 2);
rim.position.set(-4, 5, -5);
rim.target.position.set(0, 2.6, 0); // aimed high so it rims the cup instead of pooling on the floor
scene.add(rim, rim.target);
const fill = new THREE.PointLight('#ffcf8a', 5, 7, 2);
fill.position.set(3.2, 3, 3);
scene.add(fill);

// ---------- Textures ----------
const rand = mulberry32(7);

function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Cup contents, painted top-to-bottom to match the layered falooda photo:
// rose jelly, pistachio-flecked rabri, fruit band, golden sev, rose-soaked sev.
function paintLayers(g, w, h) {
  const band = (y0, y1, a, b) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, y0, w, y1 - y0); };
  band(0, 80, '#E2416A', '#C61F48');
  band(80, 130, '#C9536A', '#D8C2A0');
  band(130, 640, '#DCC9A6', '#CDB48A');
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,248,235,${rand() * .25})`; g.fillRect(rand() * w, 130 + rand() * 510, 2, 2); }
  for (let i = 0; i < 90; i++) speck(g, rand() * w, 150 + rand() * 470, '#8DB255', 5 + rand() * 6, 2.2);
  for (let i = 0; i < 110; i++) speck(g, rand() * w, 150 + rand() * 470, '#4A2A1E', 3 + rand() * 6, 2.6);
  band(640, 720, '#B88B52', '#9F7038');
  for (let i = 0; i < 40; i++) { g.fillStyle = ['#7A3A1E', '#D7B064', '#A8552E', '#E0C27F'][i % 4]; g.beginPath(); g.ellipse(rand() * w, 650 + rand() * 60, 10 + rand() * 18, 7 + rand() * 10, rand() * 3, 0, 7); g.fill(); }
  band(720, 880, '#C99C55', '#B9884A');
  noodles(g, w, 720, 880, ['#F0D79B', '#E3C27E', '#D7AE66']);
  band(880, h, '#D35B7A', '#B93A5C');
  noodles(g, w, 880, h, ['#F6B3C3', '#EE93A9', '#E27C96']);
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, w, h);
  // syrup drip running down the inside of the cup
  g.strokeStyle = '#6E0C20'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(w * .14, 70); g.bezierCurveTo(w * .15, 200, w * .13, 330, w * .145, 470); g.stroke();
}
function speck(g, x, y, c, len, wid) { g.save(); g.translate(x, y); g.rotate(rand() * Math.PI); g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, len, wid, 0, 0, 7); g.fill(); g.restore(); }
function noodles(g, w, y0, y1, colors) {
  g.lineWidth = 2.2;
  for (let i = 0; i < 420; i++) {
    g.strokeStyle = colors[i % colors.length];
    const x = rand() * w, y = y0 + rand() * (y1 - y0), r = 14 + rand() * 26;
    g.beginPath(); g.arc(x, y, r, rand() * 6, rand() * 6 + 1.6 + rand() * 2); g.stroke();
  }
}

const layersTex = canvasTexture(512, 1024, paintLayers);
// To use a real photo of the cup's layers instead of the painting, set
// data-layers="textures/falooda-layers.jpg" on the canvas (a straight-on crop of the cup body).
if (canvas.dataset.layers) new THREE.TextureLoader().load(canvas.dataset.layers, (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.MirroredRepeatWrapping;
  t.repeat.set(2, 1);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  contentsMat.map = t; contentsMat.needsUpdate = true;
}, undefined, () => {});

const strawTex = canvasTexture(64, 256, (g, w, h) => {
  g.fillStyle = '#FBF7F2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#D7263D';
  for (let y = -h; y < h * 2; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 40); g.lineTo(w, y + 72); g.lineTo(0, y + 32); g.fill(); }
});
strawTex.wrapS = strawTex.wrapT = THREE.RepeatWrapping;
strawTex.repeat.set(1, 5);

const kulfiTex = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#EADBB8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,250,236,${rand() * .5})`; g.fillRect(rand() * w, rand() * h, 2, 2); }
  for (let i = 0; i < 40; i++) speck(g, rand() * w, rand() * h, '#9DBB5C', 4 + rand() * 4, 1.8);
});

// ---------- The cup ----------
const H = 2.4, R0 = 0.6, R1 = 0.86;
const glassMat = Q.glass === 'physical'
  ? new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.06, ior: 1.46, transparent: true, side: THREE.DoubleSide, envMapIntensity: 1.1, specularIntensity: 1 })
  : new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, side: THREE.DoubleSide, envMapIntensity: 1.4, depthWrite: false });

const cup = new THREE.Group();
scene.add(cup);
const shell = new THREE.Mesh(new THREE.LatheGeometry([
  new THREE.Vector2(0, 0), new THREE.Vector2(R0 - 0.04, 0), new THREE.Vector2(R0, 0.04),
  new THREE.Vector2(R1, H), new THREE.Vector2(R1 + 0.04, H + 0.02),
], 72), glassMat);
shell.renderOrder = 2;
cup.add(shell);
const rimRing = new THREE.Mesh(new THREE.TorusGeometry(R1 + 0.035, 0.022, 10, 72), glassMat);
rimRing.rotation.x = Math.PI / 2;
rimRing.position.y = H + 0.02;
cup.add(rimRing);

// Contents: a textured cylinder that drains (scales down from its base) as it pours.
const CH = H - 0.22;
const contentsMat = new THREE.MeshPhysicalMaterial({ map: layersTex, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.5 });
const contentsGeo = new THREE.CylinderGeometry(R0 + (R1 - R0) * (CH / H) - 0.025, R0 - 0.03, CH, 72, 1);
contentsGeo.translate(0, CH / 2 + 0.03, 0);
const CAP_FULL = new THREE.Color('#D63A60'), CAP_SEV = new THREE.Color('#C98E86');
const capMat = new THREE.MeshPhysicalMaterial({ color: CAP_FULL.clone(), roughness: 0.3, clearcoat: 1, envMapIntensity: 0.8 });
const contents = new THREE.Mesh(contentsGeo, [
  contentsMat,
  capMat,
  new THREE.MeshStandardMaterial({ color: '#B93A5C' }),
]);
contents.castShadow = true;
cup.add(contents);

// Lid and straw leave together.
const lid = new THREE.Group();
scene.add(lid);
const dome = new THREE.Mesh(new THREE.SphereGeometry(0.92, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
dome.scale.y = 0.95;
const lidRing = new THREE.Mesh(new THREE.CylinderGeometry(R1 + 0.1, R1 + 0.1, 0.07, 72, 1, true), glassMat);
lid.add(dome, lidRing);
const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 20, 1, true), new THREE.MeshStandardMaterial({ map: strawTex, roughness: 0.35, side: THREE.DoubleSide }));
straw.position.set(0.18, 0.55, 0.05);
straw.rotation.z = -0.2;
straw.castShadow = true;
lid.add(straw);
const LID_REST = new THREE.Vector3(0, H + 0.05, 0);

// ---------- Kulfi: six wedges with cut faces, plus pistachio slivers ----------
const kulfi = new THREE.Group();
scene.add(kulfi);
const KR = 0.56, WEDGES = 6;
const kulfiOuter = new THREE.MeshPhysicalMaterial({ map: kulfiTex, color: '#F0DDB4', roughness: 0.6, clearcoat: 0.3, sheen: 0.4, sheenColor: new THREE.Color('#fff4dc') });
const kulfiInner = new THREE.MeshStandardMaterial({ color: '#E2CFA6', roughness: 0.85, side: THREE.DoubleSide });
const wedges = [];
for (let i = 0; i < WEDGES; i++) {
  const phi = (i / WEDGES) * Math.PI * 2, len = (Math.PI * 2) / WEDGES;
  const w = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.SphereGeometry(KR, 20, 18, phi, len), kulfiOuter);
  w.add(skin);
  for (const a of [phi, phi + len]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(KR, 18, -Math.PI / 2, Math.PI), kulfiInner);
    face.rotation.y = Math.PI + a;
    w.add(face);
  }
  w.traverse((m) => { m.castShadow = true; });
  const mid = phi + len / 2;
  w.userData.dir = new THREE.Vector3(-Math.cos(mid), 0, Math.sin(mid));
  w.userData.lift = (i % 2 ? 0.28 : -0.12);
  kulfi.add(w);
  wedges.push(w);
}
kulfi.scale.set(1, 0.82, 1);

const pista = new THREE.InstancedMesh(
  new THREE.SphereGeometry(1, 10, 8),
  new THREE.MeshPhysicalMaterial({ color: '#86AE4C', roughness: 0.45, clearcoat: 0.4 }),
  Q.pista,
);
pista.castShadow = true;
const pistaData = [];
for (let i = 0; i < Q.pista; i++) {
  const th = rand() * Math.PI * 2, el = 0.35 + rand() * 0.9;
  const rest = new THREE.Vector3(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el)).multiplyScalar(KR * 1.02);
  const ring = 1.25 + rand() * 0.9, ang = (i / Q.pista) * Math.PI * 2 + rand() * 0.3;
  const out = new THREE.Vector3(Math.cos(ang) * ring, (rand() - 0.4) * 1.1, Math.sin(ang) * ring);
  pista.setColorAt(i, new THREE.Color().setHSL(0.24 + rand() * 0.05, 0.45, 0.38 + rand() * 0.14));
  pistaData.push({ rest, out, spin: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6), s: 0.045 + rand() * 0.03, ph: rand() * 6 });
}
kulfi.add(pista);

// ---------- Fluids: tapered tubes revealed head-to-tail in the shader ----------
const fluids = [];
function makeFluid(name, color, radius, points, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const geo = new THREE.TubeGeometry(curve, Q.tube, radius, Q.radial, false);
  const pos = geo.attributes.position, rad = new Float32Array(pos.count), P = new THREE.Vector3(), v = new THREE.Vector3();
  const phase = rand() * 6;
  for (let i = 0; i <= Q.tube; i++) {
    const u = i / Q.tube;
    curve.getPointAt(u, P);
    const taper = (1 - 0.55 * u) * (1 + 0.28 * Math.sin(u * 17 + phase)) * Math.min(1, 0.55 + u * 9);
    for (let j = 0; j <= Q.radial; j++) {
      const k = i * (Q.radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(P).multiplyScalar(taper).add(P);
      pos.setXYZ(k, v.x, v.y, v.z);
      rad[k] = radius * taper;
    }
  }
  geo.setAttribute('aRad', new THREE.BufferAttribute(rad, 1));
  geo.computeVertexNormals();
  const uniforms = { uHead: { value: 0 }, uTail: { value: 0 }, uTime: { value: 0 }, uPhase: { value: phase } };
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: opts.roughness ?? 0.18, clearcoat: 1, clearcoatRoughness: 0.08, sheen: opts.sheen ?? 0.3, sheenColor: new THREE.Color('#ffffff'), transmission: opts.transmission ?? 0, thickness: 0.4, envMapIntensity: 0.9 });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = 'attribute float aRad; varying float vU; uniform float uHead, uTail, uTime, uPhase;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vU = uv.x;
      float pinch = max(smoothstep(uHead - .04, uHead, uv.x), 1. - smoothstep(uTail, uTail + .04, uv.x));
      transformed -= objectNormal * aRad * pinch * .96;
      transformed += objectNormal * aRad * .22 * sin(uv.x * 46. - uTime * 3.1 + uPhase + uv.y * 6.283);`);
    s.fragmentShader = 'varying float vU; uniform float uHead, uTail;\n' + s.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (vU > uHead || vU < uTail) discard;');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Splash droplets that ride the advancing head.
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), mat.clone(), Q.drops);
  drops.material.onBeforeCompile = () => {};
  drops.frustumCulled = false;
  scene.add(drops);
  const dropData = Array.from({ length: Q.drops }, () => ({
    back: rand(), dir: new THREE.Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).normalize(), spread: 0.2 + rand() * 0.9, s: radius * (0.1 + rand() * 0.32), ph: rand() * 6,
  }));
  const f = { name, curve, mesh, uniforms, drops, dropData };
  fluids.push(f);
  return f;
}

// Pour pose of the cup; fluid paths start at its lip.
const POUR = { x: -1.25, y: 0.45, rot: -1.12 };
cup.position.set(POUR.x, POUR.y, 0); cup.rotation.z = POUR.rot; cup.updateMatrixWorld(true);
const LIP = cup.localToWorld(new THREE.Vector3(R1, H, 0));
cup.position.set(0, 0, 0); cup.rotation.z = 0; cup.updateMatrixWorld(true);
const L = (x, y, z) => new THREE.Vector3(LIP.x + x, LIP.y + y, LIP.z + z);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const milk = makeFluid('milk', '#F4ECDF', 0.17, [L(0, 0, 0), L(0.7, 0.35, 0.5), V(3.2, 1.7, 1.4), V(2.9, 3.5, 2.2), V(0.6, 4.1, 2.8), V(-2.2, 3.2, 2.3), V(-3.7, 1.4, 1.0), V(-4.4, 0.3, -0.6)], { sheen: 0.6, roughness: 0.25 });
const rabri = makeFluid('rabri', '#E3C48A', 0.14, [L(0, 0, 0), L(0.8, 0.0, -0.4), V(3.4, -0.1, -1.4), V(4.2, 1.5, -2.6), V(2.6, 3.0, -3.3), V(-0.5, 3.3, -2.9), V(-3.4, 2.3, -2.1), V(-4.2, 0.9, -1.0)], { sheen: 0.5, roughness: 0.32 });
const rose = makeFluid('rose', '#A80F33', 0.1, [L(0, 0, 0), L(0.6, -0.35, 0.35), V(2.6, -0.45, 1.6), V(2.2, 0.9, 3.0), V(0.2, 2.2, 3.3), V(-1.8, 2.6, 2.0), V(-3.0, 3.6, 0.2), V(-3.4, 4.6, -1.6)], { roughness: 0.08, transmission: Q.glass === 'physical' ? 0.35 : 0, sheen: 0 });

// ---------- Sev and sabja: instanced particles flowing from the cup into floating streams ----------
function streamCurve(pts) { return new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, 'centripetal'); }
const sevStream = streamCurve([[-0.6, 1.6, 0.2], [-2.3, 2.4, 1.2], [-3.4, 3.6, 0.1], [-2.4, 4.6, -1.4], [-0.6, 4.4, -1.0], [0.9, 4.9, 0.6]]);
const sabjaStream = streamCurve([[0.2, 1.2, 0.6], [1.9, 1.0, 2.1], [3.4, 2.2, 1.0], [3.0, 3.7, -1.0], [1.4, 4.6, -1.6], [-0.4, 5.2, -0.4]]);

const sevGeo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(-0.22, 0, 0), V(0, 0.09, 0.04), V(0.22, -0.02, 0)), 10, 0.014, 5, false);
const sev = new THREE.InstancedMesh(sevGeo, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, clearcoat: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#fff') }), Q.sev);
const sabja = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 8, 6), new THREE.MeshStandardMaterial({ color: '#1B1416', roughness: 0.35 }), Q.sabja);
const gel = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshPhysicalMaterial({ color: '#EDE7EA', roughness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, envMapIntensity: 1.2 }), Q.sabja);
[sev, sabja, gel].forEach((m) => { m.frustumCulled = false; scene.add(m); });

function particleData(n, spread) {
  return Array.from({ length: n }, () => {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
    return {
      start: V(Math.cos(a) * r * 0.5, 0.15 + rand() * 1.5, Math.sin(a) * r * 0.5), // inside the cup (cup space)
      t: rand(), off: V(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(spread),
      delay: rand() * 0.45, rot: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6), spin: (rand() - 0.5) * 1.4, ph: rand() * 6,
    };
  });
}
const sevData = particleData(Q.sev, 1.0);
sevData.forEach((d, i) => sev.setColorAt(i, new THREE.Color(i % 3 === 0 ? '#F2A6B8' : i % 3 === 1 ? '#EED39A' : '#E4BE78')));
const sabjaData = particleData(Q.sabja, 1.1);

// ---------- Scroll state ----------
const state = {
  lid: 0, kulfiUp: 0, tilt: 0, drain: 0, ret: 0,
  milk: 0, rabri: 0, rose: 0, tails: 0,
  sev: 0, sabja: 0, explode: 0, burst: 0,
  cam: 0, pull: 0,
  c: { milk: 0, rabri: 0, rose: 0, sev: 0, sabja: 0, kulfi: 0, pista: 0 },
};

// ---------- Frame update ----------
const dummy = new THREE.Object3D();
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

function update(time) {
  const t = reduceMotion ? 0 : time;

  // Cup: tilt to pour, then return upright for the exploded view.
  const tilt = easeInOut(state.tilt) * (1 - easeInOut(state.ret));
  cup.position.set(lerp(0, POUR.x, tilt), lerp(0, POUR.y, tilt) - 0.15 * state.ret, 0);
  cup.rotation.z = POUR.rot * tilt;
  const fillLevel = 1 - 0.72 * state.drain;
  contents.scale.y = fillLevel;
  contentsMat.map.repeat.y = fillLevel; // keep layers at true size; the top layers are what pour out
  capMat.color.copy(CAP_FULL).lerp(CAP_SEV, Math.min(1, state.drain * 1.6));

  // Lid and straw lift off and drift out of frame.
  const l = easeInOut(state.lid);
  lid.position.set(lerp(LID_REST.x, -6.5, l), lerp(LID_REST.y, 11, l), lerp(LID_REST.z, -4, l));
  lid.rotation.set(0.7 * l, 0.4 * l, 0.9 * l);

  // Kulfi rises out of the cup, hovers, then breaks apart.
  const k = easeInOut(state.kulfiUp), ex = easeOut(state.explode);
  kulfi.position.set(lerp(0, -0.35, k) + 0.35 * ex, lerp(H + 0.2, 3.7, k) - 0.35 * ex + Math.sin(t * 1.1) * 0.05 * k, lerp(0, 0.4, k) - 0.4 * ex);
  kulfi.rotation.y = t * 0.25 * k + ex * 0.6;
  kulfi.rotation.x = 0.25 * ex;
  wedges.forEach((w) => {
    w.position.copy(w.userData.dir).multiplyScalar(0.75 * ex);
    w.position.y = w.userData.lift * ex;
    w.rotation.set(0.25 * ex * w.userData.dir.z, 0, -0.25 * ex * w.userData.dir.x);
  });
  const b = easeOut(state.burst);
  pistaData.forEach((d, i) => {
    tmp.copy(d.rest).lerp(d.out, b);
    tmp.y += Math.sin(t * 1.3 + d.ph) * 0.05 * b;
    dummy.position.copy(tmp);
    dummy.rotation.set(d.spin.x + t * 0.6 * b, d.spin.y, d.spin.z + t * 0.4 * b);
    dummy.scale.set(d.s * 0.55, d.s * 0.4, d.s * 1.4);
    dummy.updateMatrix();
    pista.setMatrixAt(i, dummy.matrix);
  });
  pista.instanceMatrix.needsUpdate = true;

  // Fluids
  for (const f of fluids) {
    const head = state[f.name];
    f.uniforms.uHead.value = head;
    f.uniforms.uTail.value = Math.min(state.tails * (f.name === 'rose' ? 0.9 : 0.75), Math.max(0, head - 0.02));
    f.uniforms.uTime.value = t;
    f.mesh.visible = head > 0.001;
    f.drops.visible = head > 0.01;
    if (!f.drops.visible) continue;
    const settle = clamp((head - 0.85) / 0.15, 0, 1); // once landed, droplets drift instead of spraying
    f.dropData.forEach((d, i) => {
      const u = clamp(head - d.back * lerp(0.12, 0.5, settle), 0, 1);
      f.curve.getPointAt(u, tmp);
      const spread = d.spread * (0.4 + 0.6 * Math.min(1, head * 4));
      tmp.addScaledVector(d.dir, spread * 0.6);
      tmp.y += Math.sin(t * 1.2 + d.ph) * 0.06;
      dummy.position.copy(tmp);
      dummy.rotation.set(0, 0, 0);
      const s = d.s * (u < f.uniforms.uTail.value ? 0 : 1) * (1 + 0.15 * Math.sin(t * 3 + d.ph));
      dummy.scale.set(s, s * 1.15, s);
      dummy.updateMatrix();
      f.drops.setMatrixAt(i, dummy.matrix);
    });
    f.drops.instanceMatrix.needsUpdate = true;
  }

  // Sev and sabja streams
  placeStream(sev, sevData, sevStream, state.sev, t, 1, null);
  placeStream(sabja, sabjaData, sabjaStream, state.sabja, t, 1, gel);

  // Camera: slow orbit during the pour, pull back for the exploded view, slight pointer parallax.
  const aspect = camera.aspect;
  const fit = aspect < 1 ? Math.min(1.5, 0.82 / Math.pow(aspect, 0.75)) : 1;
  const ang = lerp(0, 0.35, easeInOut(state.cam)) - 0.2 * state.pull;
  const dist = (lerp(9.2, 10.8, state.cam) + 2.2 * state.pull) * fit;
  pointer.sx += (pointer.x - pointer.sx) * 0.05;
  pointer.sy += (pointer.y - pointer.sy) * 0.05;
  camTarget.set(lerp(0, 0.2, state.cam), lerp(1.9, 2.3, state.cam) + 0.5 * state.pull, 0);
  camera.position.set(Math.sin(ang) * dist + pointer.sx * 0.5, camTarget.y + lerp(0.4, 1.1, state.cam) + pointer.sy * 0.3, Math.cos(ang) * dist);
  camera.lookAt(camTarget);
}

function placeStream(mesh, data, curve, p, t, s0, halo) {
  mesh.visible = p > 0.001;
  if (halo) halo.visible = mesh.visible;
  if (!mesh.visible) return;
  cup.updateMatrixWorld();
  data.forEach((d, i) => {
    const q = easeInOut(clamp((p * 1.45 - d.delay), 0, 1));
    curve.getPointAt((d.t + t * 0.012) % 1, tmp2);
    tmp2.add(d.off);
    tmp2.y += Math.sin(t * 0.9 + d.ph) * 0.08;
    tmp.copy(d.start);
    cup.localToWorld(tmp);
    tmp.lerp(tmp2, q);
    // arc upward on the way out so they feel thrown, not slid
    tmp.y += Math.sin(q * Math.PI) * 0.6;
    dummy.position.copy(tmp);
    dummy.rotation.set(d.rot.x + t * d.spin * q, d.rot.y + q * 2, d.rot.z);
    const s = q > 0.002 ? s0 : 0;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (halo) halo.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (halo) halo.instanceMatrix.needsUpdate = true;
}

// ---------- Callouts: project a 3D anchor to the screen each frame ----------
const SIDE = narrow ? {} : { kulfi: true, pista: false }; // these two share a spot, so they face apart
const callouts = [...document.querySelectorAll('.callout')].map((el) => ({ el, key: el.dataset.key, side: null }));
const anchors = {
  milk: () => milk.curve.getPointAt(clamp(state.milk * 0.55, 0, 1), tmp),
  rabri: () => rabri.curve.getPointAt(clamp(state.rabri * 0.62, 0, 1), tmp),
  rose: () => rose.curve.getPointAt(clamp(state.rose * 0.5, 0, 1), tmp),
  sev: () => sevStream.getPointAt(0.42, tmp),
  sabja: () => sabjaStream.getPointAt(0.45, tmp),
  // the scoop spins, so track whichever piece is currently furthest out on its label's side
  // (on narrow screens there is no room side by side, so split them top and bottom instead)
  kulfi: () => extreme(wedges.length, (i) => wedges[i].getWorldPosition(tmp2), -1, narrow ? 'y' : 'x'),
  pista: () => extreme(Q.pista, (i) => { pista.getMatrixAt(i, dummy.matrix); return tmp2.setFromMatrixPosition(dummy.matrix).applyMatrix4(kulfi.matrixWorld); }, 1, narrow ? 'y' : 'x'),
};
function extreme(n, get, sign, axis) {
  let best = -Infinity;
  for (let i = 0; i < n; i++) { const v = get(i); if (v[axis] * sign > best) { best = v[axis] * sign; tmp.copy(v); } }
  return tmp;
}
let vw = innerWidth, vh = innerHeight;
function placeCallouts() {
  for (const c of callouts) {
    const o = state.c[c.key];
    if (o <= 0.001) { if (c.el.style.opacity !== '0') c.el.style.opacity = '0'; continue; }
    anchors[c.key]().project(camera);
    const x = (tmp.x * 0.5 + 0.5) * vw, y = (-tmp.y * 0.5 + 0.5) * vh;
    let left = SIDE[c.key] ?? x > vw * 0.62;
    c.w ||= c.el.querySelector('.callout__text').offsetWidth + 90;
    if (!left && x + c.w > vw - 12) left = true;   // keep the text on screen
    else if (left && x - c.w < 12) left = false;
    if (left !== c.side) { c.el.classList.toggle('is-left', left); c.side = left; }
    c.el.style.opacity = String(o);
    c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    c.el.style.setProperty('--draw', String(Math.min(1, o * 1.4)));
  }
}

// ---------- Resize, visibility, pointer ----------
function resize() {
  vw = innerWidth; vh = innerHeight;
  renderer.setSize(vw, vh, false);
  camera.aspect = vw / vh;
  camera.fov = vw < vh ? 42 : 35;
  // In portrait the chapter text owns the lower third: shift the frame instead of tilting the camera.
  if (vw < vh) camera.setViewOffset(vw, vh, 0, vh * 0.16, vw, vh);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
  addEventListener('pointermove', (e) => { pointer.x = e.clientX / vw - 0.5; pointer.y = 0.5 - e.clientY / vh; }, { passive: true });
}

let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });
// Stop rendering once the outro fully covers the stage.
new IntersectionObserver(([e]) => { const was = running; running = !(e.intersectionRatio > 0.98); if (running && !was) loop(); }, { threshold: [0.98] }).observe(document.querySelector('.outro'));

const clock = new THREE.Clock();
let raf = 0;
function loop() {
  cancelAnimationFrame(raf);
  if (!running) return;
  raf = requestAnimationFrame(loop);
  update(clock.getElapsedTime());
  renderer.render(scene, camera);
  placeCallouts();
}

// ---------- Timeline ----------
function buildTimeline() {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const fill = document.querySelector('.rail__fill');
  const railLinks = [...document.querySelectorAll('.rail a')];
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.scrolly', start: 'top top', end: 'bottom bottom', scrub: reduceMotion ? true : 1.1,
      onUpdate: (self) => {
        fill.style.setProperty('--p', self.progress.toFixed(4));
        let cur = 0;
        railLinks.forEach((a, i) => { if (self.progress >= parseFloat(a.dataset.go) - 0.02) cur = i; });
        railLinks.forEach((a, i) => (i === cur ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
      },
    },
  });
  const C = state.c;
  const ch = (n) => `.chapter[data-ch="${n}"]`;
  gsap.set([ch(2), ch(3), ch(4)], { autoAlpha: 0, y: 30 });

  // I. hero hold, then away
  tl.to('.hint', { autoAlpha: 0, duration: 0.4 }, 0.1)
    .to(ch(1), { autoAlpha: 0, y: -30, duration: 0.5 }, 1.0)
  // II. the pour
    .to(state, { lid: 1, duration: 1.2, ease: 'power2.in' }, 1.0)
    .to(state, { kulfiUp: 1, duration: 1.4, ease: 'power2.out' }, 1.2)
    .to(state, { cam: 1, duration: 3.2, ease: 'sine.inOut' }, 1.2)
    .to(state, { tilt: 1, duration: 1.3, ease: 'none' }, 1.8)
    .to(state, { drain: 1, duration: 3.2 }, 2.4)
    .to(state, { milk: 1, duration: 2.6, ease: 'power1.out' }, 2.5)
    .to(state, { rabri: 1, duration: 2.6, ease: 'power1.out' }, 2.8)
    .to(state, { rose: 1, duration: 2.4, ease: 'power1.out' }, 3.1)
    .fromTo(ch(2), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 2.3)
    .to(C, { milk: 1, duration: 0.4 }, 3.5).to(C, { rabri: 1, duration: 0.4 }, 3.9).to(C, { rose: 1, duration: 0.4 }, 4.3)
    .to(C, { milk: 0, rabri: 0, rose: 0, duration: 0.35 }, 5.5)
    .to(ch(2), { autoAlpha: 0, y: -30, duration: 0.4 }, 5.5)
  // III. sev and sabja
    .to(state, { sev: 1, duration: 1.8, ease: 'power1.inOut' }, 5.0)
    .to(state, { sabja: 1, duration: 1.8, ease: 'power1.inOut' }, 5.3)
    .to(state, { tails: 0.6, duration: 2.4, ease: 'sine.inOut' }, 5.6)
    .fromTo(ch(3), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 5.8)
    .to(C, { sev: 1, duration: 0.4 }, 6.3).to(C, { sabja: 1, duration: 0.4 }, 6.6)
    .to(C, { sev: 0, sabja: 0, duration: 0.35 }, 7.6)
    .to(ch(3), { autoAlpha: 0, y: -30, duration: 0.4 }, 7.6)
  // IV. exploded kulfi
    .to(state, { ret: 1, duration: 1.4, ease: 'power2.inOut' }, 7.4)
    .to(state, { pull: 1, duration: 1.8, ease: 'sine.inOut' }, 7.5)
    .to(state, { explode: 1, duration: 1.4 }, 7.8)
    .to(state, { burst: 1, duration: 1.4 }, 8.0)
    .to(state, { tails: 0.85, duration: 1.6 }, 8.0)
    .fromTo(ch(4), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 8.0)
    .to(C, { kulfi: 1, duration: 0.4 }, 8.7).to(C, { pista: 1, duration: 0.4 }, 9.0)
    .set({}, {}, 10);

  // Rail links jump to a point in the sequence.
  railLinks.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const st = tl.scrollTrigger;
    window.scrollTo({ top: st.start + (st.end - st.start) * parseFloat(a.dataset.go), behavior: reduceMotion ? 'auto' : 'smooth' });
  }));
  return tl;
}

// GSAP is loaded with `defer`, which runs before module scripts, but guard anyway.
function start() {
  buildTimeline();
  loop();
  requestAnimationFrame(() => document.documentElement.classList.add('is-ready'));
}
if (window.gsap && window.ScrollTrigger) start();
else addEventListener('load', start, { once: true });

// Small deterministic PRNG so the composition is identical on every load.
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
