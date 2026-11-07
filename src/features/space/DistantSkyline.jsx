import ToonMaterial from '../npr/ToonMaterial';
import { useLayoutEffect, useRef } from 'react';
import { Color, Object3D, ShaderChunk } from 'three';

function skylineFog(shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <fog_fragment>',
    ShaderChunk.fog_fragment.replace('fogDensity * fogDensity', '0.52 * fogDensity * fogDensity'),
  );
}

const rows = 3;
const sectors = 20;

export default function DistantSkyline({ tier }) {
  const count = tier === 3 ? 160 : 120;
  const towers = useRef(null);
  const windows = useRef(null);
  useLayoutEffect(() => {
    const pose = new Object3D();
    const tint = new Color();
    for (let i = 0; i < count; i++) {
      const sector = i % sectors;
      const slot = Math.floor(i / sectors);
      const angle =
        (sector * Math.PI * 2) / sectors + (slot - 3) * 0.022 + Math.sin(i * 0.86) * 0.014;
      const radius = 60 + ((i * 43 + slot * 3) % 501) * 0.1;
      const width = 0.65 + ((i * 7) % 11) * 0.14;
      const height = 7 + ((i * 17) % 29) * 0.43 + (slot % 5 === 0 ? 3.2 : 0);
      const depth = width * 0.75;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -1.16;
      pose.rotation.y = Math.atan2(-x, -z);
      pose.position.set(x, y + height / 2, z);
      pose.scale.set(width, height, depth);
      pose.updateMatrix();
      towers.current.setMatrixAt(i, pose.matrix);
      towers.current.setColorAt(i, tint.set(i % 4 === 0 ? '#8096bc' : '#526987'));

      const face = depth / 2 + 0.035;
      for (let row = 0; row < rows; row++) {
        const index = i * rows + row;
        pose.position.set(
          x + Math.sin(pose.rotation.y) * face,
          y + height * (0.54 + row * 0.14),
          z + Math.cos(pose.rotation.y) * face,
        );
        pose.scale.set(width * (row === 2 ? 0.38 : 0.65), 0.15 + width * 0.04, 0.035);
        pose.updateMatrix();
        windows.current.setMatrixAt(index, pose.matrix);
        windows.current.setColorAt(index, tint.set((i + row) % 4 === 0 ? '#ffc18e' : '#7cb6ce'));
      }
    }
    for (const batch of [towers.current, windows.current]) {
      batch.instanceMatrix.needsUpdate = true;
      batch.instanceColor.needsUpdate = true;
      batch.computeBoundingSphere();
    }
  }, [count]);

  return (
    <group name="valley-far-skyline">
      <instancedMesh name="valley-megastructures" ref={towers} args={[null, null, count]}>
        <boxGeometry />
        <ToonMaterial flatShading onBeforeCompile={skylineFog} />
      </instancedMesh>
      <instancedMesh
        name="valley-megastructure-windows"
        ref={windows}
        args={[null, null, count * rows]}
      >
        <boxGeometry />
        <ToonMaterial
          color="#a3c6d2"
          emissive="#6d94af"
          emissiveIntensity={0.45}
          onBeforeCompile={skylineFog}
        />
      </instancedMesh>
    </group>
  );
}
