import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { DataTexture, RGBAFormat, Vector3, Raycaster, Matrix3 } from 'three';
// Render-only contact decal follows the actual terrain normal and fades during jumps.
export default function PlayerContactShadow() {
  const mesh = useRef();
  const data = useMemo(() => {
    const a = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const r = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5),
          i = (y * 64 + x) * 4;
        a[i] = a[i + 1] = a[i + 2] = 4;
        a[i + 3] = Math.round(Math.max(0, 1 - r) ** 2 * 145);
      }
    const t = new DataTexture(a, 64, 64, RGBAFormat);
    t.needsUpdate = true;
    return t;
  }, []);
  useEffect(() => () => data.dispose(), [data]);
  const scratch = useMemo(
    () => ({
      p: new Vector3(),
      ray: new Raycaster(),
      normal: new Vector3(),
      matrix: new Matrix3(),
      axis: new Vector3(0, 0, 1),
    }),
    [],
  );
  useFrame(({ scene, camera }) => {
    const pet = scene.getObjectByName('p9-player-shell');
    if (!pet || !mesh.current) return;
    pet.getWorldPosition(scratch.p);
    scratch.ray.set(scratch.p, new Vector3(0, -1, 0));
    scratch.ray.far = 5;
    const hit = scratch.ray.intersectObjects(
      [scene.getObjectByName('p9-world-graybox'), scene.getObjectByName('p9-m1-course')].filter(
        Boolean,
      ),
      true,
    )[0];
    mesh.current.visible = !!hit && !camera.userData.teleport && camera.userData.fpsBlend < 0.95;
    if (!hit) return;
    scratch.normal
      .copy(hit.face.normal)
      .applyNormalMatrix(scratch.matrix.getNormalMatrix(hit.object.matrixWorld));
    mesh.current.position.copy(hit.point).addScaledVector(scratch.normal, 0.012);
    mesh.current.quaternion.setFromUnitVectors(scratch.axis, scratch.normal);
    mesh.current.material.opacity = Math.max(0, 1 - Math.max(0, hit.distance - 0.67) * 0.65);
  }, 0.1);
  return (
    <mesh ref={mesh} name="p9-contact-shadow" renderOrder={2}>
      <planeGeometry args={[1.05, 0.8]} />
      <meshBasicMaterial
        map={data}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
      />
    </mesh>
  );
}
