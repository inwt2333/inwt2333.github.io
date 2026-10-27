import * as THREE from 'three';

// Deterministic micro-textures: no per-frame noise, no third-party requests.
export function createMaterials(renderer, onUpdate = () => {}) {
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  let seed = 1597;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function texture(kind, repeat = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const index = (y * 512 + x) * 4;
      let value;
      if (kind === 'wood') value = 120 + 20 * Math.sin(x * .15 + 2 * Math.sin(y * .006)) + 8 * Math.sin(x * .55 + y * .006) + random() * 20;
      else if (kind === 'leather') value = 115 + random() * 85 + Math.sin(x * 2) * Math.sin(y * 2) * 18;
      else if (kind === 'rubber') value = random() > .985 ? 180 : 55 + random() * 50;
      else value = 125 + random() * 35 + 10 * Math.sin(x * .025) * Math.cos(y * .03);
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const result = new THREE.CanvasTexture(canvas);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(repeat, repeat);
    result.anisotropy = anisotropy;
    return result;
  }
  const leather = texture('leather', 2);
  const powder = texture('concrete', 3);
  const wood = texture('wood');
  const rubber = texture('rubber', 5);
  const material = (color, roughness = .6, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const m = {
    frame: material('#252c2a', .4, .28, { bumpMap: powder, bumpScale: .0008, envMapIntensity: .9 }),
    frameLight: material('#65716c', .4, .75, { envMapIntensity: 1.05 }),
    chrome: material('#bec8c6', .24, 1, { envMapIntensity: 1.3 }),
    steel: material('#555d60', .43, .85),
    bolt: material('#9ca4a3', .27, 1),
    upholstery: material('#242b27', .8, 0),
    upholsteryWarm: material('#78573d', .83, 0),
    seam: material('#4d5146', .76),
    rubber: material('#1b1e1d', .88, 0, { bumpMap: rubber, bumpScale: .009 }),
    plate: material('#282b2a', .5, .6, { bumpMap: powder, bumpScale: .005 }),
    plastic: material('#1c2323', .45, .1),
    cable: material('#4e5452', .5, .7),
    brass: material('#aa9160', .3, .8),
    glass: new THREE.MeshPhysicalMaterial({ color: '#a8c6cb', metalness: .1, roughness: .13, transparent: true, opacity: .08, side: THREE.DoubleSide, depthWrite: false }),
    floor: material('#b9b4a7', .62, 0),
    floorRubber: material('#303333', .9, .02, { bumpMap: rubber, bumpScale: .025 }),
    concrete: material('#494b47', .9, 0, { bumpMap: powder, bumpScale: .03 }),
    wall: material('#6b7065', .95, 0),
    ceiling: material('#212725', .85),
    timber: material('#9b8060', .72, 0, { map: wood, bumpMap: wood, bumpScale: .012 }),
    fabric: material('#c3c0aa', .95, 0, { bumpMap: leather, bumpScale: .025 }),
    soil: material('#252b21', 1),
    leaf: material('#304d32', .55),
    pot: material('#5b5e50', .8, 0, { bumpMap: powder, bumpScale: .02 }),
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe3af').multiplyScalar(1.6) }),
    ledWhite: new THREE.MeshBasicMaterial({ color: new THREE.Color('#e4f0f0').multiplyScalar(1.5) }),
    screen: material('#172726', .24, .2, { emissive: '#31534b', emissiveIntensity: .35 }),
  };
  const loader = new THREE.TextureLoader();
  // CC0 photographic concrete from Poly Haven, served from this site.
  const paths = ['concrete-color.jpg', 'concrete-normal.jpg'];
  paths.forEach((path, index) => {
    const map = loader.load(`textures/${path}`, () => onUpdate(), undefined, () => {});
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(5, 5);
    map.anisotropy = anisotropy;
    if (index === 0) { map.colorSpace = THREE.SRGBColorSpace; m.floor.map = map; }
    if (index === 1) { m.floor.normalMap = map; m.floor.normalScale = new THREE.Vector2(.065, .065); }
  });
  // Photographic grain and roughness keep leather highlights broad and uneven;
  // plaster uses its own pores rather than the powder-coat noise of metal.
  function surface(prefix, targets, repeat, normalScale) {
    for (const [suffix, slot] of [['diff', 'map'], ['nor_gl', 'normalMap'], ['rough', 'roughnessMap']]) {
      const map = loader.load(`textures/${prefix}-${suffix}.webp`, () => onUpdate(), undefined, () => {});
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(repeat, repeat);
      map.anisotropy = anisotropy;
      if (slot === 'map') map.colorSpace = THREE.SRGBColorSpace;
      for (const target of targets) { target[slot] = map; target.normalScale = new THREE.Vector2(normalScale, normalScale); }
    }
  }
  surface('leather', [m.upholstery, m.upholsteryWarm], 1.3, .22);
  surface('plaster', [m.wall, m.concrete], 1, .24);
  return m;
}
