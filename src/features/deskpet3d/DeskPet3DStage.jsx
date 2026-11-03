import { Component, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import { useDemoRuntime } from './useDemoRuntime';
import DemoCodeRunner from './DemoCodeRunner';
import '../../runner.css';

const INITIAL_CAMERA = [4, 2.8, 5.2];
export const CAMERA_LIMITS = { min: 4.8, max: 11 };

// Read only the isolated demo runtime; no learning-store actions or persistence.
function PetModel({ runtime, reducedMotion }) {
  const body = useRef(null);
  const eyes = useRef([]);
  const phase = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  const active = runtime.status === 'success';
  const direction = active ? { forward: 1, backward: -1 }[runtime.action] || 0 : 0;
  const brightness = active && runtime.led ? 2.2 : 0.15;

  useEffect(() => {
    phase.current = 0;
    invalidate();
  }, [runtime, reducedMotion, invalidate]);

  useFrame((_, delta) => {
    if (!body.current) return;
    const dt = Math.min(delta, 0.05);
    phase.current += dt;
    const moving = direction !== 0 && !reducedMotion;
    const targetZ = direction * 0.38;
    const targetY = moving ? (1 - Math.cos(phase.current * 5)) * 0.035 : 0;
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-10 * dt);
    let settling = false;
    for (const [axis, target] of [
      ['y', targetY],
      ['z', targetZ],
    ]) {
      const difference = target - body.current.position[axis];
      body.current.position[axis] += difference * alpha;
      if (Math.abs(difference) < 0.0001) body.current.position[axis] = target;
      else settling = true;
    }
    for (const material of eyes.current) {
      if (!material) continue;
      const difference = brightness - material.emissiveIntensity;
      material.emissiveIntensity += difference * alpha;
      if (Math.abs(difference) < 0.0001) material.emissiveIntensity = brightness;
      else settling = true;
    }
    // Demand rendering sleeps once stop/reset and the light transition have settled.
    if (moving || settling) invalidate();
  });

  return (
    <group>
      <group ref={body} name="command-pet">
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[1.85, 1.3, 1.05]} />
          <meshStandardMaterial color="#d8d9c2" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.65, 0.54]}>
          <boxGeometry args={[1.48, 0.92, 0.07]} />
          <meshStandardMaterial color="#193b35" roughness={0.7} />
        </mesh>
        {[-0.36, 0.36].map((x) => (
          <mesh key={x} position={[x, 0.75, 0.61]} scale={[0.75, 1.6, 0.55]}>
            <sphereGeometry args={[0.13, 24, 16]} />
            <meshStandardMaterial
              ref={(material) => {
                eyes.current[x < 0 ? 0 : 1] = material;
              }}
              name="command-eye"
              color="#baffdd"
              emissive="#6ee7b7"
              emissiveIntensity={0.15}
            />
          </mesh>
        ))}
        <mesh position={[0, 0.4, 0.61]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.13, 0.025, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#baffdd" />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <boxGeometry args={[1.45, 0.9, 0.9]} />
          <meshStandardMaterial color="#8faca0" roughness={0.65} />
        </mesh>
        {[-0.43, 0.43].map((x) => (
          <mesh key={x} position={[x, -1.12, 0.12]}>
            <boxGeometry args={[0.48, 0.25, 0.75]} />
            <meshStandardMaterial color="#cfb583" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 1.46, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.34, 12]} />
          <meshStandardMaterial color="#8faca0" />
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <sphereGeometry args={[0.11, 20, 16]} />
          <meshStandardMaterial color="#ffb36b" emissive="#ffb36b" emissiveIntensity={0.25} />
        </mesh>
      </group>
      <mesh position={[0, -1.33, 0]}>
        <cylinderGeometry args={[2.05, 2.15, 0.16, 64]} />
        <meshStandardMaterial color="#22383f" roughness={0.8} />
      </mesh>
    </group>
  );
}

function UnsupportedWebGL() {
  return (
    <div className="stage3d-fallback" role="status">
      当前浏览器无法显示 WebGL 展台。可以尝试开启硬件加速或换一个支持 WebGL 的浏览器。
      <a href="/">返回原有学习工作台</a>
    </div>
  );
}
class StageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <UnsupportedWebGL /> : this.props.children;
  }
}

