import { useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace, Vector2 } from 'three';
import ToonMaterial from '../npr/ToonMaterial';

// Render-only surface. Physics retains its original explicit cylinders and boxes.
export default function IslandSkin({ id, accent, hub = false }) {
  const { scene } = useGLTF('/assets/skins/island_skin.glb');
  const textures = useTexture([
    '/assets/skins/rock_albedo.png',
    '/assets/skins/sand_micro_normal.png',
    '/assets/skins/rock_roughness.png',
    '/assets/skins/metal_albedo.png',
  ]);
  const [rock, normal, roughness, metal] = textures;
  useMemo(() => {
    textures.forEach((t) => {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.anisotropy = 8;
    });
    rock.colorSpace = metal.colorSpace = SRGBColorSpace;
  }, [textures, rock, metal]);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const result = [];
    scene.traverse((o) => {
      if (o.isMesh) result.push(o);
    });
    return result;
  }, [scene]);
  return (
    <group
      name={'space-island-' + id}
      scale={[hub ? 3.98 / 4.78 : 1, 1, hub ? 3.98 / 4.78 : 1]}
      userData={{ visualOnly: true, source: 'Blender MCP', walkPlane: 0.008 }}
    >
      {parts.map((o) => (
        <mesh
          key={o.uuid}
          name={o.name}
          geometry={o.geometry}
          matrix={o.matrixWorld}
          matrixAutoUpdate={false}
          receiveShadow
          castShadow
        >
          {o.name.includes('Cliff') ? (
            <ToonMaterial
              color="#647a98"
              map={rock}
              normalMap={normal}
              normalScale={new Vector2(0.65, 0.65)}
              finish="cliff"
            />
          ) : o.name.includes('Rim') ? (
            <meshPhysicalMaterial
              color={accent}
              map={metal}
              metalness={0.84}
              roughness={0.26}
              clearcoat={0.7}
              emissive={accent}
              emissiveIntensity={0.18}
            />
          ) : (
            <meshPhysicalMaterial
              color="#b1bbc0"
              map={rock}
              normalMap={normal}
              normalScale={new Vector2(0.45, 0.45)}
              roughnessMap={roughness}
              roughness={1}
              specularIntensity={0.3}
              metalness={0.02}
              clearcoat={0}
            />
          )}
        </mesh>
      ))}
      <mesh position={[0, -1.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.95, 0.022, 8, 192]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  );
}
