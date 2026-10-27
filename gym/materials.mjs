import * as THREE from 'three';

// Deterministic micro-textures: no per-frame noise, no third-party requests.
export async function createMaterials(renderer) {
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
    frame: material('#252c2a', .38, .72, { bumpMap: powder, bumpScale: .004, envMapIntensity: 1.1 }),
    frameLight: material('#65716c', .4, .75, { envMapIntensity: 1.05 }),
    chrome: material('#bec8c6', .24, 1, { envMapIntensity: 1.3 }),
    steel: material('#555d60', .43, .85),
    bolt: material('#9ca4a3', .27, 1),
    upholstery: material('#242925', .74, 0, { bumpMap: leather, bumpScale: .004 }),
    upholsteryWarm: material('#69513d', .8, 0, { bumpMap: leather, bumpScale: .004 }),
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
    wall: material('#535950', .82, 0, { bumpMap: powder, bumpScale: .014 }),
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
  const maps = await Promise.all(paths.map(path => loader.loadAsync(`textures/${path}`).catch(() => null)));
  for (const map of maps) if (map) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(5, 5);
    map.anisotropy = anisotropy;
  }
  if (maps[0]) { maps[0].colorSpace = THREE.SRGBColorSpace; m.floor.map = maps[0]; }
  if (maps[1]) { m.floor.normalMap = maps[1]; m.floor.normalScale = new THREE.Vector2(.065, .065); }
  return m;
}
