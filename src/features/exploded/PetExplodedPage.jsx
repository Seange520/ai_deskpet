import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { ASSEMBLY_ORDER, PARTS } from './parts.mjs';

const PAPER = '#f3ead6';
const INK = '#2c2620';
const BRASS = '#a9772b';

function PartLabel({ part, active, explode }) {
  if (!active) return null;
  const visible = Math.min(1, Math.max(0, (explode - 0.04) / 0.18));
  if (visible <= 0.02) return null;
  return (
    <Html
      position={[0, 0.45, 0]}
      center
      distanceFactor={7}
      style={{
        opacity: visible,
        pointerEvents: 'none',
        transition: 'opacity 140ms ease',
      }}
    >
      <span className="exploded-label">
        {part.no} · {part.name}
      </span>
    </Html>
  );
}

function Part({ part, explode, selected, onSelect, dimmed }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const active = selected === part.id || hovered;
  const offset = useMemo(() => new THREE.Vector3(...part.split), [part.split]);
  const color = useMemo(() => new THREE.Color(part.color), [part.color]);
  useFrame(() => {
    if (!ref.current) return;
    const target = offset.clone().multiplyScalar(explode);
    ref.current.position.lerp(target, 0.18);
    const base = part.displayScale ?? 1;
    const s = base * (active ? 1.035 : 1);
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.18);
  });

  return (
    <group
      ref={ref}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(part.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      <PartMeshes id={part.id} color={color} active={active} dimmed={dimmed} explode={explode} />
      <PartLabel part={part} active={active} explode={explode} />
    </group>
  );
}

