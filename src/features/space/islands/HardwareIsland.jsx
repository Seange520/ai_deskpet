import ToonMaterial from '../../npr/ToonMaterial';
import { useEffect, useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace } from 'three';

const boardSize = 5.5;
const chipSites = [
  { x: -0.6, z: 0.3, size: 1.15 },
  { x: 1.05, z: 1.12, size: 0.85 },
  { x: -1.72, z: -1.38, size: 0.76 },
];

function noise(x, z) {
  const hash = (i, j) => {
    const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = x - i;
  const v = z - j;
  const a = u * u * (3 - 2 * u);
  const b = v * v * (3 - 2 * v);
  const near = hash(i, j) * (1 - a) + hash(i + 1, j) * a;
  const far = hash(i, j + 1) * (1 - a) + hash(i + 1, j + 1) * a;
  return near * (1 - b) + far * b;
}

function height(x, z) {
  const edge = boardSize / 2 - Math.max(Math.abs(x), Math.abs(z));
  const border = Math.min(1, edge * 2.9);
  const fbm =
    noise(x * 0.9 + 3, z * 0.9) * 0.37 +
    noise(x * 1.9, z * 1.9 + 5) * 0.13 +
    noise(x * 4.1, z * 4.1) * 0.05;
  return 0.167 + border * fbm;
}

function shapeBoard(geometry) {
  if (geometry.userData.shaped) return;
  geometry.userData.shaped = true;
  geometry.rotateX(-Math.PI / 2);
  const points = geometry.attributes.position;
  for (let i = 0; i < points.count; i++) points.setY(i, height(points.getX(i), points.getZ(i)));
  points.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function drawTraces(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.scale(size / 1024, size / 1024);
  ctx.fillStyle = '#183e50';
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#41838e';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, 988, 988);
  ctx.strokeRect(31, 31, 962, 962);
  const pad = (x, y, radius) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  for (const { x, z, size: chipSize } of chipSites) {
    const cx = (x / boardSize + 0.5) * 1024;
    const cy = (z / boardSize + 0.5) * 1024;
    for (let side = 0; side < 4; side++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((side * Math.PI) / 2);
      for (let pin = 0; pin < 7; pin++) {
        const start = (pin - 3) * chipSize * 18;
        const bend = start + (pin - 3) * 13;
        const reach = 130 + ((pin * 19 + side * 11) % 75);
        ctx.strokeStyle = pin % 3 === 0 ? '#e7b979' : '#4e9ba8';
        ctx.lineWidth = pin % 3 === 0 ? 4 : 2.6;
        ctx.beginPath();
        ctx.moveTo(start, chipSize * 68);
        ctx.lineTo(start, 108);
        ctx.lineTo(bend, 128);
        ctx.lineTo(bend, reach);
        ctx.stroke();
        ctx.fillStyle = '#6f9c9c';
        ctx.fillRect(start - 4, chipSize * 79, 8, 14);
        pad(bend, reach, 6);
      }
      ctx.restore();
    }
  }
  ctx.strokeStyle = '#4c8994';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 36; i++) {
    const d = 60 + i * 26;
    pad(d, 53, 5);
    pad(d, 971, 5);
    pad(53, d, 5);
    pad(971, d, 5);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function CircuitBoard({ tier, paused, reduced }) {
  const material = useRef(null);
  const segments = tier === 3 ? 64 : tier === 2 ? 32 : 12;
  const textureSize = tier === 3 ? 1024 : tier === 2 ? 512 : 256;
  const texture = useMemo(() => drawTraces(textureSize), [textureSize]);
  const clock = useMemo(() => ({ value: 0 }), []);
  const compile = useMemo(
    () => (shader) => {
      shader.uniforms.circuitTime = clock;
      shader.fragmentShader = 'uniform float circuitTime;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
      #include <emissivemap_fragment>
      float wave=fract(dot(vMapUv,vec2(2.1,0.65))-circuitTime*0.64);
      float pulse=smoothstep(0.30,0.47,wave)*(1.0-smoothstep(0.49,0.64,wave));
      totalEmissiveRadiance+=texture2D(map,vMapUv).rgb*pulse*${tier >= 2 ? '0.6' : '0.0'};
    `,
      );
    },
    [clock, tier],
  );

  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    if (!paused && !reduced && tier >= 2) {
      clock.value += Math.min(delta, 0.05);
    }
  });

  return (
    <mesh name="p5-circuit-terrain">
      <planeGeometry args={[boardSize, boardSize, segments, segments]} onUpdate={shapeBoard} />
      <ToonMaterial
        ref={material}
        map={texture}
        color="#89b7c2"
        emissive="#276b74"
        emissiveIntensity={0.16}
        onBeforeCompile={compile}
        customProgramCacheKey={() => `sparkmate-m2-circuit-rgb-${tier}`}
      />
    </mesh>
  );
}

export default function HardwareIsland({ tier, paused, reduced }) {
  return (
    <group name="p5-hardware-board">
      <RoundedBox position={[0, -0.43, 0]} args={[5.55, 0.88, 5.55]} radius={0.12} smoothness={1}>
        <ToonMaterial finish="cliff" color="#647e9f" />
      </RoundedBox>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[5.57, 0.055, 5.57]} />
        <ToonMaterial color="#276771" emissive="#3d939b" emissiveIntensity={0.52} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[5.5, 0.19, 5.5]} />
        <ToonMaterial color="#1d3441" />
      </mesh>
      <CircuitBoard tier={tier} paused={paused} reduced={reduced} />
      {chipSites.map(({ x, z, size }, index) => (
        <group key={x} position={[x, height(x, z) + 0.03, z]}>
          <RoundedBox
            args={[size * 1.24, 0.34, size * 1.24]}
            radius={0.08}
            smoothness={tier === 1 ? 1 : 2}
          >
            <ToonMaterial color="#433644" emissive="#382a40" emissiveIntensity={0.44} />
          </RoundedBox>
          <RoundedBox
            name="p5-chip-emitter"
            position={[0, 0.19, 0]}
            args={[size, 0.11, size]}
            radius={0.04}
            smoothness={1}
          >
            <ToonMaterial
              color="#b45f33"
              emissive={index === 0 ? '#ffc06b' : '#e98959'}
              emissiveIntensity={tier >= 2 ? 1.35 : 0.55}
            />
          </RoundedBox>
          <mesh position={[0, 0.255, 0]}>
            <boxGeometry args={[size * 0.74, 0.03, size * 0.74]} />
            <ToonMaterial color="#252d37" emissive="#344850" emissiveIntensity={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
