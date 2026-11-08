import { useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, Matrix4, Quaternion, Euler, BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import ToonMaterial from '../npr/ToonMaterial';
import { RockToonFinish } from './RockFinish';
import { ANCHORS } from './poi';
import { CrystalClusters } from './RefinedAssets';

export const ASSET_LAYOUT = {
  stone_tablet: [
    { p: [2.2, 0.02, 2.8], s: 1, r: Math.PI },
    ...ANCHORS.map((a, i) => ({
      p: [a.position[0] - 2.1, 0.02, a.position[2] + 1.2],
      s: 0.85,
      r: Math.PI + i * 0.4,
    })),
  ],
  crystals: [],
  rocks: [],
};
for (const [index, a] of [{ position: [0, 0, 0] }, ...ANCHORS].entries()) {
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + 0.17,
      radius = index ? 3.6 : 3.05;
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    if (Math.abs(x) < 1.25 || (!index && x > 1 && z > 1.2)) continue;
    ASSET_LAYOUT.crystals.push({
      p: [a.position[0] + x, 0.03, a.position[2] + z],
      s: 0.65 + (i % 3) * 0.19,
      r: angle,
    });
    ASSET_LAYOUT.rocks.push({
      p: [a.position[0] + x * 1.1, 0.04, a.position[2] + z * 1.1],
      s: 0.75 + (i % 2) * 0.4,
      r: -angle,
    });
  }
}
function Batch({ part, placements, kind }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const matrix = new Matrix4(),
      q = new Quaternion(),
      v = new Vector3(),
      scale = new Vector3();
    placements.forEach((p, i) => {
      q.setFromEuler(new Euler(0, p.r, 0));
      matrix.compose(v.fromArray(p.p), q, scale.setScalar(p.s));
      ref.current.setMatrixAt(i, matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [placements]);
  return (
    <instancedMesh
      ref={ref}
      name={part.glow ? 'npr-plant-lights' : 'blender-' + kind}
      args={[part.geometry, undefined, placements.length]}
      userData={{ source: kind + '.glb', instances: placements.length }}
    >
      {!part.glow && kind !== 'crystals' ? (
        <RockToonFinish color={part.color} />
      ) : (
        <ToonMaterial
          color={part.color}
          flatShading
          emissive={part.emissive}
          emissiveIntensity={part.glow ? Math.min(1.35, part.intensity) : part.intensity}
        />
      )}
    </instancedMesh>
  );
}
export function Asset({ kind, colliderWrapper, visualPlacements }) {
  const { scene } = useGLTF('/assets/models/' + kind + '.glb');
  const model = useMemo(() => {
    scene.updateMatrixWorld(true);
    const groups = new Map();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const key = o.material.uuid;
      if (!groups.has(key)) groups.set(key, { source: o.material, geometries: [] });
      let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (g.index) {
        const flat = g.toNonIndexed();
        g.dispose();
        g = flat;
      }
      for (const key of Object.keys(g.attributes))
        if (!['position', 'normal'].includes(key)) g.deleteAttribute(key);
      groups.get(key).geometries.push(g);
    });
    const bounds = new Box3();
    const parts = [...groups.values()].map((g) => {
      const geometry = mergeGeometries(g.geometries);
      g.geometries.forEach((p) => p.dispose());
      // Projection UVs affect shading only; original positions/normals/bounds stay intact.
      const pos = geometry.attributes.position,
        normals = geometry.attributes.normal,
        uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const nx = Math.abs(normals.getX(i)),
          ny = Math.abs(normals.getY(i)),
          nz = Math.abs(normals.getZ(i));
        uv[i * 2] = (nx > nz ? pos.getZ(i) : pos.getX(i)) * 0.7;
        uv[i * 2 + 1] = (ny > Math.max(nx, nz) ? pos.getZ(i) : pos.getY(i)) * 0.7;
      }
      geometry.setAttribute('uv', new BufferAttribute(uv, 2));
      geometry.computeBoundingBox();
      bounds.union(geometry.boundingBox);
      return {
        geometry,
        color: g.source.color.clone(),
        emissive: g.source.emissive.clone(),
        intensity: g.source.emissiveIntensity,
        glow: g.source.emissive.getHex() !== 0,
      };
    });
    return { parts, bounds };
  }, [scene]);
  useEffect(() => () => model.parts.forEach((p) => p.geometry.dispose()), [model]);
  const placements = visualPlacements || ASSET_LAYOUT[kind];
  return (
    <group
      name={'blender-assets-' + kind}
      userData={{ source: kind + '.glb', count: placements.length }}
    >
      {kind === 'crystals' ? (
        <CrystalClusters placements={placements} />
      ) : (
        model.parts.map((p, i) => <Batch key={i} part={p} kind={kind} placements={placements} />)
      )}
      {colliderWrapper &&
        placements.map((p, i) => {
          const transform = new Matrix4().compose(
            new Vector3(...p.p),
            new Quaternion().setFromEuler(new Euler(0, p.r, 0)),
            new Vector3().setScalar(p.s),
          );
          const bounds = model.bounds.clone().applyMatrix4(transform),
            center = bounds.getCenter(new Vector3()).toArray(),
            half = bounds.getSize(new Vector3()).multiplyScalar(0.5).toArray();
          return colliderWrapper({ key: kind + i, position: center, half });
        })}
    </group>
  );
}
export default function BlenderAssets({ colliderWrapper }) {
  return (
    <group name="p9-blender-assets">
      {Object.keys(ASSET_LAYOUT).map((kind) => (
        <Asset key={kind} kind={kind} colliderWrapper={colliderWrapper} />
      ))}
    </group>
  );
}
