import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ToneMapping,
  Vignette,
  Noise,
  FXAA,
  DepthOfField,
} from '@react-three/postprocessing';
import { BlendFunction, LookupTexture, LUT3DEffect, ToneMappingMode } from 'postprocessing';
import { Color } from 'three';
import { Moon, Sun, Sunset, ScanLine, ArrowLeft, RotateCcw } from 'lucide-react';
import { ToonPalette } from '../npr/ToonMaterial';
import { ComposerResources } from '../stage/StageEffects';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
import PrototypeSky from './PrototypeSky';
import PrototypeStreet from './PrototypeStreet';
import { daylightAt, readRenderSettings } from './renderSettings.mjs';
import './render-prototype.css';

const CAMERA = { position: [15, 11, 22], fov: 43, near: 0.1, far: 180 };
const GL_OPTIONS = { antialias: false, powerPreference: 'high-performance' };

function Grade() {
  const generation = useRef(0);
  const [texture, effect] = useMemo(() => {
    const texture = LookupTexture.createNeutral(16);
    const data = texture.image.data;
    for (let i = 0; i < data.length; i += 4) {
      // Original warm-highlight / cool-shadow LUT, generated in linear RGB.
      const luminance = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      data[i] = Math.min(1, data[i] * 1.025 + luminance * 0.012);
      data[i + 1] = Math.min(1, data[i + 1] * 1.012);
      data[i + 2] = Math.min(1, data[i + 2] * 0.98 + (1 - luminance) * 0.018);
    }
    texture.needsUpdate = true;
    return [texture, new LUT3DEffect(texture)];
  }, []);
  useEffect(() => {
    const current = ++generation.current;
    return () =>
      queueMicrotask(() => {
        if (current === generation.current) {
          effect.dispose();
          texture.dispose();
        }
      });
  }, [texture, effect]);
  return <primitive object={effect} dispose={null} />;
}

function Metrics({ onStats }) {
  const { gl, camera, scene } = useThree();
  const stats = useRef({ frames: 0, elapsed: 0, calls: 0, triangles: 0 });
  useEffect(() => {
    const autoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    const data = {
      reset() {
        stats.current = { frames: 0, elapsed: 0, calls: 0, triangles: 0 };
      },
      read() {
        const s = stats.current;
        const context = gl.getContext();
        const extension = context.getExtension('WEBGL_debug_renderer_info');
        const meshes = [];
        scene.traverse((object) => {
          if (object.isMesh) meshes.push(object);
        });
        return {
          frames: s.frames,
          seconds: s.elapsed,
          fps: s.frames / (s.elapsed || 1),
          drawCalls: s.calls / (s.frames || 1),
          triangles: s.triangles / (s.frames || 1),
          width: gl.domElement.width,
          height: gl.domElement.height,
          dpr: gl.getPixelRatio(),
          renderer: extension
            ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL)
            : context.getParameter(context.RENDERER),
          camera: camera.position.toArray(),
          meshes: meshes.length,
          toonMeshes: meshes.filter((object) => object.material?.isMeshToonMaterial).length,
          outlineMeshes: meshes.filter((object) => object.name === 'r1-ink-shell').length,
          landmarks: [
            'r1-street',
            'r1-landmark-tower',
            'r1-pet-mint',
            'r1-pet-coral',
            'r1-procedural-sky',
          ].filter((name) => scene.getObjectByName(name)),
        };
      },
    };
    window.__sparkmateRenderR1 = data;
    return () => {
      gl.info.autoReset = autoReset;
      delete window.__sparkmateRenderR1;
    };
  }, [gl, camera, scene]);
  useFrame(() => gl.info.reset(), -100);
  // Composer renders at priority 1. Count every pass, including shadow and postprocessing.
  useFrame((_, delta) => {
    const s = stats.current;
    s.frames++;
    s.elapsed += delta;
    s.calls += gl.info.render.calls;
    s.triangles += gl.info.render.triangles;
    if (s.frames % 30 === 0) onStats(window.__sparkmateRenderR1.read());
  }, 2);
  return null;
}

const Scene = memo(function Scene({ hour, mode, outline, dof, reduced, onStats }) {
  const day = daylightAt(hour);
  const dusk = Math.max(0, 1 - Math.abs(hour - 18) / 2.5);
  const horizon = new Color('#293c68')
    .lerp(new Color('#c2e5df'), day)
    .lerp(new Color('#f5b99e'), dusk)
    .getStyle();
  const zenith = new Color('#101b43')
    .lerp(new Color('#619fc2'), day)
    .lerp(new Color('#7275a8'), dusk * 0.5)
    .getStyle();
  return (
    <>
      <fogExp2 attach="fog" args={[horizon, 0.014]} />
      <hemisphereLight args={['#d3edff', '#9c8f9b', 1.1 + day * 1.0]} />
      <directionalLight
        position={[-8, 14 - dusk * 5, -5]}
        color={dusk > 0.3 ? '#ffd0a0' : '#fff1d6'}
        intensity={0.65 + day * 2.4 + dusk}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={20}
        shadow-camera-bottom={-18}
        shadow-camera-far={65}
        shadow-normalBias={0.06}
      />
      <directionalLight position={[5, 6, 12]} color="#a9cfff" intensity={0.4} />
      <PrototypeSky day={day} dusk={dusk} horizon={horizon} zenith={zenith} reduced={reduced} />
      <ToonPalette tier={3}>
        <PrototypeStreet toon={mode === 'toon'} outline={outline} day={day} />
      </ToonPalette>
      <OrbitControls
        target={[0, 2.3, -1.5]}
        minDistance={15}
        maxDistance={40}
        minPolarAngle={0.35}
        maxPolarAngle={1.45}
        enableDamping={!reduced}
      />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <ComposerResources />
        <Bloom intensity={0.32} luminanceThreshold={1.05} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Grade />
        <Vignette offset={0.3} darkness={0.2} />
        <Noise opacity={0.025} blendFunction={BlendFunction.SOFT_LIGHT} />
        <FXAA />
        {dof && (
          <DepthOfField target={[0, 1.6, 4.8]} focalLength={0.035} bokehScale={1.2} height={540} />
        )}
      </EffectComposer>
      <Metrics onStats={onStats} />
    </>
  );
});

