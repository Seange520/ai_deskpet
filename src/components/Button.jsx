import { forwardRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useFineMotion, useMagnet } from './MicroEffects';
import { TACTILE } from '../motion';

// 所有按钮共享同一套触感反馈；保留原生 button 的语义、焦点与禁用行为。
const Button = forwardRef(function Button(
  {
    disabled,
    children,
    className = '',
    onPointerMove,
    onPointerLeave,
    onPointerCancel,
    onPointerDown,
    onKeyDown,
    ...props
  },
  ref,
) {
  const reduced = useReducedMotion();
  const fine = useFineMotion(),
    magnet = useMagnet(fine && !disabled);
  const [ripple, setRipple] = useState(null);
  function spread(node, clientX, clientY, keyboard = false) {
    if (disabled || reduced) return;
    const r = node.getBoundingClientRect(),
      size = Math.hypot(r.width, r.height) * 2;
    setRipple({
      key: performance.now(),
      size,
      x: keyboard ? r.width / 2 : clientX - r.x,
      y: keyboard ? r.height / 2 : clientY - r.y,
    });
  }
  return (
    <motion.button
      ref={ref}
      type="button"
      className={`micro-button ${className}`}
      disabled={disabled}
      whileTap={
        disabled || reduced
          ? undefined
          : { scale: 0.95, y: 2, boxShadow: '0 1px 0 rgba(0,0,0,0.15)' }
      }
      transition={TACTILE}
      onPointerMove={(e) => {
        magnet.onPointerMove(e);
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        magnet.onPointerLeave(e);
        onPointerLeave?.(e);
      }}
      onPointerCancel={(e) => {
        magnet.onPointerCancel(e);
        onPointerCancel?.(e);
      }}
      onPointerDown={(e) => {
        if (e.button === 0) spread(e.currentTarget, e.clientX, e.clientY);
        onPointerDown?.(e);
      }}
      onKeyDown={(e) => {
        if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) spread(e.currentTarget, 0, 0, true);
        onKeyDown?.(e);
      }}
      {...props}
    >
      {children}
      {className.includes('primary') && (
        <span className="cta-shimmer" aria-hidden="true">
          <i />
        </span>
      )}
      {ripple && (
        <span className="ripple-viewport" aria-hidden="true">
          <span
            key={ripple.key}
            className="button-ripple"
            style={{ width: ripple.size, height: ripple.size, left: ripple.x, top: ripple.y }}
            onAnimationEnd={() =>
              setRipple((current) => (current?.key === ripple.key ? null : current))
            }
          />
        </span>
      )}
    </motion.button>
  );
});
export default Button;
