import * as THREE from 'three';
import { RoundedBoxGeometry } from '../assets/vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { publishedEntries } from './data.mjs?v=journal-nov02';

export function createEquipment(scene, m) {
  const geometry = new Map();
  const get = (id, create) => { if (!geometry.has(id)) geometry.set(id, create()); return geometry.get(id); };
  function mesh(parent, shape, material, xyz = [0, 0, 0], rotation) {
    const object = new THREE.Mesh(shape, material);
    object.position.set(...xyz);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent, size, xyz, material = m.frame, radius = .025, rotation) {
    const r = Math.min(radius, ...size.map(v => v * .45));
    const worldUV = material === m.wall || material === m.concrete || material === m.upholstery || material === m.upholsteryWarm;
    const uvScale = material === m.wall || material === m.concrete ? .5 : 2;
    const shape = get(`b${size}:${r}:${worldUV}:${uvScale}`, () => {
      const result = r ? new RoundedBoxGeometry(...size, 2, r) : new THREE.BoxGeometry(...size);
      if (worldUV) {
        const p = result.attributes.position, n = result.attributes.normal, uv = result.attributes.uv;
        const scale = uvScale;
        for (let i = 0; i < p.count; i++) {
          const x = Math.abs(n.getX(i)), y = Math.abs(n.getY(i)), z = Math.abs(n.getZ(i));
          if (x > y && x > z) uv.setXY(i, p.getZ(i) * scale, p.getY(i) * scale);
          else if (y > z) uv.setXY(i, p.getX(i) * scale, p.getZ(i) * scale);
          else uv.setXY(i, p.getX(i) * scale, p.getY(i) * scale);
        }
      }
      return result;
    });
    return mesh(parent, shape, material, xyz, rotation);
  }
  function cylinder(parent, radius, height, xyz, material = m.frame, rotation, top = radius, sides = 24) {
    return mesh(parent, get(`c${radius}:${height}:${top}:${sides}`, () => new THREE.CylinderGeometry(top, radius, height, sides)), material, xyz, rotation);
  }
  function tube(parent, start, end, radius = .035, material = m.frame, sides = 16) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const object = cylinder(parent, radius, a.distanceTo(b), a.clone().add(b).multiplyScalar(.5).toArray(), material, null, radius, sides);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  }
  function frame(parent, start, end, width = .1, depth = width, material = m.frame) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const object = box(parent, [width, a.distanceTo(b), depth], a.clone().add(b).multiplyScalar(.5).toArray(), material, .02);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  }
  function cable(parent, points, radius = .009) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(parent, new THREE.TubeGeometry(curve, points.length * 8, radius, 6, false), m.cable);
  }
  function bolt(parent, xyz, axis = 'z', radius = .033) {
    return cylinder(parent, radius, .028, xyz, m.bolt, axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : null, radius, 6);
  }
  function pad(parent, size, xyz, rotation, warm = false) {
    const object = box(parent, size, xyz, warm ? m.upholsteryWarm : m.upholstery, .06, rotation);
    const piping = new THREE.Group();
    object.add(piping);
    const [w, h, d] = size;
    // Raised piping on the perimeter of the upholstered cushion.
    const yy = h * .25;
    for (const x of [-w / 2 + .025, w / 2 - .025]) tube(piping, [x, yy, -d / 2 + .05], [x, yy, d / 2 - .05], .004, m.seam, 6);
    for (const z of [-d / 2 + .025, d / 2 - .025]) tube(piping, [-w / 2 + .05, yy, z], [w / 2 - .05, yy, z], .004, m.seam, 6);
    return object;
  }
  function handle(parent, a, b) {
    tube(parent, a, b, .026, m.chrome);
    const start = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), .22);
    tube(parent, start.toArray(), b, .038, m.rubber);
    const end = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), .96);
    cylinder(parent, .041, .025, end.toArray(), m.chrome);
  }
  function pulley(parent, xyz, axis = 'x') {
    const rotation = axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
    cylinder(parent, .115, .058, xyz, m.plastic, rotation);
    cylinder(parent, .045, .064, xyz, m.chrome, rotation);
    const offset = [...xyz]; offset[axis === 'x' ? 0 : 2] += .04;
    bolt(parent, offset, axis);
  }
  function foot(g, x, z) {
    box(g, [.24, .07, .3], [x, .055, z], m.rubber, .025);
    box(g, [.2, .045, .25], [x, .11, z], m.frame, .025);
    bolt(g, [x, .14, z], 'y');
  }
  function chassis(g, { tall = false, noBack = false, wide = .62, warm = false } = {}) {
    for (const x of [-wide, wide]) {
      frame(g, [x, .16, -.58], [x, .16, .93], .13, .1);
      frame(g, [x, .16, -.58], [x, tall ? 2.65 : 1.92, -.58], .11, .12);
      foot(g, x, -.57); foot(g, x, .89);
      bolt(g, [x, .2, .34]);
      bolt(g, [x, 1.64, -.5]);
    }
    frame(g, [-wide, .17, -.58], [wide, .17, -.58], .11);
    frame(g, [-wide, tall ? 2.65 : 1.92, -.58], [wide, tall ? 2.65 : 1.92, -.58], .11);
    const top = tall ? 2.4 : 1.7;
    box(g, [.74, top - .17, .37], [0, top / 2 + .12, -.73], m.frame, .07);
    // Exposed front opening shows individual iron plates, guide rods and pin.
    box(g, [.59, 1.12, .025], [0, .85, -.513], m.plastic, .015);
    for (let i = 0; i < 13; i++) {
      box(g, [.47, .057, .26], [0, .3 + i * .067, -.42], m.plate, .012);
      cylinder(g, .01, .008, [.12, .3 + i * .067, -.28], m.chrome, [Math.PI / 2, 0, 0], .01, 8);
    }
    for (const x of [-.19, .19]) tube(g, [x, .22, -.4], [x, top - .1, -.4], .017, m.chrome);
    cylinder(g, .026, .16, [.13, .57, -.21], m.brass, [Math.PI / 2, 0, 0]);
    cylinder(g, .044, .045, [.13, .57, -.13], m.brass, [Math.PI / 2, 0, 0]);
    cable(g, [[.15, .57, -.13], [.32, .54, -.1], [.34, .9, -.2], [.23, 1.2, -.28]], .0035);
    frame(g, [0, .2, .43], [0, .79, .43], .12);
    pad(g, [.69, .14, .73], [0, .84, .43], null, warm);
    box(g, [.58, .05, .61], [0, .75, .43], m.frame, .025);
    if (!noBack) {
      frame(g, [0, .3, -.03], [0, 1.54, -.14], .11);
      pad(g, [.58, .82, .16], [0, 1.29, -.08], [-.1, 0, 0], warm);
    }
    box(g, [.17, .19, .035], [wide + .01, .58, -.43], m.steel, .008);
    for (let i = 0; i < 4; i++) bolt(g, [wide, .48 + i * .065, -.405], 'z', .015);
  }
  const groups = new Map();
  const obstacles = [];
  function station(id, xyz, build, yaw = 0, bounds = [1.75, 2.15]) {
    const group = new THREE.Group();
    group.position.set(...xyz); group.rotation.y = yaw;
    group.userData.station = id;
    scene.add(group);
    build(group);
    group.traverse(object => { if (object.isMesh) object.userData.station = id; });
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(group);
    obstacles.push({ x: xyz[0], z: xyz[2], w: bounds[0] / 2, d: bounds[1] / 2 });
    return group;
  }
  // Two aligned strength rows on a 3.7 m grid; the front aisle stays open.
  station('pull', [-4.5, 0, -5.6], g => {
    chassis(g, { tall: true, noBack: true });
    for (const x of [-.62, .62]) frame(g, [x, 2.65, -.58], [x, 2.65, .75], .11);
    frame(g, [-.62, 2.65, .75], [.62, 2.65, .75], .11);
    pulley(g, [0, 2.66, .63]); pulley(g, [0, 2.66, -.43]);
    cable(g, [[0, 1.25, -.43], [0, 2.66, -.43], [0, 2.73, .56], [0, 2.1, .72]]);
    tube(g, [-.72, 2.02, .72], [-.44, 2.14, .72], .027, m.chrome);
    tube(g, [-.44, 2.14, .72], [.44, 2.14, .72], .027, m.chrome);
    handle(g, [-.44, 2.14, .72], [-.82, 1.98, .72]);
    handle(g, [.44, 2.14, .72], [.82, 1.98, .72]);
    for (const x of [-.25, .25]) cylinder(g, .115, .38, [x, 1.02, .5], m.upholstery, [0, 0, Math.PI / 2]);
    tube(g, [-.5, 1.02, .5], [.5, 1.02, .5], .027, m.chrome);
  });
  station('fly', [-.8, 0, -5.6], g => {
    // Dual adjustable cable fly: two independent stacks with cables meeting at chest height.
    for (const s of [-1, 1]) {
      const x = s * .83;
      for (const z of [-.58, .8]) foot(g, x, z);
      frame(g, [x, .16, -.58], [x, .16, .8], .11, .12);
      frame(g, [x, .16, -.58], [x, 2.35, -.58], .11, .12);
      frame(g, [x, 2.35, -.58], [x, 2.35, .8], .1, .11);
      frame(g, [x, .16, .8], [x, 2.35, .8], .09, .1);
      box(g, [.57, 1.35, .035], [x, .92, -.515], m.plastic, .015);
      for (let i = 0; i < 11; i++) box(g, [.46, .065, .25], [x, .27 + i * .075, -.42], m.plate, .012);
      for (const z of [-.34, -.02]) tube(g, [x + s * .17, .2, z], [x + s * .17, 2.24, z], .018, m.chrome);
      pulley(g, [x, 1.82, -.53]); pulley(g, [x, 1.22, .78]);
      cable(g, [[x, .95, -.35], [x, 1.82, -.53], [x, 1.22, .78], [s * .18, 1.22, 1.05]]);
      handle(g, [s * .18, 1.22, 1.05], [0, 1.22, 1.12]);
      cylinder(g, .1, .12, [x, 2.35, -.58], m.steel, [0, 0, Math.PI / 2]);
    }
    for (const x of [-.52, .52]) frame(g, [x, .16, -.15], [x, .48, -.15], .08);
    frame(g, [-.52, .16, -.15], [.52, .16, -.15], .08);
    pad(g, [.72, .13, .78], [0, .52, -.15], null, true);
    frame(g, [0, .57, -.45], [0, 1.02, -.45], .08);
    pad(g, [.36, .62, .13], [0, 1.31, -.45], null, true);
  }, 0, [2.45, 2.35]);
  station('shoulder', [2.9, 0, -5.6], g => {
    chassis(g, { warm: true });
    for (const s of [-1, 1]) {
      cylinder(g, .11, .16, [s * .61, 1.9, -.59], m.steel, [Math.PI / 2, 0, 0]);
      frame(g, [s * .6, 1.88, -.58], [s * .93, 2.26, .36], .09);
      handle(g, [s * .93, 2.26, .36], [s * .52, 2.26, .65]);
      bolt(g, [s * .61, 1.9, -.48]);
      cable(g, [[s * .6, 1.85, -.6], [0, 1.77, -.42], [0, 1.2, -.42]]);
    }
  });
  station('chest', [6.6, 0, -5.6], g => {
    chassis(g, { warm: true });
    for (const s of [-1, 1]) {
      frame(g, [s * .61, 1.91, -.58], [s * .95, 1.36, .58], .1);
      handle(g, [s * .95, 1.36, .58], [s * .55, 1.36, .91]);
      cylinder(g, .13, .13, [s * .61, 1.9, -.57], m.steel, [Math.PI / 2, 0, 0]);
      bolt(g, [s * .61, 1.9, -.48]);
    }
  }, 0);
  station('row', [-4.5, 0, -.2], g => {
    // Low cable row with an open center, separate seat, angled footplates and low pulley.
    for (const x of [-.58, .58]) {
      foot(g, x, -.58); foot(g, x, .82);
      frame(g, [x, .16, -.58], [x, .16, .82], .12, .13);
      frame(g, [x, .16, -.58], [x, 1.94, -.58], .12, .13);
      frame(g, [x, 1.94, -.58], [0, 1.94, -.58], .11, .12);
      box(g, [.44, 1.18, .03], [x, .78, -.505], m.plastic, .015);
      for (let i = 0; i < 11; i++) box(g, [.36, .06, .22], [x, .28 + i * .075, -.43], m.plate, .012);
      tube(g, [x + Math.sign(x) * .14, .2, -.35], [x + Math.sign(x) * .14, 1.88, -.35], .018, m.chrome);
    }
    frame(g, [-.58, .17, -.25], [.58, .17, -.25], .11);
    frame(g, [0, .17, -.24], [0, .48, .18], .09);
    pad(g, [.64, .13, .65], [0, .53, .16]);
    frame(g, [0, .58, -.18], [0, 1.35, -.28], .1);
    pad(g, [.52, .68, .15], [0, 1.38, -.3], [-.12, 0, 0]);
    for (const s of [-1, 1]) {
      box(g, [.3, .38, .06], [s * .36, .43, .66], m.rubber, .025, [-.25, 0, 0]);
      for (let i = 0; i < 5; i++) box(g, [.26, .018, .012], [s * .36, .29 + i * .06, .7], m.steel, .003);
    }
    pulley(g, [0, .34, .82], 'z');
    cable(g, [[0, .34, .82], [0, .38, .56], [0, .62, .34], [0, .86, .16]]);
    handle(g, [-.22, .86, .16], [.22, .86, .16]);
  }, 0, [1.8, 2.2]);
  station('abs', [-.8, 0, -.2], g => {
    chassis(g, { noBack: true });
    for (const s of [-1, 1]) {
      frame(g, [s * .61, 1.8, -.58], [s * .55, 1.98, .42], .09);
      frame(g, [s * .55, 1.98, .42], [s * .34, 1.58, .66], .09);
      bolt(g, [s * .61, 1.8, -.49]);
    }
    frame(g, [0, .28, -.2], [0, .48, -.2], .1);
    pad(g, [.7, .14, .78], [0, .55, .2]);
    frame(g, [0, .61, -.22], [0, 1.32, -.32], .1);
    pad(g, [.58, .82, .17], [0, 1.38, -.34], [-.12, 0, 0]);
    frame(g, [-.4, 1.82, .42], [.4, 1.82, .42], .09);
    pad(g, [.72, .38, .22], [0, 1.68, .57], [.08, 0, 0], true);
    for (const s of [-1, 1]) handle(g, [s * .42, 1.79, .43], [s * .42, 1.5, .7]);
  }, 0);
  station('legs', [2.9, 0, -.2], g => {
    chassis(g, { warm: true });
    pad(g, [.7, .14, .82], [0, .84, .64], null, true);
    frame(g, [0, .78, .89], [0, .31, 1.35], .12);
    cylinder(g, .15, 1.13, [0, .4, 1.29], m.upholsteryWarm, [0, 0, Math.PI / 2]);
    cylinder(g, .11, .12, [.3, .78, .89], m.steel, [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) handle(g, [s * .52, .81, .47], [s * .52, 1.05, .49]);
  }, 0, [1.8, 2.6]);

  // Seated dual leg extension / curl: side stack, knee-axis cam and two rollers.
  // Local +Z is the user's facing direction; the ankle roller sits below the knee.
  station('leg-curl', [6.6, 0, -.2], g => {
    for (const x of [-.6, .65]) {
      frame(g, [x, .15, -.7], [x, .15, 1.15], .12, .14);
      foot(g, x, -.65); foot(g, x, 1.1);
    }
    frame(g, [-.6, .17, -.6], [1.1, .17, -.6], .12);
    frame(g, [-.6, .17, .85], [.65, .17, .85], .12);
    frame(g, [0, .2, -.45], [0, .83, .05], .14);
    frame(g, [0, .2, .65], [0, .83, .4], .12);
    box(g, [.71, .055, .79], [0, .83, .14], m.steel, .025);
    pad(g, [.73, .15, .82], [0, .93, .14], [-.055, 0, 0], true);
    frame(g, [0, .3, -.4], [0, 1.62, -.6], .13);
    pad(g, [.64, .84, .18], [0, 1.4, -.42], [-.18, 0, 0], true);
    // Backrest carriage, adjustment holes and a brass release pin.
    frame(g, [0, 1.06, -.35], [0, 1.06, -.7], .075, .075, m.chrome);
    for (let i = 0; i < 5; i++) bolt(g, [.08, 1.05, -.36 - i * .06], 'x', .014);
    cylinder(g, .04, .12, [.13, 1.05, -.52], m.brass, [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) {
      frame(g, [s * .43, .25, .05], [s * .48, .96, .1], .07);
      handle(g, [s * .48, .96, -.04], [s * .48, .96, .43]);
    }
    // Right-hand knee pivot with a perforated range-of-motion selector disc.
    const pivot = [.62, .91, .6];
    frame(g, [.65, .17, .55], pivot, .11);
    cylinder(g, .31, .065, pivot, m.steel, [0, 0, Math.PI / 2], .31, 48);
    cylinder(g, .23, .073, [.665, .91, .6], m.frameLight, [0, 0, Math.PI / 2], .23, 40);
    for (let i = 0; i < 9; i++) {
      const a = -.65 + i * .32;
      cylinder(g, .018, .009, [.707, .91 + Math.cos(a) * .185, .6 + Math.sin(a) * .185], m.plastic, [0, 0, Math.PI / 2], .018, 10);
    }
    cylinder(g, .075, .17, [.7, .91, .6], m.chrome, [0, 0, Math.PI / 2]);
    bolt(g, [.8, .91, .6], 'x', .052);
    cylinder(g, .038, .1, [.76, 1.05, .72], m.brass, [0, 0, Math.PI / 2]);
    frame(g, [.64, .91, .6], [.64, .36, 1.03], .085);
    frame(g, [.64, .36, 1.03], [.64, .36, 1.32], .065, .065, m.chrome);
    tube(g, [-.43, .36, 1.3], [.68, .36, 1.3], .036, m.chrome);
    // Two separate ankle pads, stitched endcaps and exposed stainless axle.
    for (const x of [-.2, .2]) {
      cylinder(g, .135, .36, [x, .36, 1.3], m.upholsteryWarm, [0, 0, Math.PI / 2], .135, 32);
      for (const s of [-1, 1]) cylinder(g, .128, .012, [x + s * .172, .36, 1.3], m.seam, [0, 0, Math.PI / 2]);
    }
    bolt(g, [-.45, .36, 1.3], 'x');
    // Height-adjustable thigh restraint holds the knees down for seated curls.
    frame(g, [-.5, .32, .48], [-.5, 1.2, .48], .065, .065, m.chrome);
    for (let i = 0; i < 4; i++) bolt(g, [-.46, .84 + i * .07, .48], 'x', .012);
    cylinder(g, .038, .12, [-.57, 1.02, .48], m.brass, [0, 0, Math.PI / 2]);
    tube(g, [-.5, 1.18, .48], [.45, 1.18, .48], .033, m.chrome);
    for (const x of [-.2, .2]) cylinder(g, .105, .34, [x, 1.18, .48], m.upholsteryWarm, [0, 0, Math.PI / 2], .105, 32);
    // Side-mounted weight tower leaves the seat and leg mechanism unobstructed.
    const tower = new THREE.Group(); tower.position.set(1.03, 0, -.39); g.add(tower);
    box(tower, [.58, 1.68, .42], [0, 1.01, 0], m.frame, .065);
    box(tower, [.44, 1.28, .035], [0, .93, .224], m.plastic, .02);
    for (let i = 0; i < 14; i++) {
      box(tower, [.39, .055, .3], [0, .3 + i * .063, .14], m.plate, .01);
      cylinder(tower, .012, .01, [0, .3 + i * .063, .298], m.chrome, [Math.PI / 2, 0, 0], .012, 10);
    }
    for (const x of [-.15, .15]) tube(tower, [x, .24, .14], [x, 1.64, .14], .014, m.chrome);
    cylinder(tower, .035, .13, [0, .68, .34], m.brass, [Math.PI / 2, 0, 0]);
    pulley(g, [1.03, 1.68, -.28]); pulley(g, [1.03, .29, -.28]);
    cable(g, [[1.03, 1.21, -.25], [1.03, 1.69, -.25], [1.1, 1.54, -.24], [1.1, .29, -.24], [.76, .25, .36], [.66, .72, .83]], .008);
    foot(g, 1.05, -.65); foot(g, 1.05, .08);
  }, 0, [2.8, 3]);

  function screen(parent, width, height, xyz, rotation) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const c = canvas.getContext('2d');
    c.fillStyle = '#0c1718'; c.fillRect(0, 0, 512, 256);
    c.strokeStyle = '#29413d'; c.lineWidth = 1;
    for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(25, i * 42); c.lineTo(487, i * 42); c.stroke(); }
    c.strokeStyle = '#a5bda2'; c.lineWidth = 3; c.beginPath();
    for (let i = 0; i < 40; i++) { const y = 130 - Math.sin(i * .8) * 15 - (i % 9 === 0 ? 45 : 0); i ? c.lineTo(30 + i * 11.5, y) : c.moveTo(30, y); } c.stroke();
    c.fillStyle = '#c4d5ba'; c.font = '32px monospace'; c.fillText('20:00', 30, 53); c.font = '20px monospace'; c.fillText('5.0', 360, 54);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return mesh(parent, new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: .65, roughness: .25, metalness: .2 }), xyz, rotation);
  }
  function treadmill(g) {
    box(g, [1.46, .23, 2.8], [0, .2, .22], m.frame, .1);
    box(g, [1.09, .028, 2.37], [0, .335, .34], m.rubber, .008);
    for (let z = -.76; z < 1.52; z += .045) box(g, [1.05, .004, .008], [0, .354, z], m.plastic, .001);
    for (const s of [-1, 1]) {
      box(g, [.17, .04, 2.34], [s * .64, .34, .33], m.frameLight, .015);
      frame(g, [s * .66, .3, -.81], [s * .66, 1.52, -1.05], .095, .12);
      handle(g, [s * .66, 1.38, -.92], [s * .66, 1.38, .25]);
      cylinder(g, .15, .09, [s * .65, .16, 1.47], m.rubber, [0, 0, Math.PI / 2]);
      bolt(g, [s * .65, .16, 1.53]);
    }
    box(g, [1.45, .38, .13], [0, 1.65, -1.02], m.plastic, .07, [-.42, 0, 0]);
    screen(g, .79, .28, [0, 1.68, -.937], [-.42, 0, 0]);
    box(g, [1.36, .07, .3], [0, 1.44, -.8], m.plastic, .04);
    cylinder(g, .062, .017, [0, 1.49, -.72], m.brass);
    for (const s of [-1, 1]) {
      cylinder(g, .07, .03, [s * .5, 1.49, -.78], m.rubber);
      for (let i = 0; i < 3; i++) box(g, [.06, .015, .035], [s * (.2 + i * .065), 1.49, -.7], m.steel, .005);
    }
    cable(g, [[0, 1.44, -.65], [.04, 1.2, -.59], [.06, 1.23, -.49]], .005);
  }
  station('cardio', [-8, 0, -4.8], treadmill, Math.PI / 2, [3, 1.8]);
  station('cardio', [-8, 0, -.8], treadmill, Math.PI / 2, [3, 1.8]);

  station('weight', [5.3, 0, 7.4], g => {
    box(g, [.8, .07, .82], [0, .07, 0], m.frameLight, .065);
    box(g, [.76, .015, .77], [0, .117, 0], m.plastic, .05);
    for (const x of [-.2, .2]) for (const z of [-.1, .22]) box(g, [.18, .008, .21], [x, .13, z], m.chrome, .022);
    box(g, [.31, .012, .14], [0, .132, -.22], m.screen, .02);
  }, -.1, [.9, .9]);
  station('calendar', [7.9, 0, 7.6], g => {
    box(g, [1.05, .72, .92], [0, .38, 0], m.timber, .055);
    box(g, [.84, .055, .7], [0, .755, .02], m.fabric, .025);
    for (const x of [-.35, .35]) frame(g, [x, .78, -.2], [x, 1.06, -.2], .04, .04, m.chrome);
    const tablet = box(g, [.74, .98, .08], [0, 1.34, -.17], m.frameLight, .055, [-.5, 0, 0]);
    box(tablet, [.68, .92, .025], [0, 0, .046], m.rubber, .04);
    const map = document.createElement('canvas'); map.width = 640; map.height = 800;
    const c = map.getContext('2d');
    c.fillStyle = '#0b1413'; c.fillRect(0, 0, 640, 800);
    c.fillStyle = '#e7ece4'; c.font = '600 42px sans-serif';
    c.fillText(new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).format(new Date()), 52, 94);
    c.fillStyle = '#798982'; c.font = '22px sans-serif';
    ['一','二','三','四','五','六','日'].forEach((d, i) => c.fillText(d, 62 + i * 77, 164));
    const shanghaiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    const year = shanghaiNow.getFullYear(), month = shanghaiNow.getMonth();
    const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(shanghaiNow.getDate()).padStart(2, '0')}`;
    const trained = new Set(publishedEntries.map(e => e.date));
    try {
      const saved = JSON.parse(localStorage.getItem('inwt-gym-journal-v1') || '{"entries":[]}');
      for (const entry of saved.entries || []) if (entry.date) trained.add(entry.date);
    } catch {}
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const index = offset + d - 1, col = index % 7, row = Math.floor(index / 7);
      const x = 40 + col * 80, y = 196 + row * 82;
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      c.fillStyle = date === today ? '#e9b86a' : trained.has(date) ? '#77c7a5' : '#263633';
      c.beginPath(); c.roundRect(x, y, 54, 54, 10); c.fill();
      c.fillStyle = date === today || trained.has(date) ? '#10201b' : '#c4d0c9';
      c.font = '24px sans-serif'; c.textAlign = 'center'; c.fillText(String(d), x + 27, y + 35);
    }
    c.textAlign = 'left'; c.fillStyle = '#77c7a5'; c.beginPath(); c.roundRect(44, 700, 16, 16, 4); c.fill();
    c.fillStyle = '#9aa9a0'; c.font = '18px sans-serif'; c.fillText('训练日', 70, 715);
    c.fillStyle = '#e9b86a'; c.beginPath(); c.roundRect(174, 700, 16, 16, 4); c.fill();
    c.fillStyle = '#9aa9a0'; c.fillText('今天 · UTC+8', 200, 715);
    const texture = new THREE.CanvasTexture(map); texture.colorSpace = THREE.SRGBColorSpace;
    const display = new THREE.Mesh(new THREE.PlaneGeometry(.64, .8), new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#fff', emissiveIntensity: .7, roughness: .22, metalness: .08 }));
    display.position.set(0, .01, .063); tablet.add(display);
  }, -.35, [1, 1]);

  // Adjustable bench, dumbbell rack, kettlebells and spare plates complete the room.
  const bench = new THREE.Group(); bench.position.set(0, 0, 5.5); bench.rotation.y = 0; scene.add(bench);
  frame(bench, [0, .2, -1], [0, .2, 1.1], .12);
  for (const z of [-.9, 1]) { frame(bench, [-.48, .12, z], [.48, .12, z], .1); foot(bench, -.48, z); foot(bench, .48, z); }
  frame(bench, [0, .2, -.7], [0, .65, -.3], .1);
  frame(bench, [0, .2, .7], [0, .66, .7], .1);
  pad(bench, [.66, .15, 1.4], [0, .73, -.25], [-.09, 0, 0]); pad(bench, [.66, .15, .53], [0, .67, .79]);
  cylinder(bench, .075, .85, [0, .61, .42], m.chrome, [0, 0, Math.PI / 2]);
  const rack = new THREE.Group(); rack.position.set(8.55, 0, 4.2); rack.rotation.y = -Math.PI / 2; scene.add(rack);
  for (const x of [-1.4, 1.4]) { frame(rack, [x, .12, -.3], [x, 1.22, -.18], .1); frame(rack, [x, .12, -.3], [x, .12, .52], .12); foot(rack, x, .5); }
  for (const y of [.55, 1.12]) {
    box(rack, [3.1, .06, .55], [0, y, .04], m.frame, .02, [.14, 0, 0]);
    for (let i = 0; i < 7; i++) {
      const x = -1.25 + i * .42;
      tube(rack, [x - .13, y + .12, .05], [x + .13, y + .12, .05], .032, m.chrome);
      for (const s of [-1, 1]) {
        cylinder(rack, .105 + i * .006, .09, [x + s * .15, y + .13, .05], m.plate, [0, 0, Math.PI / 2], .105 + i * .006, 12);
        cylinder(rack, .05, .012, [x + s * .2, y + .13, .05], m.chrome, [0, 0, Math.PI / 2]);
      }
    }
  }
  return { groups, obstacles, box, cylinder, tube, frame, mesh, pad };
}
