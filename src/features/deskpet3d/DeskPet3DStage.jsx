import { Component, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import './scene.css';
import PetModel from './PetModel';
import EnvironmentLighting from './EnvironmentLighting';
import { usePetAffection } from './usePetAffection';
import { useSceneQuality } from './useSceneQuality';

const INITIAL_CAMERA = [4, 2.8, 5.2];
export const CAMERA_LIMITS = { min: 4.8, max: 11 };
const EMPTY_ENVIRONMENT = { night: false, idleSleeping: false };
const EMPTY_INTERACTION = { event: { id: 0, type: 'idle' }, sleeping: false, dark: false };

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
  {
    runtime,
    compact = false,
    paused = false,
    still = false,
    onUnsupported,
    onPet,
    interaction = EMPTY_INTERACTION,
    environment = EMPTY_ENVIRONMENT,
  },
  ref,
) {
  const reducedMotion = useReducedMotion();
  const constrained = useSceneQuality();
  const controls = useRef(null);
  const lastRun = useRef(0);
  const asleep = interaction.dark || interaction.sleeping || environment.idleSleeping;
  const { petting, dizzy, petHead } = usePetAffection({ compact, paused, blocked: asleep, onPet });
  // Compact mode always returns to the original view; the Canvas stays mounted.
  useEffect(() => {
    if (compact && controls.current) {
      controls.current.object.position.set(...INITIAL_CAMERA);
      controls.current.target.set(0, 0, 0);
      controls.current.update();
    }
  }, [compact]);
  useImperativeHandle(
    ref,
    () => ({
      petHead,
      resetView() {
        if (!controls.current) return;
        controls.current.object.position.set(...INITIAL_CAMERA);
        controls.current.target.set(0, 0, 0);
        controls.current.update();
      },
    }),
    [petHead],
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
      data-sleeping={asleep ? 'true' : 'false'}
      data-environment={environment.night ? 'night' : 'day'}
      data-emotion={dizzy ? 'dizzy' : asleep ? 'sleep' : environment.night ? 'drowsy' : 'awake'}
      data-motion-request={interaction.event.type}
      data-paused={paused ? 'true' : 'false'}
      role="img"
      aria-label={`3D 桌宠：${{ forward: '前进', backward: '后退', stop: '停止' }[action]}，LED ${led ? '亮' : '灭'}`}
    >
      <StageBoundary onUnsupported={onUnsupported}>
        <Canvas
          frameloop={paused ? 'never' : 'demand'}
          dpr={compact || constrained ? 1 : [1, 1.5]}
          camera={{ position: INITIAL_CAMERA, fov: 40, near: 0.1, far: 40 }}
          gl={{ antialias: !compact && !constrained, alpha: true, powerPreference: 'low-power' }}
          fallback={<UnsupportedWebGL />}
        >
          <EnvironmentLighting
            night={environment.night}
            paused={paused}
            reducedMotion={reducedMotion || still}
          />
          <PetModel
            runtime={runtime}
            reducedMotion={reducedMotion || still}
            paused={paused}
            interaction={interaction}
            petting={petting}
            dizzy={dizzy}
            environment={environment}
            onPetHead={compact ? undefined : petHead}
          />
          <ContextGuard onUnsupported={onUnsupported} />
          <OrbitControls
            ref={controls}
            enabled={!compact && !paused}
            target={[0, 0, 0]}
            enablePan={false}
            enableDamping={false}
            minDistance={CAMERA_LIMITS.min}
            maxDistance={CAMERA_LIMITS.max}
            minPolarAngle={0.2}
            maxPolarAngle={1.4}
          />
        </Canvas>
      </StageBoundary>
    </div>
  );
});
export default DeskPet3DStage;
