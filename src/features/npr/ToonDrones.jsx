import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, ConeGeometry, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import ToonMaterial from './ToonMaterial';
// Distant survey craft: one instanced draw, a broad readable wing silhouette.
export default function ToonDrones({ paused, reduced }) {
  const mesh = useRef(),
    time = useRef(0);
  const geometry = useMemo(() => {
    const body = new ConeGeometry(0.18, 0.85, 4);
    body.rotateX(Math.PI / 2);
    const wing = new BoxGeometry(1.7, 0.07, 0.22);
    wing.translate(0, 0, 0.1);
    const tail = new BoxGeometry(0.6, 0.06, 0.18);
    tail.translate(0, 0, -0.35);
    const merged = mergeGeometries([body, wing, tail]);
    [body, wing, tail].forEach((g) => g.dispose());
    return merged;
  }, []);
  const pose = useMemo(() => new Object3D(), []);
  const update = () => {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + time.current * 0.018,
        radius = 30 + (i % 3) * 5;
      pose.position.set(Math.cos(a) * radius, 5 + (i % 4) * 1.7, Math.sin(a) * radius);
      pose.rotation.set(0, -a, 0.12);
      pose.scale.setScalar(0.8 + (i % 3) * 0.15);
      pose.updateMatrix();
      mesh.current.setMatrixAt(i, pose.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    update();
    mesh.current.computeBoundingSphere();
    mesh.current.boundingSphere.radius = 60;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, dt) => {
    if (!paused && !reduced) {
      time.current += Math.min(dt, 0.05);
      update();
    }
  });
  return (
    <instancedMesh ref={mesh} name="npr-survey-drones" args={[geometry, null, 8]}>
      <ToonMaterial color="#b2c8da" flatShading emissive="#314e69" emissiveIntensity={0.15} />
    </instancedMesh>
  );
}
