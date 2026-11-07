import ToonMaterial from '../npr/ToonMaterial';
import { Vector2 } from 'three';

const profile = [
  [0, -1.08],
  [2.95, -1.08],
  [3.09, -0.98],
  [3.18, -0.24],
  [3.35, -0.14],
  [3.35, -0.07],
  [3.23, 0],
  [0, 0],
].map(([radius, height]) => new Vector2(radius, height));

export function deckFinish(shader) {
  shader.vertexShader =
    'varying vec2 deckPoint;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ndeckPoint = position.xy;',
    );
  shader.fragmentShader =
    'varying vec2 deckPoint;\n' +
    shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
    vec2 tile = deckPoint * 0.52;
    vec2 joint = abs(fract(tile + 0.5) - 0.5);
    vec2 aa = max(fwidth(tile), vec2(0.003));
    vec2 seam = 1.0 - smoothstep(vec2(0.009), vec2(0.009) + aa, joint);
    float joinLine = max(seam.x, seam.y);
    float grain = 0.5 + 0.5 * sin(dot(floor(tile), vec2(0.74, 1.87)));
    diffuseColor.rgb *= (0.89 + grain * 0.15) * (1.0 - 0.25 * joinLine);
    roughnessFactor = clamp(roughnessFactor + (grain - 0.5) * 0.12 + joinLine * 0.12, 0.0, 1.0);`,
    );
}

export default function IslandDeck({ island, detailed, tier }) {
  const refined = detailed && tier >= 2;
  const segments = refined ? 48 : 16;
  return (
    <>
      <mesh name={island.id === 'dashboard' ? 'npr-observatory-deck' : undefined}>
        <latheGeometry args={[profile, segments]} />
        {island.id === 'dashboard' ? (
          <ToonMaterial finish="cliff" color="#698dc1" />
        ) : (
          <meshStandardMaterial color="#313b4c" metalness={0.48} roughness={0.42} />
        )}
      </mesh>
      <mesh name="island-deck-surface" position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.19, segments]} />
        {island.id === 'dashboard' ? (
          <ToonMaterial finish="deck" color="#82b8bb" />
        ) : (
          <meshStandardMaterial
            color="#273341"
            metalness={0.33}
            roughness={0.46}
            key={refined ? 'machined' : 'plain'}
            {...(refined ? { onBeforeCompile: deckFinish } : {})}
          />
        )}
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.98, 3.04, segments]} />
        {island.id === 'dashboard' ? (
          <ToonMaterial color="#ffe1a3" emissive="#ffb96d" emissiveIntensity={0.3} />
        ) : (
          <meshStandardMaterial
            color={island.accent}
            emissive={island.accent}
            emissiveIntensity={refined ? 0.83 : 0.32}
            roughness={0.36}
          />
        )}
      </mesh>
      {island.id === 'dashboard' &&
        [-0.23, -0.86].map((y, i) => (
          <mesh
            key={y}
            name="npr-observatory-rim"
            position={[0, y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[i ? 3.08 : 3.21, i ? 0.018 : 0.025, 6, segments]} />
            <ToonMaterial color="#8bd9da" emissive="#4ab7c7" emissiveIntensity={0.38} />
          </mesh>
        ))}
    </>
  );
}
