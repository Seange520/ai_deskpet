import { Component, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const INITIAL_CAMERA = [4, 2.8, 5.2];
export const CAMERA_LIMITS = { min: 4.8, max: 11 };

function PetModel() {
  return (
    <group>
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
          <meshStandardMaterial color="#baffdd" emissive="#6ee7b7" emissiveIntensity={0.6} />
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
        <span>PHASE 3 · 独立只读实验</span>
      </header>
      <div className="stage3d-heading">
        <p className="stage3d-eyebrow">DESKPET / GEOMETRY STUDY 001</p>
        <h1>换个角度，看看小伙伴。</h1>
        <p>基础几何体搭建的静态桌宠。仅供观察，不读取学习进度，也不接受代码或接线指令。</p>
      </div>
      <section className="stage3d-panel" aria-label="只读 3D 桌宠展台">
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
              <PetModel />
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
          <span role="status">{ready ? '3D 展台已就绪' : '正在准备 3D 展台'}</span>
          <span>
            观察距离 <output aria-label="观察距离">{distance.toFixed(2)}</output> · 范围 4.8–11
          </span>
        </div>
      </section>
      <footer>
        没有动作动画、状态绑定或 2D 替换。<a href="/">返回学习工作台 →</a>
      </footer>
    </main>
  );
}
