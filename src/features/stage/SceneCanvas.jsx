import { Component, Suspense, useEffect, useState } from 'react';
import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
import { QUALITY_BUDGETS } from '../../lib/visualCapabilities';
import GpuProbe from '../../lib/GpuProbe';
import WorldScene from '../space/WorldScene';
import { ISLANDS } from '../space/world';

const camera = {
  position: ISLANDS.dashboard.camera.position,
  fov: ISLANDS.dashboard.camera.fov,
  near: 0.1,
  far: 115,
};

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
function Lifecycle({ quality, onReady }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
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
  return null;
}
export default function SceneCanvas({ quality, onReady }) {
  const reduced = useReducedMotionPreference();
  const [hidden, setHidden] = useState(document.hidden);
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
  const paused = hidden;
  const { tier, adaptive, performanceStep } = quality;
  const effects =
    tier < 2
      ? 'none'
      : performanceStep >= 3
        ? 'aces-vignette-fxaa'
        : tier === 3
          ? 'bloom-aces-vignette-fxaa-dof'
          : 'bloom-aces-vignette-fxaa';
  return (
    <div
      className="scene-stage"
      data-testid="scene-stage"
      data-paused={paused}
      data-effects={effects}
      data-performance-step={performanceStep}
      aria-hidden="true"
    >
      <Boundary onFail={quality.fail}>
        <Canvas
          camera={camera}
          flat={quality.tier >= 2}
          frameloop={paused ? 'never' : 'demand'}
          dpr={[1, QUALITY_BUDGETS[quality.tier].maxDpr]}
          gl={{ alpha: true, antialias: quality.tier >= 2, powerPreference: 'low-power' }}
          fallback={<span>3D 暂不可用</span>}
        >
          <Lifecycle quality={quality} onReady={onReady} />
          {quality.override === null && (
            <Suspense fallback={null}>
              <GpuProbe onDetect={quality.detect} />
            </Suspense>
          )}
          <AdaptiveDpr />
          {adaptive && tier >= 2 && !paused && !reduced && (
            // Each step starts a fresh window. With motion enabled, TravelRig requests every frame.
            <PerformanceMonitor key={performanceStep} iterations={4} onDecline={quality.degrade} />
          )}
          <WorldScene
            reduced={reduced || tier === 1}
            paused={paused}
            tier={tier}
            performanceStep={performanceStep}
          />
        </Canvas>
      </Boundary>
    </div>
  );
}
