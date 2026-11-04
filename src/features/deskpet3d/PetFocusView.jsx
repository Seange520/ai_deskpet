import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart, RotateCcw, X } from 'lucide-react';
import Button from '../../components/Button';
import './focus.css';

// A stable portal target moves the existing Canvas; opening never creates a second renderer.
export default function PetFocusView({ focused, onClose, onReset, onPet, children }) {
  const [host] = useState(() => {
    const node = document.createElement('div');
    node.className = 'pet-canvas-host';
    return node;
  });
  const dock = useRef(null);
  const expanded = useRef(null);
  const dialog = useRef(null);
  const close = useRef(null);
  useLayoutEffect(() => {
    (focused ? expanded.current : dock.current)?.appendChild(host);
  }, [focused, host]);
  useLayoutEffect(() => {
    if (!focused) return;
    const shell = document.querySelector('.app-shell');
    const previous = document.activeElement;
    const wasInert = shell?.inert;
    const overflow = document.body.style.overflow;
    if (shell) shell.inert = true;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const keepFocus = (event) => {
      if (!dialog.current?.contains(event.target)) close.current?.focus();
    };
    document.addEventListener('focusin', keepFocus);
    return () => {
      document.removeEventListener('focusin', keepFocus);
      if (shell) shell.inert = wasInert;
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [focused]);
  return (
    <>
      <div className="pet-canvas-dock" ref={dock} />
      {createPortal(children, host)}
      {focused &&
        createPortal(
          <section
            ref={dialog}
            className="pet-focus-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pet-focus-title"
            aria-describedby="pet-focus-hint"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onClose();
              }
              if (event.key !== 'Tab') return;
              const buttons = dialog.current.querySelectorAll('button:not(:disabled)');
              const first = buttons[0],
                last = buttons[buttons.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
          >
            <header className="pet-focus-header">
              <div>
                <span>SPARKMATE · COMPANION</span>
                <h2 id="pet-focus-title">只和小伙伴待一会儿。</h2>
              </div>
              <Button
                ref={close}
                className="pet-focus-close"
                aria-label="关闭桌宠聚焦"
                onClick={onClose}
              >
                <X size={20} />
              </Button>
            </header>
            <div ref={expanded} className="pet-focus-stage" />
            <footer className="pet-focus-footer">
              <p id="pet-focus-hint">拖拽旋转 · 滚轮或双指缩放 · 点击头部，送它一颗爱心</p>
              <div>
                <Button className="btn" onClick={onPet}>
                  <Heart size={16} />
                  摸摸头
                </Button>
                <Button className="btn" onClick={onReset}>
                  <RotateCcw size={16} />
                  重置视角
                </Button>
              </div>
              <small>Esc 返回学习 · 互动不会改变学习进度</small>
            </footer>
          </section>,
          document.body,
        )}
    </>
  );
}
