import { useEffect, useMemo, useRef } from 'react';
import { MeshTransmissionMaterial, useFBO } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { ConeGeometry } from 'three';
import { useSpaceStore } from '../spaceStore';

function addFresnel(shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `
    float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
    outgoingLight += vec3(0.61, 0.31, 0.91) * rim * 0.65;
    diffuseColor.a += rim * 0.21;
    #include <opaque_fragment>
    `,
  );
}

function RefractiveGlass({ shell }) {
  const capture = useFBO(384, 240);
  useFrame(({ gl, scene, camera }) => {
    if (gl.getContext().isContextLost()) return;
    const target = gl.getRenderTarget();
    shell.current.visible = false;
    try {
      gl.setRenderTarget(capture);
      gl.clear();
      gl.render(scene, camera);
    } finally {
      shell.current.visible = true;
      gl.setRenderTarget(target);
    }
  }, -0.1);

  // Drei supplies the physical shader with this owned buffer instead of Three's full-screen cache.
  return (
    <MeshTransmissionMaterial
      name="p5-physical-glass"
      buffer={capture.texture}
      resolution={1}
      transmission={1}
      thickness={0.6}
      roughness={0.05}
      ior={1.5}
      samples={2}
      chromaticAberration={0}
      color="#eee1ff"
      attenuationColor="#e1b8fa"
      attenuationDistance={4}
    />
  );
}

function GlassPyramid({ tier }) {
  const shell = useRef(null);
  const shape = useMemo(() => new ConeGeometry(2.26, 2.78, 4), []);
  const nearby = useSpaceStore(
    ({ focus, destination }) => focus === 'ranking' || destination === 'ranking',
  );
  useEffect(() => () => shape.dispose(), [shape]);

  return (
    <group position={[0, 1.65, 0]} rotation={[0, Math.PI / 4, 0]}>
      <mesh ref={shell} name="p5-ranking-pyramid" geometry={shape}>
        {tier === 3 && nearby ? (
          <RefractiveGlass shell={shell} />
        ) : tier >= 2 ? (
          <meshStandardMaterial
            name="p5-fake-glass"
            color="#b58cea"
            emissive="#6d449a"
            emissiveIntensity={0.35}
            metalness={0.1}
            roughness={0.22}
            transparent
            opacity={0.18}
            depthWrite={false}
            onBeforeCompile={addFresnel}
          />
        ) : (
          <meshBasicMaterial color="#a67ce6" transparent opacity={0.25} depthWrite={false} />
        )}
      </mesh>
      <lineSegments>
        <edgesGeometry args={[shape]} />
        <lineBasicMaterial
          color={tier === 1 ? '#dfaaff' : '#d2a7ff'}
          transparent
          opacity={tier === 3 ? 0.7 : 0.9}
        />
      </lineSegments>
    </group>
  );
}

function Hologram({ tier, paused, reduced }) {
  const hologram = useRef(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (paused || reduced || tier === 1) return;
    elapsed.current += Math.min(delta, 0.05);
    hologram.current.position.y = 0.83 + Math.sin(elapsed.current * 1.45) * 0.095;
  });

  return (
    <group name="p5-ranking-hologram" ref={hologram} position={[0, 0.83, 0]}>
      <mesh>
        <cylinderGeometry args={[0.95, 0.76, 0.18, 4]} />
        <meshStandardMaterial
          color="#5e2d77"
          emissive="#c258ff"
          emissiveIntensity={tier >= 2 ? 1.05 : 0.44}
        />
      </mesh>
      <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.59, 0.68, 4]} />
        <meshStandardMaterial
          color="#ffbe68"
          emissive="#ffb25c"
          emissiveIntensity={tier >= 2 ? 2 : 0.6}
        />
      </mesh>
      {[0.21, 0.49, 0.31].map((height, index) => (
        <mesh key={index} position={[(index - 1) * 0.29, 0.12 + height / 2, 0]}>
          <boxGeometry args={[0.18, height, 0.2]} />
          <meshStandardMaterial
            color="#ffcd85"
            emissive={index === 1 ? '#ffc16b' : '#d890ef'}
            emissiveIntensity={tier >= 2 ? 1.45 : 0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function RankingIsland({ tier, paused, reduced }) {
  return (
    <group name="p5-ranking-monument">
      <mesh position={[0, 0.17, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[2.35, 2.49, 0.3, 4]} />
        <meshStandardMaterial
          color="#452d58"
          emissive="#412654"
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.42}
        />
      </mesh>
      <GlassPyramid tier={tier} />
      <Hologram tier={tier} paused={paused} reduced={reduced} />
    </group>
  );
}
