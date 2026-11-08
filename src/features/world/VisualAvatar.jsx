import { useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { SRGBColorSpace } from 'three';
export default function VisualAvatar() {
  const { scene } = useGLTF('/assets/skins/companion_refined.glb');
  const screen = useTexture('/assets/skins/companion_screen.png');
  screen.colorSpace = SRGBColorSpace;
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const result = [];
    scene.traverse((o) => {
      if (o.isMesh) result.push(o);
    });
    return result;
  }, [scene]);
  return (
    <group name="p9-ceramic-avatar" userData={{ visualOnly: true }}>
      {parts.map((o) => (
        <mesh
          key={o.uuid}
          name={o.name}
          geometry={o.geometry}
          material={o.material}
          matrix={o.matrixWorld}
          matrixAutoUpdate={false}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
