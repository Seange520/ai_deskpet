import { useMemo, useLayoutEffect, useRef } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import {
  Matrix4,
  Quaternion,
  Euler,
  Vector3,
  SRGBColorSpace,
  RepeatWrapping,
  Vector2,
} from 'three';
import RockFinish from './RockFinish';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function TempleSkin({ accent }) {
  const { scene } = useGLTF('/assets/skins/temple_refined.glb');
  const [map, normal] = useTexture([
    '/assets/skins/rock_albedo.png',
    '/assets/skins/sand_micro_normal.png',
  ]);
  map.colorSpace = SRGBColorSpace;
  normal.wrapS = normal.wrapT = RepeatWrapping;
  normal.anisotropy = 8;
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const result = [];
    scene.traverse((o) => {
      if (o.isMesh) result.push(o);
    });
    return result;
  }, [scene]);
  return (
    <group name="p9-refined-temple" userData={{ visualOnly: true }}>
      {parts.map((o) => (
        <mesh
          key={o.uuid}
          name={o.name}
          geometry={o.geometry}
          matrix={o.matrixWorld}
          matrixAutoUpdate={false}
          castShadow
          receiveShadow
        >
          {o.material.name.includes('Limestone') ? (
            <meshPhysicalMaterial
              map={map}
              color="#d6e0df"
              normalMap={normal}
              normalScale={new Vector2(0.32, 0.32)}
              roughness={0.85}
              metalness={0.05}
            />
          ) : o.material.name.includes('Rune') ? (
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={1.35}
              roughness={0.3}
              metalness={0.15}
            />
          ) : (
            <primitive object={o.material} attach="material" />
          )}
        </mesh>
      ))}
    </group>
  );
}
export function CrystalClusters({ placements }) {
  const { scene } = useGLTF('/assets/skins/crystal_refined.glb');
  const geometry = useMemo(() => {
    scene.updateMatrixWorld(true);
    const gs = [];
    scene.traverse((o) => {
      if (o.isMesh) gs.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
    });
    const g = mergeGeometries(gs);
    gs.forEach((x) => x.dispose());
    return g;
  }, [scene]);
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new Matrix4(),
      q = new Quaternion(),
      s = new Vector3(),
      v = new Vector3();
    placements.forEach((p, i) => {
      m.compose(v.fromArray(p.p), q.setFromEuler(new Euler(0, p.r, 0)), s.setScalar(p.s));
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [placements]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, null, placements.length]}
      name="p9-refractive-crystal-clusters"
      userData={{ visualOnly: true }}
    >
      <meshPhysicalMaterial
        color="#73b8cb"
        roughness={0.12}
        metalness={0.04}
        transmission={0.72}
        thickness={0.38}
        ior={1.46}
        attenuationColor="#3cabc3"
        attenuationDistance={1.6}
        clearcoat={1}
        clearcoatRoughness={0.12}
        emissive="#278baf"
        emissiveIntensity={0.28}
        envMapIntensity={1.8}
      />
    </instancedMesh>
  );
}

export function BrokenSteps({ position, scale = 1 }) {
  const { scene } = useGLTF('/assets/skins/broken_steps.glb');
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const list = [];
    scene.traverse((o) => {
      if (o.isMesh) list.push(o);
    });
    return list;
  }, [scene]);
  return (
    <group
      name="p9-broken-stone-steps"
      position={position}
      scale={scale}
      userData={{ visualOnly: true }}
    >
      {parts.map((o) => (
        <mesh
          key={o.uuid}
          geometry={o.geometry}
          matrix={o.matrixWorld}
          matrixAutoUpdate={false}
          castShadow
          receiveShadow
        >
          <RockFinish color="#a6b2bb" />
        </mesh>
      ))}
    </group>
  );
}
