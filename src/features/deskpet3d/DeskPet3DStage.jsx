import { Component, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import './scene.css';

const INITIAL_CAMERA = [4, 2.8, 5.2];
export const CAMERA_LIMITS = { min: 4.8, max: 11 };

// Pure visual consumer: the caller supplies real or isolated runtime.
function PetModel({ runtime, reducedMotion, paused }) {
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
  }, [runtime, reducedMotion, paused, invalidate]);

  useFrame((_, delta) => {
    if (!body.current || paused) return;
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
  return <span className="deskpet3d-unavailable">3D 暂不可用</span>;
}

class StageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnsupported?.();
  }
  render() {
    return this.state.failed ? <UnsupportedWebGL /> : this.props.children;
  }
}

function ContextGuard({ onUnsupported }) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const lost = (event) => {
      event.preventDefault();
      onUnsupported?.();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [canvas, onUnsupported]);
  return null;
}

const DeskPet3DStage = forwardRef(function DeskPet3DStage(
  { runtime, compact = false, paused = false, still = false, onUnsupported },
  ref,
) {
  const reducedMotion = useReducedMotion();
  const controls = useRef(null);
  const lastRun = useRef(0);
  useImperativeHandle(
    ref,
    () => ({
      resetView() {
        if (!controls.current) return;
        controls.current.object.position.set(...INITIAL_CAMERA);
        controls.current.target.set(0, 0, 0);
        controls.current.update();
      },
    }),
    [],
  );
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
  const action = runtime.status === 'success' ? runtime.action : 'stop';
  const led = runtime.status === 'success' && runtime.led;
  return (
    <div
      className="deskpet3d-scene"
      data-testid="deskpet3d-scene"
      data-action={action}
      data-led={led ? 'on' : 'off'}
      data-paused={paused ? 'true' : 'false'}
      role="img"
      aria-label={`3D 桌宠：${{ forward: '前进', backward: '后退', stop: '停止' }[action]}，LED ${led ? '亮' : '灭'}`}
    >
      <StageBoundary onUnsupported={onUnsupported}>
        <Canvas
          frameloop={paused ? 'never' : 'demand'}
          dpr={compact ? 1 : [1, 1.5]}
          camera={{ position: INITIAL_CAMERA, fov: 40, near: 0.1, far: 40 }}
          gl={{ antialias: !compact, alpha: true, powerPreference: 'low-power' }}
          fallback={<UnsupportedWebGL />}
        >
          <ambientLight intensity={1.3} />
          <directionalLight position={[4, 6, 5]} intensity={2.2} />
          <directionalLight position={[-3, 2, -4]} intensity={0.8} color="#8dc6d0" />
          <PetModel runtime={runtime} reducedMotion={reducedMotion || still} paused={paused} />
          <ContextGuard onUnsupported={onUnsupported} />
          {!compact && (
            <OrbitControls
              ref={controls}
              target={[0, 0, 0]}
              enablePan={false}
              enableDamping={false}
              minDistance={CAMERA_LIMITS.min}
              maxDistance={CAMERA_LIMITS.max}
              minPolarAngle={0.2}
              maxPolarAngle={1.4}
            />
          )}
        </Canvas>
      </StageBoundary>
    </div>
  );
});
export default DeskPet3DStage;
