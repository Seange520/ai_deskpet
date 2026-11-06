import { lazy, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
import { useDeviceDetect } from '../../lib/useDeviceDetect';
import RenderBoundary from './RenderBoundary';
import WorldScene from '../space/WorldScene';
import { ISLANDS } from '../space/world';

const GpuProbe = lazy(() => import('../../lib/GpuProbe'));

const camera = {
  position: ISLANDS.dashboard.camera.position,
  fov: ISLANDS.dashboard.camera.fov,
  near: 0.1,
  far: 115,
};

function Lifecycle({ quality, onReady }) {
  const gl = useThree((s) => s.gl);
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
function StagePixelRatio({ adaptive, maxDpr }) {
  const current = useThree((state) => state.performance.current);
  const setDpr = useThree((state) => state.setDpr);
  useEffect(() => {
    const cap = Math.max(1, Math.min(maxDpr, window.devicePixelRatio || 1));
    setDpr(cap * (adaptive ? current : 1));
  }, [adaptive, current, maxDpr, setDpr]);
  return null;
}
function DeviceProbe({ paused, quality }) {
  const fallback = useDeviceDetect({
    paused,
    onRenderer: quality.detectRenderer,
    onSample: quality.onStartupFps,
  });
  return fallback ? (
    <Suspense fallback={null}>
      <GpuProbe onDetect={quality.detect} />
    </Suspense>
  ) : null;
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
          ? quality.advanced.ssr
            ? 'ssr-gtao-selective-bloom-aces-vignette-fxaa-dof'
            : 'gtao-selective-bloom-aces-vignette-fxaa-dof'
          : 'bloom-aces-vignette-fxaa';
  return (
    <div
      className="scene-stage"
      data-testid="scene-stage"
      data-paused={paused}
      data-effects={effects}
      data-performance-step={performanceStep}
      data-startup-fps={quality.startupFps === null ? undefined : quality.startupFps.toFixed(1)}
      aria-hidden="true"
    >
      <RenderBoundary onFail={quality.fail}>
        <Canvas
          camera={camera}
          frameloop={paused ? 'never' : 'demand'}
          dpr={[1, quality.maxDpr]}
          gl={{ alpha: true, antialias: quality.tier >= 2, powerPreference: 'low-power' }}
          fallback={<span>3D 暂不可用</span>}
        >
          <Lifecycle quality={quality} onReady={onReady} />
          {quality.autoMode && <DeviceProbe paused={paused} quality={quality} />}
          <StagePixelRatio adaptive={adaptive} maxDpr={quality.maxDpr} />
          {adaptive &&
            (quality.override !== null || quality.startupFps !== null) &&
            tier >= 2 &&
            !paused &&
            !reduced && (
              // Each step starts a fresh window. With motion enabled, TravelRig requests every frame.
              <PerformanceMonitor
                key={performanceStep}
                iterations={4}
                onDecline={quality.degrade}
              />
            )}
          <WorldScene
            reduced={reduced || tier === 1}
            paused={paused}
            tier={tier}
            performanceStep={performanceStep}
            advanced={quality.advanced}
          />
        </Canvas>
      </RenderBoundary>
    </div>
  );
}
