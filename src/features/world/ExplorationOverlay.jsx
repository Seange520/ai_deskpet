import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EcctrlJoystick, useJoystickControls } from 'ecctrl';
import { look, useExploration, resetExploration } from './explorationState';

function JoystickResources() {
  const { scene } = useThree();
  const resources = useRef(new Set());
  useFrame(() => {
    if (resources.current.size) return;
    scene.traverse((o) => {
      if (o.isMesh) {
        resources.current.add(o.geometry);
        for (const m of [o.material].flat()) resources.current.add(m);
      }
    });
  });
  useEffect(
    () => () => {
      resources.current.forEach((r) => r?.dispose());
      resources.current.clear();
    },
    [],
  );
  return null;
}

export default function ExplorationOverlay({ onSurface, onExit }) {
  const surface = useRef(null),
    dragging = useRef(null),
    wasLocked = useRef(false);
  const [locked, setLocked] = useState(false);
  const [joystickReady, setJoystickReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setJoystickReady(true), 600);
    return () => clearTimeout(id);
  }, []);
  const [lockError, setLockError] = useState(false);
  const fps = useExploration((s) => s.fps);
  const blocked = useExploration((s) => s.blocked);
  const [touch] = useState(
    () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0,
  );
  useEffect(() => {
    resetExploration();
    useExploration.setState({ touch });
    onSurface(surface.current);
    surface.current.focus();
    const stop = () => {
      useJoystickControls.getState().resetJoystick();
      useExploration.setState({ jump: false, jumpQueued: false });
      dragging.current = null;
      for (const code of [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
        'ShiftLeft',
        'ShiftRight',
      ])
        surface.current?.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    };
    const block = () => {
      const value =
        document.hidden ||
        !document.hasFocus() ||
        !!document.querySelector('.modal-backdrop,.pet-focus-overlay,.burn-overlay');
      useExploration.setState({ blocked: value });
      if (value) {
        stop();
        if (document.pointerLockElement === surface.current) document.exitPointerLock();
      }
    };
    const observer = new MutationObserver(block);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['inert'],
    });
    const lock = () => {
      const current = document.pointerLockElement === surface.current;
      setLocked(current);
      if (wasLocked.current && !current && !useExploration.getState().blocked) onExit();
      wasLocked.current = current;
      stop();
    };
    document.addEventListener('pointerlockchange', lock);
    const element = surface.current;
    element.addEventListener('focusout', stop);
    document.addEventListener('visibilitychange', block);
    window.addEventListener('blur', block);
    window.addEventListener('focus', block);
    return () => {
      element.removeEventListener('focusout', stop);
      observer.disconnect();
      stop();
      resetExploration();
      onSurface(null);
      document.removeEventListener('pointerlockchange', lock);
      document.removeEventListener('visibilitychange', block);
      window.removeEventListener('blur', block);
      window.removeEventListener('focus', block);
      if (document.pointerLockElement === surface.current) document.exitPointerLock();
    };
  }, [onSurface, touch]);
  useEffect(() => {
    if (!blocked) surface.current?.focus();
  }, [blocked]);
  function move(event) {
    if (blocked) return;
    const previous = dragging.current;
    if (!previous && document.pointerLockElement !== surface.current) return;
    const dx = locked ? event.movementX : event.clientX - previous.x;
    const dy = locked ? event.movementY : event.clientY - previous.y;
    look.yaw -= dx * 0.003;
    look.pitch = Math.max(-1, Math.min(0.8, look.pitch - dy * 0.003));
    if (previous) dragging.current = { x: event.clientX, y: event.clientY };
  }
  return (
    <div className="exploration-ui">
      <div
        id="exploration-input"
        ref={surface}
        tabIndex={0}
        role="application"
        aria-label="自由探索视角，WASD 移动，空格跳跃，V 切换视角，Esc 返回教学"
        className={'exploration-surface' + (touch ? ' touch-look' : '')}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.code === 'Escape') {
            e.preventDefault();
            onExit();
          }
          if (e.code === 'Space' && !e.repeat) useExploration.setState({ jumpQueued: true });
          if (e.code === 'KeyV' && !e.repeat) useExploration.setState((s) => ({ fps: !s.fps }));
          if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
            e.preventDefault();
        }}
        onPointerDown={(e) => {
          surface.current.focus();
          dragging.current = { x: e.clientX, y: e.clientY };
          surface.current.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          dragging.current = null;
        }}
        onPointerCancel={() => {
          dragging.current = null;
        }}
      />
      <div className="exploration-caption" onClick={() => surface.current?.focus()}>
        <p>
          P9 · 自由探索 <strong>{fps ? '第一人称' : '第三人称'}</strong>
        </p>
        <span>WASD 移动 · Shift 跑动 · 空格跳跃 · V 切换 · 鼠标拖动视角</span>
        <div>
          <button onClick={() => useExploration.setState((s) => ({ fps: !s.fps }))}>
            切换视角 V
          </button>
          {!touch && (
            <button
              onClick={async () => {
                try {
                  await surface.current.requestPointerLock();
                  surface.current.focus();
                  setLockError(false);
                } catch {
                  setLockError(true);
                  surface.current.focus();
                }
              }}
            >
              {locked ? '鼠标已锁定' : '锁定鼠标'}
            </button>
          )}
          <button onClick={onExit}>返回教学 Esc</button>
        </div>
        {lockError && <small>鼠标锁定不可用，可按住画面拖动视角。</small>}
        {blocked && <small>探索已暂停，返回窗口后继续。</small>}
      </div>
      {fps && (
        <span className="exploration-reticle" aria-hidden="true">
          ＋
        </span>
      )}
      {touch && joystickReady && (
        <div
          style={{ visibility: blocked ? 'hidden' : 'visible' }}
          inert={blocked ? '' : undefined}
        >
          <EcctrlJoystick
            buttonNumber={0}
            joystickHeightAndWidth={150}
            joystickPositionLeft={10}
            joystickPositionBottom={12}
          >
            <JoystickResources />
          </EcctrlJoystick>
          <button
            className="exploration-jump"
            onPointerDown={(e) => {
              e.preventDefault();
              useExploration.setState({ jump: true, jumpQueued: true });
            }}
            onPointerUp={() => useExploration.setState({ jump: false })}
            onPointerCancel={() => useExploration.setState({ jump: false })}
          >
            跳跃
          </button>
        </div>
      )}
    </div>
  );
}
