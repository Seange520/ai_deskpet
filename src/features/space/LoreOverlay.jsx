import { useEffect, useRef, useState } from 'react';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
import { LORE, SOS_PATTERN } from '../../data/lore';
import { useSpaceStore } from './spaceStore';
import { revealLore, useLorePresentation, usePresentationBlocked } from './useLorePresentation';

function ArchiveLamp({ paused }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (paused) {
      setLit(false);
      return;
    }
    let index = 0,
      timer;
    const pulse = () => {
      if (index >= SOS_PATTERN.length) {
        setLit(false);
        return;
      }
      setLit(true);
      timer = setTimeout(() => {
        setLit(false);
        index++;
        timer = setTimeout(pulse, index === 3 || index === 6 ? 650 : 220);
      }, SOS_PATTERN[index] * 220);
    };
    pulse();
    return () => clearTimeout(timer);
  }, [paused]);
  return (
    <div className="sos-archive">
      <i data-lit={lit} aria-hidden="true" />
      <span>
        档案灯 · · · ━ ━ ━ · · ·<small>三短 · 三长 · 三短（SOS）</small>
      </span>
    </div>
  );
}

export default function LoreOverlay({ meteor, tier }) {
  const focus = useSpaceStore((s) => s.focus);
  const phase = useSpaceStore((s) => s.phase);
  const blocked = usePresentationBlocked();
  const reduced = useReducedMotionPreference();
  const message = useLorePresentation((s) => s.message);
  const timer = useRef();
  useEffect(() => {
    useLorePresentation.setState({ message: null });
    return () => clearTimeout(timer.current);
  }, [focus, phase, blocked, tier]);
  useEffect(() => {
    if (!message) return;
    timer.current = setTimeout(() => useLorePresentation.setState({ message: null }), 16000);
    return () => clearTimeout(timer.current);
  }, [message]);
  const available =
    focus === 'hardware'
      ? ['echo']
      : focus === 'code'
        ? ['loop']
        : focus === 'dashboard'
          ? ['sos']
          : ['meteor'];
  const hidden = blocked || phase === 'entering' || phase === 'leaving';
  return (
    <div className="lore-layer" hidden={hidden}>
      <div className="lore-archive" aria-label="维护网络档案">
        {available.map((id) => (
          <button type="button" key={id} onClick={() => revealLore(LORE[id])}>
            ⌁ {LORE[id].title}
          </button>
        ))}
      </div>
      <button
        type="button"
        ref={meteor}
        hidden
        className="memory-meteor-hotspot"
        onClick={() => revealLore(LORE.meteor)}
        aria-label="捕捉流星记忆"
      >
        ✧ 读取记忆
      </button>
      {message && (
        <aside className="lore-memory" aria-label="桌宠的记忆提示">
          <button
            type="button"
            className="lore-dismiss"
            aria-label="关闭记忆提示"
            onClick={() => useLorePresentation.setState({ message: null })}
          >
            ×
          </button>
          <small>SPARKMATE · 维护网络档案</small>
          <h3>{message.title}</h3>
          <p role="status">{message.text}</p>
          <p className="lore-detail">{message.detail}</p>
          {message.id === 'sos' && <ArchiveLamp paused={blocked || reduced} />}
        </aside>
      )}
    </div>
  );
}