function PartMeshes({ id, color, active, dimmed, explode }) {
  const opacity = dimmed ? 0.55 : 1;
  const mat = (extra = {}) => (
    <meshStandardMaterial
      color={color}
      roughness={0.62}
      metalness={id === 'pcb' ? 0.15 : 0.05}
      transparent={opacity < 1}
      opacity={opacity}
      emissive={active ? BRASS : '#000000'}
      emissiveIntensity={active ? 0.42 : 0}
      {...extra}
    />
  );

  if (id === 'shell') {
    return (
      <group>
        <RoundedBox args={[1.9, 0.5, 1.35]} radius={0.14} smoothness={4} position={[0, 0.86 + explode * 0.95, 0]}>
          {mat()}
        </RoundedBox>
        <RoundedBox args={[1.9, 0.5, 1.35]} radius={0.14} smoothness={4} position={[0, -0.92 - explode * 0.7, 0]}>
          {mat()}
        </RoundedBox>
        <mesh position={[0, 0.18 - explode * 1.15, -0.68]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 10]} />
          {mat()}
        </mesh>
      </group>
    );
  }
  if (id === 'pcb') {
    return (
      <group>
        <RoundedBox args={[1.62, 0.09, 1.08]} radius={0.03} smoothness={2} position={[0, -0.02, 0]}>
          {mat()}
        </RoundedBox>
        <RoundedBox args={[0.62, 0.09, 0.4]} radius={0.02} smoothness={2} position={[-0.32, 0.11, 0.02]}>
          {mat({ color: '#c8ced2', metalness: 0.55, roughness: 0.28 })}
        </RoundedBox>
        <RoundedBox args={[0.2, 0.05, 0.14]} radius={0.01} smoothness={2} position={[0.52, 0.09, 0.3]}>
          {mat({ color: '#1a1d1f' })}
        </RoundedBox>
        <RoundedBox args={[0.16, 0.05, 0.1]} radius={0.01} smoothness={2} position={[0.52, 0.09, -0.34]}>
          {mat({ color: '#1a1d1f' })}
        </RoundedBox>
        {[-0.62, -0.5, -0.38, -0.26].map((x) => (
          <mesh key={x} position={[x, 0.1, 0.46]}>
            <boxGeometry args={[0.08, 0.07, 0.06]} />
            {mat({ color: '#b58b3f', metalness: 0.6, roughness: 0.3 })}
          </mesh>
        ))}
      </group>
    );
  }
  if (id === 'screen') {
    return (
      <group>
        <RoundedBox args={[1.14, 0.72, 0.1]} radius={0.04} smoothness={3} position={[0, 0.02, 0]}>
          {mat()}
        </RoundedBox>
        <mesh position={[0, 0.04, 0.062]}>
          <planeGeometry args={[0.98, 0.5]} />
          <meshStandardMaterial color="#15221d" emissive="#7fd8b8" emissiveIntensity={active ? 0.85 : 0.42} roughness={0.35} transparent={opacity < 1} opacity={opacity} />
        </mesh>
        <mesh position={[0, -0.3, 0.08]}>
          <boxGeometry args={[0.98, 0.03, 0.02]} />
          {mat({ color: '#8c6a2f', metalness: 0.5 })}
        </mesh>
      </group>
    );
  }
  if (id === 'servo') {
    return (
      <group>
        <RoundedBox args={[0.44, 0.5, 0.22]} radius={0.04} smoothness={3}>
          {mat()}
        </RoundedBox>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
          {mat({ color: '#e9e4d8' })}
        </mesh>
        <mesh position={[0, 0.42, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.34, 0.04, 0.08]} />
          {mat({ color: '#e9e4d8' })}
        </mesh>
      </group>
    );
  }
  if (id === 'battery') {
    return (
      <group>
        <RoundedBox args={[0.9, 0.28, 0.52]} radius={0.06} smoothness={3}>
          {mat({ metalness: 0.35, roughness: 0.45 })}
        </RoundedBox>
        <mesh position={[0.42, 0.06, 0.16]}>
          <boxGeometry args={[0.06, 0.06, 0.14]} />
          {mat({ color: '#d8b45a', metalness: 0.6 })}
        </mesh>
        <mesh position={[0.42, 0.06, -0.16]}>
          <boxGeometry args={[0.06, 0.06, 0.14]} />
          {mat({ color: '#333333' })}
        </mesh>
      </group>
    );
  }
  if (id === 'mic') {
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.14, 0.14, 0.06, 18]} />
          {mat({ color: '#2a2e31', metalness: 0.3 })}
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
          {mat({ color: '#111111' })}
        </mesh>
      </group>
    );
  }
  if (id === 'harness') {
    return (
      <group>
        {[
          ['#c2543c', [0.65, 0.25, 0]],
          ['#2f2a26', [0.65, 0.1, 0]],
          ['#d8b45a', [0.4, 0.4, 0.2]],
          ['#7fb3c8', [-0.4, 0.35, -0.2]],
        ].map(([colorValue, pos], index) => (
          <mesh key={index} position={pos} rotation={[0, 0, index % 2 ? 0.35 : -0.2]}>
            <tubeGeometry args={[new THREE.CatmullRomCurve3([
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(0.1, 0.18, 0.04),
              new THREE.Vector3(0.06, 0.36, 0.1),
            ]), 12, 0.012, 6, false]} />
            {mat({ color: colorValue })}
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group>
      {[
        [-0.62, -0.12, 0.52],
        [0.62, -0.12, 0.52],
        [-0.62, -0.12, -0.52],
        [0.62, -0.12, -0.52],
      ].map((pos, index) => (
        <mesh key={index} position={pos}>
          <cylinderGeometry args={[0.045, 0.045, 0.12, 10]} />
          {mat({ metalness: 0.7, roughness: 0.3 })}
        </mesh>
      ))}
    </group>
  );
}

const BASE = {
  shell: [0, 0, 0],
  pcb: [0, 0.12, 0],
  screen: [0, 0.18, 0.62],
  servo: [0.5, 0.02, 0.05],
  battery: [-0.52, 0.02, 0.02],
  mic: [0.05, 0.62, -0.36],
  harness: [0, 0.32, 0.1],
  fastener: [0, -0.62, 0],
};

function Assembly({ explode, selected, onSelect }) {
  return (
    <group position={[0, 0.1, 0]} rotation={[0, -0.42, 0]}>
      {PARTS.map((part) => (
        <group key={part.id} position={BASE[part.id] ?? [0, 0, 0]}>
          <Part
            part={part}
            explode={explode}
            selected={selected}
            onSelect={onSelect}
            dimmed={Boolean(selected) && selected !== part.id}
          />
        </group>
      ))}
      <ContactShadows position={[0, -1.25, 0]} opacity={0.28} scale={7} blur={2.4} far={4} color="#4a3a28" />
    </group>
  );
}

export default function PetExplodedPage() {
  const [explode, setExplode] = useState(0.8);
  const [selected, setSelected] = useState('pcb');
  const [step, setStep] = useState(0);
  const part = PARTS.find((item) => item.id === selected) ?? PARTS[0];

  function nextStep() {
    const id = ASSEMBLY_ORDER[step % ASSEMBLY_ORDER.length];
    setSelected(id);
    setStep((value) => (value + 1) % ASSEMBLY_ORDER.length);
  }

  return (
    <main className="exploded-page">
      <header className="exploded-head">
        <div>
          <div className="eyebrow">THE FORGE · 全零件说明书</div>
          <h1>把它拆开，再装回去。</h1>
          <p>八个零件，一根线一根线认清。拆得开，才装得回；装得回，才算自己的。</p>
        </div>
        <div className="exploded-actions">
          <label>
            分离度
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(explode * 100)}
              onChange={(event) => setExplode(Number(event.target.value) / 100)}
              aria-label="爆炸分离度"
            />
          </label>
          <button type="button" onClick={nextStep}>
            按顺序看：{ASSEMBLY_ORDER[step % ASSEMBLY_ORDER.length]}
          </button>
          <button type="button" className="ghost" onClick={() => setExplode(0)}>
            合上
          </button>
        </div>
      </header>

      <div className="exploded-body">
        <div className="exploded-canvas">
          <Canvas dpr={[1, 2]} shadows camera={{ position: [5.8, 4.6, 7.8], fov: 34 }}>
            <color attach="background" args={[PAPER]} />
            <fog attach="fog" args={[PAPER, 9, 15]} />
            <ambientLight intensity={0.75} />
            <directionalLight position={[4, 7, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-5, 3, -3]} intensity={0.45} color="#cfe3ff" />
            <gridHelper args={[9, 18, '#cdb992', '#e2d3b5']} position={[0, -1.29, 0]} />
            <Assembly explode={explode} selected={selected} onSelect={setSelected} />
            <OrbitControls enablePan={false} target={[0, 0.55, 0]} minDistance={4} maxDistance={11} minPolarAngle={0.6} maxPolarAngle={1.42} />
          </Canvas>
          <span className="exploded-hint">拖动旋转 · 滚轮缩放 · 点零件看说明</span>
        </div>

        <aside className="exploded-parts" aria-label="零件清单">
          <ol>
            {PARTS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === selected ? 'is-active' : ''}
                  onClick={() => setSelected(item.id)}
                >
                  <span>{item.no}</span>
                  <b>{item.name}</b>
                  <em>{item.en}</em>
                </button>
              </li>
            ))}
          </ol>
          <div className="exploded-detail">
            <small>零件说明</small>
            <h2>
              {part.no} · {part.name}
            </h2>
            <dl>
              <div>
                <dt>材料</dt>
                <dd>{part.material}</dd>
              </div>
              <div>
                <dt>尺寸</dt>
                <dd>{part.size}</dd>
              </div>
            </dl>
            <p>{part.note}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
