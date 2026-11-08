import { useLayoutEffect, useMemo, useRef, useEffect } from 'react';
import { BoxGeometry, CylinderGeometry, ConeGeometry, Matrix4, Object3D, Color } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export default function CelestialSkyline() {
  const buildings = useRef(),
    windows = useRef();
  const layout = useMemo(() => {
    const bodies = [],
      lights = [];
    for (let i = 0; i < 84; i++) {
      const a = i * 2.399963,
        r = 54 + (i % 5) * 10,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        w = 1.25 + (i % 4) * 0.5,
        h = 10 + ((i * 7) % 19);
      const yaw = Math.atan2(-x, -z);
      bodies.push({ x, z, w, h, yaw });
      for (let row = 0; row < 13; row++)
        for (let col = 0; col < 5; col++) {
          if ((i * 13 + row * 7 + col * 19) % 7 < 2) continue;
          const px = (-0.34 + col * 0.17) * w,
            pz = 0.412 * w;
          lights.push({
            x: x + Math.cos(yaw) * px + Math.sin(yaw) * pz,
            y: -2 + h * (0.07 + row * 0.041),
            z: z - Math.sin(yaw) * px + Math.cos(yaw) * pz,
            yaw,
            w: w * 0.075,
            h: h * 0.009,
            warm: (i + row + col) % 5 === 0,
          });
          const sx = 0.512 * w,
            sz = (-0.26 + col * 0.13) * w;
          lights.push({
            x: x + Math.cos(yaw) * sx + Math.sin(yaw) * sz,
            y: -2 + h * (0.07 + row * 0.041),
            z: z - Math.sin(yaw) * sx + Math.cos(yaw) * sz,
            yaw: yaw + Math.PI / 2,
            w: w * 0.07,
            h: h * 0.009,
            warm: (i + row) % 6 === 0,
          });
        }
    }
    return { bodies, lights };
  }, []);
  const geometry = useMemo(() => {
    const parts = [];
    function add(g, x, y, z, rz = 0) {
      g.applyMatrix4(new Matrix4().makeRotationZ(rz));
      g.translate(x, y, z);
      parts.push(g);
    }
    add(new BoxGeometry(1, 0.65, 0.8), 0, 0.325, 0);
    add(new CylinderGeometry(0.28, 0.43, 0.28, 8), 0, 0.79, 0);
    add(new BoxGeometry(0.65, 0.025, 0.9), 0, 0.67, 0);
    for (const s of [-1, 1]) {
      add(new BoxGeometry(0.13, 0.63, 0.18), s * 0.65, 0.35, 0, s * 0.13);
      add(new BoxGeometry(0.12, 0.22, 0.15), s * 0.25, 1.01, 0);
      add(new BoxGeometry(0.4, 0.025, 0.14), s * 0.55, 0.56, 0);
    }
    add(new ConeGeometry(0.48, 0.22, 6), 0, -0.11, 0, Math.PI);
    const merged = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    return merged;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const p = new Object3D(),
      c = new Color();
    layout.bodies.forEach((b, i) => {
      p.position.set(b.x, -2, b.z);
      p.rotation.set(0, b.yaw, 0);
      p.scale.set(b.w, b.h, b.w);
      p.updateMatrix();
      buildings.current.setMatrixAt(i, p.matrix);
      buildings.current.setColorAt(i, c.set(i % 3 ? '#233e5e' : '#344b70'));
    });
    layout.lights.forEach((l, i) => {
      p.position.set(l.x, l.y, l.z);
      p.rotation.set(0, l.yaw, 0);
      p.scale.set(l.w, l.h, 0.025);
      p.updateMatrix();
      windows.current.setMatrixAt(i, p.matrix);
      windows.current.setColorAt(i, c.set(l.warm ? '#efbc83' : '#80b5d2'));
    });
    for (const m of [buildings.current, windows.current]) {
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [layout]);
  return (
    <group name="p9-detailed-skyline">
      <instancedMesh
        name="p9-tiered-megastructures"
        ref={buildings}
        args={[geometry, null, layout.bodies.length]}
      >
        <meshStandardMaterial roughness={0.65} metalness={0.35} />
      </instancedMesh>
      <instancedMesh name="p9-window-grid" ref={windows} args={[null, null, layout.lights.length]}>
        <boxGeometry />
        <meshBasicMaterial color="#a9c1d3" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
