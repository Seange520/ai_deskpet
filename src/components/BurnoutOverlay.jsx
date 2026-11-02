import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Button from './Button';

// Portal 放到 body，避免被页面遮罩裁切；真实硬件、订单和已获成就均不受影响。
export default function BurnoutOverlay({ onReset }) {
  const button = useRef(null);
  useLayoutEffect(() => {
    const root = document.querySelector('.app-shell'),
      previous = document.activeElement,
      wasInert = root?.inert,
      overflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    button.current?.focus();
    return () => {
      if (root) root.inert = wasInert;
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div
      className="burnout-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="burnout-title"
      aria-describedby="burnout-description"
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          button.current?.focus();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onReset();
        }
      }}
    >
      <div className="burnout-haze" aria-hidden="true" />
      <div className="burnout-content">
        <div className="charred-board" aria-hidden="true">
          <span />
          <i />
          <i />
          <i />
        </div>
        <span className="burnout-kicker">POWER POLARITY ERROR · 模拟异常结局</span>
        <AlertTriangle size={34} />
        <h2 id="burnout-title">BOOM！你的开发板烧了，重新买一块吧（点击重置）</h2>
        <p role="alert">危险！可能烧毁主板！</p>
        <p id="burnout-description">
          VCC 被接到了 GND。先断电，再检查极性。
          <br />
          这是强化记忆的模拟结局，不会损坏硬件、扣款或清除已获成就。
        </p>
        <Button ref={button} className="btn primary" onClick={onReset}>
          <RotateCcw size={17} />
          重置模拟开发板
        </Button>
        <small>接错是学习的一部分。重置后，把这次经验留住。</small>
      </div>
    </div>,
    document.body,
  );
}
