import { useEffect, useState } from 'react';
import { useStreet } from '../street/streetStore';
import { useKickback } from '../street/kickbackStore';
import { useHudLayout } from './useHudLayout';
import './hud.css';
export default function HudCapsule() {
  const s = useStreet(), k = useKickback();
  const focused = s.scanner || k.scanner;
  const hud = useHudLayout(focused);
  const stage = s.completed || k.completed ? 4 : s.verifying || k.verifying ? 3 : s.returnFixed || k.repair !== 'none' ? 2 : Object.keys(s.evidence).length || Object.keys(k.evidence).length ? 1 : 0;
  const [hint, setHint] = useState(true);
  useEffect(() => { setHint(true); const timer = setTimeout(() => setHint(false), 3000); return () => clearTimeout(timer); }, [stage]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.hudLeft = String(hud.left);
    root.dataset.hudRight = String(hud.right);
    root.dataset.hudBusy = String(hud.busy);
    root.dataset.hud = 'true';
    return () => { for (const key of ['hud', 'hudLeft', 'hudRight', 'hudBusy']) delete root.dataset[key]; };
  }, [hud.left, hud.right, hud.busy]);
  return <div className="hud-capsules">
    <button aria-expanded={!hud.left} aria-controls="hud-task" onClick={() => hud.toggle('left')}>任务 [</button>
    <button aria-expanded={!hud.right} aria-controls="hud-instrument" onClick={() => hud.toggle('right')}>仪表 ]</button>
    <span className="hud-progress" aria-label="检修进度">{['测量', '诊断', '修复', '校验'].map((name, i) => <span key={name} aria-current={Math.min(stage,3) === i ? 'step' : undefined}>{i < stage ? '✓ ' : ''}{name}</span>)}</span>
    <p className={'hud-hint' + (hint && !hud.busy ? ' visible' : '')} role="status">{['先测量，收集线路证据。', '根据证据诊断故障。', '完成修复后准备校验。', '等待全周期校验结果。', '校验完成，城市记住了这次修复。'][stage]}</p>
  </div>;
}

