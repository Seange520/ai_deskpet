import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { LiquidGlass } from '@khvicha/react-liquid-glass';
import { Tilt, useTiltContext } from '@gfazioli/react-tilt';

// 精细鼠标才启用位移；触屏保持原生滚动，减少动态效果时关闭所有空间动效。
export function useFineMotion() {
  const reduced = useReducedMotion();
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const query = matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFine(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return fine && !reduced;
}

// 只在当前元素内监听鼠标，合并到每帧一次；卸载、取消和离开时清理。
export function useMagnet(enabled) {
  const frame = useRef(0),
    target = useRef(null);
  function reset() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    target.current?.style.setProperty('--magnet-x', '0px');
    target.current?.style.setProperty('--magnet-y', '0px');
  }
  useEffect(() => {
    if (!enabled) reset();
    return reset;
  }, [enabled]);
  return {
    onPointerMove(e) {
      if (!enabled || e.pointerType !== 'mouse') return;
      target.current = e.currentTarget;
      const node = e.currentTarget,
        r = node.getBoundingClientRect();
      const x = Math.max(-3, Math.min(3, (e.clientX - r.x - r.width / 2) * 0.035));
      const y = Math.max(-2, Math.min(2, (e.clientY - r.y - r.height / 2) * 0.035));
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        node.style.setProperty('--magnet-x', `${x}px`);
        node.style.setProperty('--magnet-y', `${y}px`);
        frame.current = 0;
      });
    },
    onPointerLeave: reset,
    onPointerCancel: reset,
  };
}

export function Depth({ as: Tag = 'span', depth = 0.5, style, ...props }) {
  const { rotation, isHovering, prefersReducedMotion } = useTiltContext();
  const active = isHovering && !prefersReducedMotion;
  return (
    <Tag
      {...props}
      style={{
        ...style,
        transform: active
          ? `translate3d(${rotation.y * depth}px,${-rotation.x * depth}px,${depth * 12}px)`
          : 'translate3d(0,0,0)',
        transition: 'transform .4s cubic-bezier(.16,1,.3,1)',
      }}
    />
  );
}

export function TiltSurface({ children, navigation = false }) {
  const fine = useFineMotion();
  const magnet = useMagnet(fine && !navigation);
  return (
    <div
      className={`tilt-anchor ${navigation ? 'nav-tilt-anchor' : 'card-tilt-anchor'}`}
      {...magnet}
    >
      <Tilt
        className={`tilt-surface ${navigation ? 'nav-tilt' : 'card-tilt'}`}
        disabled={!fine}
        touchEnabled={false}
        gyroscopeEnabled={false}
        maxRotation={navigation ? 2 : 3}
        threshold={80}
        perspective={1400}
        transitionDuration={400}
        transitionEasing="cubic-bezier(.16,1,.3,1)"
        radius={navigation ? 12 : 24}
        lightEffect={fine}
        lightOverlay
        lightColor="rgb(167,216,190)"
        lightIntensity={0.1}
        lightSize={65}
        hoverScale={1}
      >
        {children}
      </Tilt>
    </div>
  );
}

export function HeroGlass() {
  const ref = useRef(null),
    inView = useInView(ref),
    fine = useFineMotion();
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  return (
    <div ref={ref} className="hero-liquid" aria-hidden="true" data-flow={fine && inView && visible}>
      <span className="hero-ambient" />
      <LiquidGlass
        className="hero-glass"
        contentClassName="hero-glass-content"
        blur={8}
        tint="rgba(226,232,240,0.018)"
        borderColor="rgba(226,232,240,0.1)"
        borderRadius={24}
        enableBorderAnimation={false}
        enableClickAnimation={false}
        enableShadow={false}
        enableGlassEffect={fine}
        displacementScale={8}
        turbulenceFrequency={0.009}
        turbulenceOctaves={1}
        blurStdDeviation={0.5}
        surfaceScale={0.5}
        parallaxMovement={0}
      >
        <span />
      </LiquidGlass>
    </div>
  );
}
