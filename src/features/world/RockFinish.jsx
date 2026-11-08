import ToonMaterial from '../npr/ToonMaterial';
import { useTexture } from '@react-three/drei';
import { SRGBColorSpace, RepeatWrapping, Vector2, Color } from 'three';
export default function RockFinish({ metal = false, color = '#a8b3bd', ...props }) {
  const [map, normal, rough] = useTexture([
    '/assets/skins/rock_albedo.png',
    '/assets/skins/sand_micro_normal.png',
    '/assets/skins/rock_roughness.png',
  ]);
  map.colorSpace = SRGBColorSpace;
  for (const t of [map, normal, rough]) t.wrapS = t.wrapT = RepeatWrapping;
  return (
    <meshPhysicalMaterial
      color={color}
      map={map}
      normalMap={normal}
      normalScale={new Vector2(0.4, 0.4)}
      roughnessMap={rough}
      roughness={metal ? 0.55 : 1}
      metalness={metal ? 0.6 : 0.02}
      clearcoat={metal ? 0.35 : 0}
      specularIntensity={metal ? 0.7 : 0.2}
      {...props}
    />
  );
}

export function RockToonFinish({ color }) {
  const [map, normal] = useTexture([
    '/assets/skins/rock_albedo.png',
    '/assets/skins/sand_micro_normal.png',
  ]);
  map.colorSpace = SRGBColorSpace;
  return (
    <meshPhysicalMaterial
      color={color.clone().lerp(new Color('#e8eef5'), 0.8)}
      emissive={color}
      emissiveIntensity={0.025}
      map={map}
      normalMap={normal}
      normalScale={new Vector2(0.7, 0.7)}
      roughness={0.84}
      metalness={0.08}
      clearcoat={0.03}
    />
  );
}
