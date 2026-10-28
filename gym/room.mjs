import * as THREE from 'three';
import { EffectComposer } from '../assets/vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../assets/vendor/three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from '../assets/vendor/three/addons/postprocessing/OutlinePass.js';
import { SSAOPass } from '../assets/vendor/three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from '../assets/vendor/three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from '../assets/vendor/three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from '../assets/vendor/three/addons/shaders/FXAAShader.js';
import { Reflector } from '../assets/vendor/three/addons/objects/Reflector.js';
import { HDRLoader } from '../assets/vendor/three/addons/loaders/HDRLoader.js';
import { RoomEnvironment } from '../assets/vendor/three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from '../assets/vendor/three/addons/lights/RectAreaLightUniformsLib.js';
import { createMaterials } from './materials.mjs';
import { createEquipment } from './equipment.mjs?v=leg-machine-1';
import { batchStaticGroup } from './optimize.mjs';

export async function createRoom({ container, onHover, onSelect, onMenu, onUnavailable, isPaused }) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(devicePixelRatio, coarse ? 1.35 : 1.6);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '训练馆三维空间。拖动环顾，滚轮移动，WASD 行走。Tab 可选择器材，Esc 打开选项。');
  container.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8e9f9c');
  scene.fog = new THREE.FogExp2('#aebeb6', .004);
  const camera = new THREE.PerspectiveCamera(65, 1, .08, 180);
  camera.rotation.order = 'YXZ';
  const startPosition = new THREE.Vector3(6.7, 1.85, 8.7);
  const startLook = new THREE.Vector3(-2, 1.1, -3.9);
  const direction = startLook.clone().sub(startPosition).normalize();
  const initialYaw = Math.atan2(-direction.x, -direction.z);
  const initialPitch = Math.asin(direction.y);
  let yaw = initialYaw, pitch = initialPitch;
  camera.position.copy(startPosition);
  camera.rotation.set(pitch, yaw, 0);

  // Start with a tiny procedural studio environment. The photographic HDR is
  // upgraded in the background after the first frame, so entry is immediate.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  scene.environment = pmrem.fromScene(studio, .04, .1, 100, { size: 64 }).texture;
  studio.dispose();
  new HDRLoader().load('studio-small.hdr', hdr => {
    const previous = scene.environment;
    const upgraded = pmrem.fromEquirectangular(hdr).texture;
    scene.environment = upgraded;
    previous.dispose();
    hdr.dispose();
    requestFrame();
    setTimeout(() => pmrem.dispose(), 0);
  }, undefined, () => pmrem.dispose());
  scene.environmentIntensity = .5;
  scene.environmentRotation.y = 1.5;
  // The wallpaper wraps around the whole horizon at infinity. Unlike a finite
  // plane, its sides cannot become visible when walking up to or along the glass.
  const scenery = new THREE.TextureLoader().load('scenery.webp', () => {
    scene.background = scenery;
    requestFrame();
  });
  scenery.colorSpace = THREE.SRGBColorSpace;
  scenery.mapping = THREE.EquirectangularReflectionMapping;
  scene.backgroundIntensity = 1;
  scene.backgroundRotation.y = .6;
  const m = createMaterials(renderer, () => requestFrame());
  const equipment = createEquipment(scene, m);
  const { box, cylinder, tube, mesh } = equipment;
  const architecture = new THREE.Group(); scene.add(architecture);
  const glazing = new THREE.Group(); scene.add(glazing);

  // Continuous, human-scale architecture: the viewer stands inside the room.
  box(architecture, [20, .2, 21], [0, -.12, 0], m.floor, .01);
  box(architecture, [14.7, .045, 12.2], [1.9, .012, -3], m.floorRubber, .008);
  for (let x = -5.3; x < 9.1; x += 1.2) box(architecture, [.008, .003, 12.1], [x, .037, -3], m.rubber, 0);
  for (let z = -8.9; z < 3.1; z += 1.2) box(architecture, [14.6, .003, .008], [1.9, .038, z], m.rubber, 0);
  for (let x = -9.8; x <= 10; x += 2.5) box(architecture, [.009, .003, 20.7], [x, -.011, 0], m.concrete, 0);
  for (let z = -10; z <= 10; z += 2.5) box(architecture, [19.8, .003, .009], [0, -.01, z], m.concrete, 0);
  box(architecture, [20, 5.8, .28], [0, 2.9, -9.5], m.wall, 0);
  box(architecture, [.28, 5.8, 20.5], [10, 2.9, .6], m.wall, 0);
  box(architecture, [20, 5.8, .28], [0, 2.9, 10.5], m.wall, 0);
  box(architecture, [20, .2, 21], [0, 5.7, .3], m.ceiling, 0);
  for (let z = -9; z < 10.5; z += 2.7) box(architecture, [20, .28, .2], [0, 5.42, z], m.frame, 0);
  for (const x of [-7.5, -3, 1.5, 6]) {
    box(architecture, [.13, .07, 16.7], [x, 5.25, -.3], m.frame, .01);
    box(architecture, [.044, .025, 16.5], [x, 5.2, -.3], m.ledWhite, .003);
  }
  for (let x = -9.7; x < 9.9; x += .18) box(architecture, [.085, .9, .13], [x, .54, -9.31], m.timber, .006);
  for (let z = -8.8; z < 9.8; z += .18) box(architecture, [.13, 5.3, .085], [9.82, 2.72, z], m.timber, .006);
  box(architecture, [19.6, .018, .05], [0, 1.08, -9.2], m.led, .002);
  box(architecture, [.05, .025, 20.1], [9.66, .12, .45], m.led, .002);
  box(architecture, [19.8, .19, .1], [0, .1, -9.27], m.frame, .01);

  for (let z = -9.5; z <= 10.5; z += 3.3) {
    box(architecture, [.16, 5.7, .13], [-10, 2.85, z], m.frame, .01);
    box(glazing, [.06, 5.36, 3.14], [-10.02, 2.86, z + 1.65], m.glass, 0).castShadow = false;
  }
  for (const y of [.18, 4.95, 5.55]) box(architecture, [.16, .085, 20.8], [-10, y, .5], m.frame, .006);
  box(architecture, [.42, .17, 20.8], [-9.87, .12, .5], m.concrete, .015);

  const mirror = new Reflector(new THREE.PlaneGeometry(11.8, 3.5), {
    clipBias: .003, textureWidth: coarse ? 512 : 1024, textureHeight: coarse ? 384 : 512,
    color: 0xc1c8c3, multisample: 0,
  });
  mirror.position.set(-3.1, 2.95, -9.33); scene.add(mirror);
  for (const x of [-9.04, 2.84]) box(architecture, [.065, 3.6, .08], [x, 2.95, -9.24], m.frameLight, .01);
  for (const y of [1.17, 4.72]) box(architecture, [12, .065, .08], [-3.1, y, -9.24], m.frameLight, .01);
  for (const x of [-5.07, -1.13]) box(architecture, [.014, 3.5, .02], [x, 2.95, -9.3], m.steel, .001);

  // Layered architectural lighting: diffuse window, soft sun, warm ceiling.
  RectAreaLightUniformsLib.init();
  scene.add(new THREE.HemisphereLight('#dce9ef', '#68614f', .32));
  const sunlight = new THREE.DirectionalLight('#ffead0', 3.6);
  sunlight.position.set(-25, 17, -5); sunlight.target.position.set(2, 0, 2);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  Object.assign(sunlight.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 60 });
  sunlight.shadow.normalBias = .025; sunlight.shadow.bias = -.00015; sunlight.shadow.radius = 3;
  scene.add(sunlight, sunlight.target);
  const windowLight = new THREE.RectAreaLight('#dcecf7', 1.2, 19, 4.4);
  windowLight.position.set(-9.7, 3.1, .3); windowLight.lookAt(2, 1.2, .3); scene.add(windowLight);
  const warmFill = new THREE.DirectionalLight('#f4e4cd', .4); warmFill.position.set(5, 4.5, 8); scene.add(warmFill);
  for (const x of [-3, 3.5]) {
    const light = new THREE.RectAreaLight('#fff0dc', .7, 3, 14);
    light.position.set(x, 5.1, -.3); light.lookAt(x, 0, -.3); scene.add(light);
  }

  // Matte prints sit in real frames; their small picture lights belong to the room.
  const art = new THREE.Group(); scene.add(art);
  const artLoader = new THREE.TextureLoader();
  ['miku', 'firefly', 'robin'].forEach((name, i) => {
    const texture = artLoader.load(`art/${name}.webp`, () => requestFrame(), undefined, () => {});
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const x = 4.2 + i * 2.05;
    const print = new THREE.MeshStandardMaterial({ map: texture, roughness: .95, metalness: 0 });
    box(art, [1.68, 2.38, .09], [x, 3.35, -9.15], m.frame, .012);
    box(art, [1.6, 2.3, .015], [x, 3.35, -9.094], m.fabric, .001);
    mesh(art, new THREE.PlaneGeometry(1.49, 2.13), print, [x, 3.35, -9.08]);
    tube(art, [x, 4.62, -9.2], [x, 4.62, -8.88], .019, m.brass);
    box(art, [.65, .045, .08], [x, 4.62, -8.87], m.brass, .012);
    box(art, [.58, .009, .06], [x, 4.59, -8.87], m.led, .003);
    const light = new THREE.SpotLight('#ffedcb', 9, 4, .55, .9, 2);
    light.position.set(x, 4.58, -8.7); light.target.position.set(x, 3.3, -9.08); scene.add(light, light.target);
  });

  const props = new THREE.Group(); scene.add(props);
  for (const [x, z] of [[-9, -7.8], [8.8, 7.5]]) {
    cylinder(props, .38, .72, [x, .4, z], m.pot, null, .45);
    cylinder(props, .4, .025, [x, .77, z], m.soil);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4, y = 1.2 + (i % 4) * .24;
      const px = x + Math.sin(a) * .48, pz = z + Math.cos(a) * .48;
      tube(props, [x, .76, z], [px, y, pz], .012, m.leaf, 6);
      const leaf = mesh(props, new THREE.SphereGeometry(1, 10, 8), m.leaf, [px, y + .13, pz], [.5, a, -.5]);
      leaf.scale.set(.15, .46, .035);
    }
  }
  box(props, [.67, .09, .45], [7.9, .87, 4.5], m.fabric, .025, [0, -.15, 0]);
  box(props, [.61, .06, .4], [7.9, .95, 4.5], m.fabric, .025, [0, -.12, 0]);
  cylinder(props, .085, .3, [8.2, .99, 4.08], m.steel);
  cylinder(props, .055, .04, [8.2, 1.16, 4.08], m.plastic);
  for (let i = 0; i < 3; i++) cylinder(props, .28 - i * .035, .055, [8.9, .12 + i * .07, 1.9], m.plate);
  cylinder(props, .43, .06, [8.5, 5.0, -9.22], m.frameLight, [Math.PI / 2, 0, 0]);
  cylinder(props, .395, .063, [8.5, 5.0, -9.2], m.plastic, [Math.PI / 2, 0, 0]);
  tube(props, [8.5, 5.0, -9.15], [8.31, 5.11, -9.15], .014, m.fabric);
  tube(props, [8.5, 5.0, -9.15], [8.55, 5.3, -9.15], .009, m.fabric);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    cylinder(props, .013, .008, [8.5 + Math.sin(a) * .33, 5.0 + Math.cos(a) * .33, -9.15], m.fabric, [Math.PI / 2, 0, 0], .013, 8);
  }

  const contactCanvas = document.createElement('canvas'); contactCanvas.width = contactCanvas.height = 128;
  const ctx = contactCanvas.getContext('2d'); const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,.5)'); gradient.addColorStop(.5, 'rgba(0,0,0,.2)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const contactTexture = new THREE.CanvasTexture(contactCanvas);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, opacity: .65 });
  const contacts = new THREE.Group(); scene.add(contacts);
  for (const o of equipment.obstacles) {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 3.2, o.d * 2.6), contactMaterial);
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(o.x, .043, o.z); contacts.add(shadow);
  }

  for (const [id, groups] of equipment.groups) for (const group of groups) batchStaticGroup(group, id);
  batchStaticGroup(architecture);
  batchStaticGroup(props);
  // Noninteractive equipment (bench and dumbbell rack) uses the same batching.
  for (const group of scene.children) if (group.isGroup && ![architecture, props, glazing, contacts].includes(group) && !group.userData.station) batchStaticGroup(group);

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: coarse ? 0 : 2 }));
  composer.addPass(new RenderPass(scene, camera));
  const ao = new SSAOPass(scene, camera, 1, 1, coarse ? 8 : 12);
  ao.kernelRadius = .16; ao.minDistance = .001; ao.maxDistance = .09;
  composer.addPass(ao);
  const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  outline.edgeStrength = 2.5; outline.edgeGlow = .15; outline.edgeThickness = 1;
  outline.visibleEdgeColor.set('#cbb785'); outline.hiddenEdgeColor.set('#000000');
  composer.addPass(outline);
  composer.addPass(new OutputPass());
  const fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa);
  mirror.onBeforeRender = ((original) => function(...args) {
    if (scene.overrideMaterial) return;
    original.apply(this, args);
  })(mirror.onBeforeRender);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const selectable = [], occluders = [];
  for (const list of equipment.groups.values()) for (const group of list) group.traverse(o => { if (o.isMesh) selectable.push(o); });
  architecture.traverse(o => { if (o.isMesh && o.material !== m.glass) occluders.push(o); });
  let selected = null, paused = false, queued = false, moving = false;
  let turnTarget = null, lastTime = 0;
  const keys = new Set(), touches = new Map();
  let drag = null, pinchDistance = null, dead = false, holdTimer = null;
  const targetPosition = camera.position.clone();
  const collisionBounds = [...equipment.obstacles,
    { x: .5, z: 5.7, w: .65, d: 1.35 },
    { x: 8.55, z: -1.2, w: .65, d: 1.65 },
    { x: -9, z: -7.8, w: .45, d: .45 },
    { x: 8.8, z: 7.5, w: .45, d: .45 },
  ];
  function highlight(id) {
    if (id === selected) return;
    selected = id;
    outline.selectedObjects = id ? equipment.groups.get(id) || [] : [];
    for (const [key, list] of equipment.groups) for (const group of list) group.traverse(o => {
      if (!o.isMesh || !o.material.isMeshStandardMaterial) return;
      if (!o.userData.originalMaterial) o.userData.originalMaterial = o.material;
      if (key === id) {
        if (!o.userData.hoverMaterial) {
          const material = o.userData.originalMaterial.clone();
          material.emissive.add(new THREE.Color('#383422')); material.emissiveIntensity = .32;
          o.userData.hoverMaterial = material;
        }
        o.material = o.userData.hoverMaterial;
      } else o.material = o.userData.originalMaterial;
    });
    renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    onHover(id); requestFrame();
  }
  function hit(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(pointer, camera);
    const result = raycaster.intersectObjects(selectable, false)[0];
    if (!result) return null;
    const wall = raycaster.intersectObjects(occluders, false)[0];
    return wall && wall.distance + .02 < result.distance ? null : result.object.userData.station;
  }
  function canWalk(x, z) {
    if (x < -9.35 || x > 9.35 || z < -8.85 || z > 9.5) return false;
    return !collisionBounds.some(o => Math.abs(x - o.x) < o.w + .28 && Math.abs(z - o.z) < o.d + .28);
  }
  function walk(dx, dz) {
    const x = targetPosition.x + dx, z = targetPosition.z + dz;
    if (canWalk(x, targetPosition.z)) targetPosition.x = x;
    if (canWalk(targetPosition.x, z)) targetPosition.z = z;
  }
  function requestFrame() {
    if (queued || dead || document.hidden) return;
    queued = true; requestAnimationFrame(frame);
  }
  function render() { composer.render(); }
  function frame(now) {
    queued = false;
    if (dead || document.hidden) return;
    const delta = Math.min((now - lastTime) / 1000 || .016, .05); lastTime = now;
    moving = false;
    if (!paused && !isPaused()) {
      const f = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      const side = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      if (f || side) {
        const scale = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8 : 5) * delta / Math.max(1, Math.hypot(f, side));
        walk((-Math.sin(yaw) * f + Math.cos(yaw) * side) * scale, (-Math.cos(yaw) * f - Math.sin(yaw) * side) * scale);
        moving = true; if (selected) highlight(null);
      }
      if (turnTarget) {
        const factor = reduced ? 1 : 1 - Math.exp(-delta * 7);
        yaw += (turnTarget.yaw - yaw) * factor; pitch += (turnTarget.pitch - pitch) * factor;
        if (Math.abs(yaw - turnTarget.yaw) + Math.abs(pitch - turnTarget.pitch) < .001) turnTarget = null;
        else moving = true;
      }
    }
    if (camera.position.distanceTo(targetPosition) > .001) {
      camera.position.lerp(targetPosition, reduced ? 1 : 1 - Math.exp(-delta * 13)); moving = true;
    }
    camera.rotation.set(pitch, yaw, 0);
    render();
    if (moving || keys.size) requestFrame();
  }
  function resize() {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width, height); camera.aspect = width / height;
    camera.fov = width < 600 ? 77 : 62; camera.updateProjectionMatrix(); composer.setSize(width, height);
    ao.setSize(Math.ceil(width * pixelRatio * .65), Math.ceil(height * pixelRatio * .65));
    fxaa.uniforms.resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio)); requestFrame();
  }
  renderer.domElement.addEventListener('pointerdown', event => {
    if (paused || isPaused() || event.button > 0) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { renderer.domElement.setPointerCapture(event.pointerId); } catch { /* Safari can reject capture during a fast tab switch. */ }
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, multi: touches.size > 1 };
    turnTarget = null; renderer.domElement.style.cursor = 'grabbing';
    clearTimeout(holdTimer);
    if (event.pointerType === 'touch' && touches.size === 1 && !hit(event)) holdTimer = setTimeout(() => {
      if (drag && !drag.moved) { drag.moved = true; onMenu(); }
    }, 700);
  });
  renderer.domElement.addEventListener('pointermove', event => {
    if (paused || isPaused()) return;
    if (touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size >= 2) {
      clearTimeout(holdTimer);
      const [a, b] = [...touches.values()]; const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance) { const amount = (dist - pinchDistance) * .015; walk(-Math.sin(yaw) * amount, -Math.cos(yaw) * amount); }
      pinchDistance = dist; if (drag) { drag.multi = true; drag.moved = true; }
      highlight(null); requestFrame(); return;
    }
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) { drag.moved = true; clearTimeout(holdTimer); }
      if (drag.moved) { yaw -= dx * .003; pitch = THREE.MathUtils.clamp(pitch - dy * .0027, -.65, .8); highlight(null); requestFrame(); }
      drag.x = event.clientX; drag.y = event.clientY;
    } else if (event.pointerType !== 'touch') highlight(hit(event));
  });
  renderer.domElement.addEventListener('pointerup', event => {
    clearTimeout(holdTimer);
    touches.delete(event.pointerId);
    if (!paused && !isPaused() && drag && !drag.moved && !drag.multi) {
      const id = hit(event);
      if (event.pointerType === 'touch' && selected !== id) highlight(id);
      else if (id) { highlight(null); onSelect(id); }
      else highlight(null);
    }
    if (!touches.size) { drag = null; pinchDistance = null; }
    renderer.domElement.style.cursor = selected ? 'pointer' : 'grab';
  });
  renderer.domElement.addEventListener('pointercancel', event => { clearTimeout(holdTimer); touches.delete(event.pointerId); drag = null; pinchDistance = null; });
  // Safari may dispatch the final move/up on the window when pointer capture is
  // unavailable. Keep the same drag alive outside the canvas in that case.
  addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || event.target === renderer.domElement || paused || isPaused()) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) { drag.moved = true; clearTimeout(holdTimer); }
    if (drag.moved) { yaw -= dx * .003; pitch = THREE.MathUtils.clamp(pitch - dy * .0027, -.65, .8); highlight(null); requestFrame(); }
    drag.x = event.clientX; drag.y = event.clientY;
  });
  addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId || event.target === renderer.domElement) return;
    clearTimeout(holdTimer); touches.delete(event.pointerId); drag = null; pinchDistance = null;
    renderer.domElement.style.cursor = selected ? 'pointer' : 'grab';
  });
  renderer.domElement.addEventListener('contextmenu', event => { event.preventDefault(); clearTimeout(holdTimer); if (!paused && !isPaused()) onMenu(); });
  renderer.domElement.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch' && !drag) highlight(null); });
  renderer.domElement.addEventListener('wheel', event => {
    if (paused || isPaused()) return;
    event.preventDefault(); const amount = THREE.MathUtils.clamp(event.deltaY * .009, -1, 1);
    walk(Math.sin(yaw) * amount, Math.cos(yaw) * amount); highlight(null); requestFrame();
  }, { passive: false });
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  const safariKeys = { w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', shift: 'ShiftLeft' };
  addEventListener('keydown', event => {
    const code = movementKeys.has(event.code) ? event.code : safariKeys[String(event.key || '').toLowerCase()];
    if (paused || isPaused() || !code || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault(); keys.add(code); turnTarget = null; requestFrame();
  });
  addEventListener('keyup', event => {
    const code = movementKeys.has(event.code) ? event.code : safariKeys[String(event.key || '').toLowerCase()];
    if (code) keys.delete(code);
  });
  addEventListener('blur', () => { keys.clear(); touches.clear(); drag = null; highlight(null); });
  document.addEventListener('visibilitychange', () => {
    keys.clear();
    if (!document.hidden) { queued = false; lastTime = performance.now(); requestFrame(); }
  });
  addEventListener('pageshow', () => { queued = false; lastTime = performance.now(); requestFrame(); });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); dead = true; onHover(null); onUnavailable(); });
  renderer.domElement.addEventListener('webglcontextrestored', () => location.reload());
  new ResizeObserver(resize).observe(container);
  scene.updateMatrixWorld(true); renderer.shadowMap.needsUpdate = true; resize();
  render();

  return {
    reset() {
      yaw = initialYaw; pitch = initialPitch; turnTarget = null;
      camera.position.copy(startPosition); targetPosition.copy(startPosition);
      keys.clear(); highlight(null); requestFrame();
    },
    setPaused(value) {
      paused = value;
      if (paused) { clearTimeout(holdTimer); keys.clear(); drag = null; turnTarget = null; touches.clear(); highlight(null); }
      else requestFrame();
    },
    focus(id) {
      if (paused || isPaused()) return;
      const groups = equipment.groups.get(id); if (!groups?.length) return;
      const point = new THREE.Vector3(); groups[0].getWorldPosition(point); point.y += id === 'weight' ? .1 : 1.2;
      const delta = point.sub(camera.position).normalize(); let targetYaw = Math.atan2(-delta.x, -delta.z);
      while (targetYaw - yaw > Math.PI) targetYaw -= Math.PI * 2;
      while (targetYaw - yaw < -Math.PI) targetYaw += Math.PI * 2;
      turnTarget = { yaw: targetYaw, pitch: Math.asin(delta.y) };
      highlight(id); requestFrame();
    },
  };
}
