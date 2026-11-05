import { Component, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor, PerspectiveCamera } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import { QUALITY_BUDGETS } from '../../lib/visualCapabilities';
import StageEffects from './StageEffects';
import StageAtmosphere from './StageAtmosphere';
import CameraRig from './CameraRig';
import GpuProbe from '../../lib/GpuProbe';
import PetModel from '../deskpet3d/PetModel';
import EnvironmentLighting from '../deskpet3d/EnvironmentLighting';
import { useLearningStore } from '../../stores/useLearningStore';
import { useEnvironmentStore } from '../environment/useEnvironmentStore';
import { usePetActions } from '../interaction/usePetActions';

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Lifecycle({ hero, quality, onReady }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const regress = useThree((s) => s.performance.regress);
  useEffect(() => {
    gl.toneMapping = quality.tier >= 2 ? NoToneMapping : ACESFilmicToneMapping;
    invalidate();
  }, [gl, quality.tier, invalidate]);
  useFrame(() => {
    gl.setRenderTarget(null);
    gl.clear(true, true, true);
  }, -1);
  useEffect(() => {
    const lost = (event) => {
      event.preventDefault();
      quality.fail();
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    onReady(true);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      onReady(false);
    };
  }, [gl, quality.fail, onReady]);
  useEffect(() => {
    const sync = () => {
      regress();
      invalidate();
    };
    const observer = new ResizeObserver(sync);
    if (hero?.node) observer.observe(hero.node);
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    invalidate();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [hero?.node, regress, invalidate]);
  return null;
}
function HeroScene({ reduced, paused, tier, hero }) {
  const runtime = useLearningStore((s) => s.runtime);
  const interaction = usePetActions();
  const environment = useEnvironmentStore();
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[4, 2.8, 5.2]}
        fov={40}
        near={0.1}
        far={40}
        onUpdate={(camera) => camera.lookAt(0, 0, 0)}
      />
      <EnvironmentLighting
        night={environment.night}
        paused={paused}
        reducedMotion={reduced}
        tier={tier}
      />
      <PetModel
        runtime={runtime}
        interaction={interaction}
        environment={environment}
        reducedMotion={reduced}
        paused={paused}
        tier={tier}
        cinematic={tier >= 2}
      />
      {tier >= 2 && <StageAtmosphere paused={paused} reduced={reduced} />}
      <CameraRig hero={hero} paused={paused} reduced={reduced} />
      {tier >= 2 && <StageEffects tier={tier} paused={paused} />}
    </>
  );
}
export default function SceneCanvas({ hero, quality, onReady }) {
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(document.hidden);
  const shell = useRef(null);
  useEffect(() => {
    const sync = () =>
      setHidden(
        document.hidden ||
          Boolean(document.querySelector('.modal-backdrop, .pet-focus-overlay, .burn-overlay')) ||
          Boolean(document.querySelector('.app-shell')?.inert),
      );
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['inert'],
    });
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  const paused = hidden || !hero?.active;
  const [rect, setRect] = useState({ left: 0, top: 0, width: 1, height: 1 });
  useLayoutEffect(() => {
    if (!hero?.node) return;
    const sync = () => {
      const { left, top, width, height } = hero.node.getBoundingClientRect();
      setRect({ left, top, width: Math.max(1, width), height: Math.max(1, height) });
    };
    const observer = new ResizeObserver(sync);
    observer.observe(hero.node);
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    sync();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [hero?.node]);
  return (
    <div
      className="scene-stage"
      ref={shell}
      data-testid="scene-stage"
      data-paused={paused}
      data-effects={
        quality.tier >= 2
          ? quality.tier === 3
            ? 'bloom-aces-vignette-fxaa-dof'
            : 'bloom-aces-vignette-fxaa'
          : 'none'
      }
      style={{ visibility: hero ? 'visible' : 'hidden' }}
      aria-hidden="true"
    >
      <div className="scene-window" style={rect}>
        <Boundary onFail={quality.fail}>
          <Canvas
            flat={quality.tier >= 2}
            frameloop={paused ? 'never' : 'demand'}
            dpr={[1, QUALITY_BUDGETS[quality.tier].maxDpr]}
            gl={{ alpha: true, antialias: quality.tier >= 2, powerPreference: 'low-power' }}
            fallback={<span>3D 暂不可用</span>}
          >
            <Lifecycle hero={hero} quality={quality} onReady={onReady} />
            {quality.override === null && (
              <Suspense fallback={null}>
                <GpuProbe onDetect={quality.detect} />
              </Suspense>
            )}
            <AdaptiveDpr />
            {!paused && !reduced && <DemandPerformance onDecline={quality.degrade} />}
            <HeroScene
              reduced={reduced || quality.tier === 1}
              paused={paused}
              tier={quality.tier}
              hero={hero}
            />
          </Canvas>
        </Boundary>
      </div>
    </div>
  );
}
// Demand gaps are idle time, not poor FPS. Only lower quality after continuous frames.
function DemandPerformance({ onDecline }) {
  const continuous = useRef(0);
  useFrame((_, delta) => {
    continuous.current = delta > 0.15 ? 0 : continuous.current + 1;
  }, -2);
  const decline = () => {
    if (continuous.current >= 30) onDecline();
  };
  return (
    <PerformanceMonitor iterations={4} flipflops={2} onDecline={decline} onFallback={decline} />
  );
}