export default function RenderPrototype({ initialMode }) {
  const initial = useMemo(() => readRenderSettings(location.search), []);
  const [hour, setHour] = useState(initial.hour);
  const [mode, setMode] = useState(initialMode);
  const [outline, setOutline] = useState(initial.outline);
  const [dof, setDof] = useState(initial.dof);
  const [stats, setStats] = useState(null);
  const [hidden, setHidden] = useState(document.hidden);
  const reduced = useReducedMotionPreference();
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  useEffect(() => {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries({
      render: mode,
      time: hour,
      outline: outline ? 1 : 0,
      dof: dof ? 1 : 0,
    }))
      url.searchParams.set(key, value);
    history.replaceState(history.state, '', url);
  }, [mode, hour, outline, dof]);
  return (
    <main
      className="render-r1"
      data-render-mode={mode}
      data-outline={outline}
      data-hour={hour}
      data-period={daylightAt(hour) < 0.2 && (hour < 6 || hour > 20) ? 'night' : 'day'}
    >
      <div className="render-r1-canvas" data-testid="render-r1-canvas">
        <Canvas
          shadows
          flat
          dpr={1}
          frameloop={hidden ? 'never' : 'always'}
          camera={CAMERA}
          gl={GL_OPTIONS}
        >
          <Scene
            hour={hour}
            mode={mode}
            outline={outline}
            dof={dof}
            reduced={reduced}
            onStats={setStats}
          />
        </Canvas>
      </div>
      <header className="render-r1-header">
        <a href="?quality=3&boot=0" aria-label="返回《第七校验·流明域》">
          <ArrowLeft size={16} /> 第七校验·流明域
        </a>
        <span>
          VISUAL STUDY · PROTOTYPE <b>01 / R1</b>
        </span>
      </header>
      <section className="render-r1-title">
        <p>流明域 · 晴光街</p>
        <h1>光落下的地方</h1>
        <span>THE SUNLIT QUARTER</span>
      </section>
      <aside className="render-r1-panel" aria-label="渲染对比控制">
        <div className="render-r1-panel-title">
          <ScanLine size={17} />
          <b>渲染原型</b>
          <span>R1</span>
        </div>
        <div className="render-r1-segment" aria-label="渲染模式">
          <button aria-pressed={mode === 'toon'} onClick={() => setMode('toon')}>
            Toon · 四阶
          </button>
          <button aria-pressed={mode === 'standard'} onClick={() => setMode('standard')}>
            PBR · 对比
          </button>
        </div>
        <label className="render-r1-time" htmlFor="render-hour">
          昼夜时间{' '}
          <output>
            {String(Math.floor(hour)).padStart(2, '0')}:
            {String(Math.round((hour % 1) * 60)).padStart(2, '0')}
          </output>
        </label>
        <input
          id="render-hour"
          aria-label="昼夜时间"
          type="range"
          min="0"
          max="24"
          step="0.25"
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
        />
        <div className="render-r1-presets">
          <button onClick={() => setHour(10)}>
            <Sun size={15} />
            白天
          </button>
          <button onClick={() => setHour(18)}>
            <Sunset size={15} />
            黄昏
          </button>
          <button onClick={() => setHour(23)}>
            <Moon size={15} />
            夜晚
          </button>
        </div>
        <label className="render-r1-check">
          <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} />
          边缘描边
        </label>
        <label className="render-r1-check">
          <input type="checkbox" checked={dof} onChange={(e) => setDof(e.target.checked)} />
          景深 DOF（可选）
        </label>
        <p>拖动环视 · 滚轮缩放</p>
        <button
          className="render-r1-reset"
          onClick={() => {
            location.href = '?quality=3&render=toon&boot=0';
          }}
        >
          <RotateCcw size={13} />
          恢复机位与默认设置
        </button>
      </aside>
      <footer className="render-r1-footer">
        <span>01 — 一条街 / 两位伙伴 / 一座灯塔</span>
        <output aria-label="渲染性能">
          {stats
            ? `${stats.fps.toFixed(1)} FPS · ${Math.round(stats.drawCalls)} calls · ${Math.round(stats.triangles).toLocaleString()} tris`
            : '正在采样…'}
        </output>
        <span>1920 × 1080 推荐 · DPR 1</span>
      </footer>
    </main>
  );
}
