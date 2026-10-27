import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/three/addons/utils/BufferGeometryUtils.js';

// One draw call per shared material, preserving each interactive object's identity.
export function batchStaticGroup(group, station = null) {
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert();
  const buckets = new Map();
  group.traverse(object => {
    if (!object.isMesh || object.isReflector || Array.isArray(object.material)) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { material: object.material, cast: object.castShadow, receive: object.receiveShadow, geometries: [] });
    const shape = object.geometry.clone();
    shape.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    // Rounded boxes and cylinders expose different topology; merge as triangles.
    const flat = shape.index ? shape.toNonIndexed() : shape;
    if (flat !== shape) shape.dispose();
    buckets.get(key).geometries.push(flat);
  });
  group.clear();
  for (const bucket of buckets.values()) {
    const shape = mergeGeometries(bucket.geometries, false);
    for (const source of bucket.geometries) source.dispose();
    if (!shape) continue;
    shape.computeBoundingSphere();
    const object = new THREE.Mesh(shape, bucket.material);
    object.castShadow = bucket.cast; object.receiveShadow = bucket.receive;
    if (station) object.userData.station = station;
    group.add(object);
  }
}