export default function DeskPet3DStage() {
  const runtime = useDemoRuntime((state) => state.runtime);
  const reducedMotion = useReducedMotion();
  const lastRun = useRef(0);
  useEffect(() => {
    if (runtime.status === 'idle') {
      lastRun.current = 0;
      return;
    }
    if (runtime.status !== 'success' || runtime.runId === lastRun.current) return;
    lastRun.current = runtime.runId;
    for (const { command, value } of runtime.instructions || []) {
      console.log(`[3D DeskPet] Received command: ${command}`, value);
    }
  }, [runtime]);
  const controls = useRef(null);
  const [ready, setReady] = useState(false);
  const [distance, setDistance] = useState(Math.hypot(...INITIAL_CAMERA));
  const updateDistance = () => {
    if (controls.current)
      setDistance(controls.current.object.position.distanceTo(controls.current.target));
  };
  function resetView() {
    if (!controls.current) return;
    controls.current.object.position.set(...INITIAL_CAMERA);
    controls.current.target.set(0, 0, 0);
    controls.current.update();
    updateDistance();
  }
  return (
    <main className="stage3d-page">
      <header className="stage3d-header">
        <a href="/" className="stage3d-brand">
          ⚡ SparkMate
        </a>
        <span>PHASE 3 · 指令动画实验</span>
      </header>
      <div className="stage3d-heading">
        <p className="stage3d-eyebrow">DESKPET / GEOMETRY STUDY 001</p>
        <h1>换个角度，看看小伙伴。</h1>
        <p>在本页下方运行教学指令，观察桌宠移动与眼睛亮度。停止或恢复状态可让模型归位。</p>
      </div>
      <section className="stage3d-panel" aria-label="指令联动 3D 桌宠展台">
        <div className="stage3d-toolbar">
          <span>拖拽旋转 · 滚轮缩放</span>
          <button type="button" onClick={resetView} disabled={!ready}>
            重置视角
          </button>
        </div>
        <div className="stage3d-canvas" role="group" aria-label="可旋转和缩放的三维桌宠">
          <StageBoundary>
            <Canvas
              frameloop="demand"
              dpr={[1, 1.5]}
              camera={{ position: INITIAL_CAMERA, fov: 40, near: 0.1, far: 40 }}
              gl={{ antialias: true, alpha: true }}
              fallback={<UnsupportedWebGL />}
              onCreated={() => setReady(true)}
            >
              <ambientLight intensity={1.3} />
              <directionalLight position={[4, 6, 5]} intensity={2.2} />
              <directionalLight position={[-3, 2, -4]} intensity={0.8} color="#8dc6d0" />
              <PetModel runtime={runtime} reducedMotion={reducedMotion} />
              <OrbitControls
                ref={controls}
                target={[0, 0, 0]}
                enablePan={false}
                enableDamping={false}
                minDistance={CAMERA_LIMITS.min}
                maxDistance={CAMERA_LIMITS.max}
                minPolarAngle={0.2}
                maxPolarAngle={1.4}
                onChange={updateDistance}
              />
            </Canvas>
          </StageBoundary>
        </div>
        <div className="stage3d-caption">
          <span role="status">
            {ready ? '3D 展台已就绪' : '正在准备 3D 展台'} · 动作：
            {runtime.status === 'success'
              ? { forward: '前进', backward: '后退', stop: '停止' }[runtime.action]
              : '停止'}
            {' · LED：'}
            {runtime.status === 'success' && runtime.led ? '亮' : '灭'}
          </span>
          <span>
            观察距离 <output aria-label="观察距离">{distance.toFixed(2)}</output> · 范围 4.8–11
          </span>
        </div>
      </section>
      <aside className="stage3d-note">
        本页为独立指令预览，不发放 XP、不解锁关卡，也不读取或保存学习记录。
        运行态仅在本页有效，不跨标签页同步，刷新后复位。
        {reducedMotion && ' 已启用减少动画：以静态位置和亮度反馈指令。'}
      </aside>
      <div className="stage3d-runner">
        <DemoCodeRunner />
      </div>
      <footer>
        独立 3D 实验 · 原有学习工作台与 2D 伙伴保持不变。<a href="/">返回学习工作台 →</a>
      </footer>
    </main>
  );
}
