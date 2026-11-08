import EnvEntry from '../env/CaseBoardPanel';
import TrustEntry from '../trust/TrustPanel';
import AssemblyEntry from '../assembly/AssemblyEntry';
import { confidenceFor, verifyDuration } from '../resonance/resonance.mjs';
import KickbackOverlay from './KickbackOverlay';
import { useEffect, useState } from 'react';
import {
  Activity,
  Zap,
  Radio,
  Wrench,
  Flame,
  ShieldCheck,
  Eye,
  Power,
  MessageCircle,
} from 'lucide-react';
import { useWorldMap } from '../world/navigationStore';
import { useStreet, inStreetRange } from './streetStore';
import { PROBES, sampleCircuit } from './circuit.mjs';
import './street.css';
const stages = {
  idle: '待检修',
  red: '线路发红',
  smoke: '绝缘冒烟',
  sparks: '电弧打火',
  fire: '局部明火',
  tripped: '保险丝熔断',
};
export default function StreetOverlay() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 700);
  const s = useStreet(),
    nav = useWorldMap();
  const near = inStreetRange(),
    available = near && !nav.open && !nav.active;
  const dispatch = s.dispatch,
    c = sampleCircuit(s);
  useEffect(() => {
    if (!available) s.closeScanner();
  }, [available]);
  return (
    <div
      className={'street-ui' + (s.scanner && available ? ' scanning' : '')}
      data-street-active={available}
      data-street-stage={s.stage}
    >
      <KickbackOverlay />
      <AssemblyEntry />
      <TrustEntry />
      <EnvEntry />
      {s.scanner && available && <div className="street-scan-filter" aria-hidden="true" />}
      <section className="street-title" aria-label="会呼吸的路灯任务">
        <small>THE SEVENTH CHECKSUM / P10 · 01</small>
        <h1>
          会呼吸的路灯<span>熔炉外街</span>
        </h1>
        <p>
          {s.completed
            ? '城市记住了这一次修复。'
            : near
              ? '一盏灯的呼吸，牵动整条街的夜。'
              : '沿东侧连桥前往硬件台地，熔炉外街就在途中。'}
        </p>
      </section>
      {available && (
        <>
          <section
            className={'street-meter' + (collapsed ? ' minimized' : '')}
            aria-label="万用表检修面板"
          >
            <header>
              <div className="street-meter-icon">
                <Activity size={22} />
              </div>
              <div>
                <small>MAINTAINER'S FIELD KIT</small>
                <h2>万用表 · 检修视野</h2>
              </div>
              <span className={s.fuse === 'blown' ? 'street-led fault' : 'street-led'} />
              <button
                className="street-meter-collapse"
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((v) => !v)}
              >
                {collapsed ? '展开仪表' : '收起仪表'}
              </button>
            </header>
            <div className="street-meter-tabs">
              <button
                aria-pressed={s.mode === 'voltage'}
                onClick={() => dispatch({ type: 'mode', mode: 'voltage' })}
              >
                <Zap size={15} />
                电压
              </button>
              <button
                aria-pressed={s.mode === 'continuity'}
                onClick={() => dispatch({ type: 'mode', mode: 'continuity' })}
              >
                <Radio size={15} />
                通断
              </button>
            </div>
            <div className="street-lcd">
              <small>
                {s.reading
                  ? PROBES.find((p) => p.id === s.reading.node)?.label
                  : '24 V / SELV · 低压仿真'}
              </small>
              <output data-testid="street-reading">
                {s.reading?.value ||
                  (s.mode === 'continuity'
                    ? '等待离线测量'
                    : s.powered
                      ? c.voltage.toFixed(2) + ' V'
                      : '电源已隔离')}
              {s.modifiers?.confidence && s.reading && <small data-resonance-confidence> · {confidenceFor(s.reading.node,s.mode,s.reading,s.resonanceAttempts?.[s.reading.node+':'+s.mode]||1)}</small>}</output>
              <span>
                {s.reading?.detail || '每 7 秒一次负载启动。开启视野，点击空间中的测点。'}
              </span>
            </div>
            <button
              className={'street-scanner-toggle' + (s.scanner ? ' on' : '')}
              aria-pressed={s.scanner}
              onClick={() => dispatch({ type: 'scanner' })}
            >
              <Eye size={17} />
              {s.scanner ? '关闭鹰眼透视' : '开启鹰眼透视'}
              <kbd>−12 / 测点</kbd>
            </button>
            <div className="street-focus">
              <span>专注</span>
              <meter min="0" max="100" value={s.focus} aria-label="专注值" />
              <b>{Math.floor(s.focus)}</b>
            </div>
            {s.modifiers && <div>{Object.entries(s.resonanceNotes||{}).map(([k,text])=><p className="resonance-case-note" data-resonance-clue={k} key={k}>{text}</p>)}</div>}
            <div className="street-evidence">
              <small>检修记录 / {Object.keys(s.evidence).length} 项证据</small>
              <div>
                <span className={s.evidence['lamp:voltage'] ? 'done' : ''}>灯端压降</span>
                <span className={s.evidence['return:continuity'] ? 'done' : ''}>回流接触</span>
                <span className={s.evidence['motor:voltage'] ? 'done' : ''}>启动浪涌</span>
              </div>
            </div>
            <details open={s.scanner || undefined}>
              <summary>
                病因判断与修复 <Wrench size={13} />
              </summary>
              <div className="street-actions">
                <button
                  aria-pressed={s.diagnoses.includes('return')}
                  onClick={() => dispatch({ type: 'diagnose', cause: 'return' })}
                >
                  确认接地不良
                </button>
                <button
                  aria-pressed={s.diagnoses.includes('surge')}
                  onClick={() => dispatch({ type: 'diagnose', cause: 'surge' })}
                >
                  确认启动过载
                </button>
                <button onClick={() => dispatch({ type: 'isolate' })}>
                  <Power size={13} />
                  断电隔离
                </button>
                <button onClick={() => dispatch({ type: 'replaceFuse' })}>更换保险丝</button>
                <button
                  disabled={s.returnFixed}
                  onClick={() => dispatch({ type: 'repair', part: 'return' })}
                >
                  {s.returnFixed ? '✓ 回流已修复' : '修复接点 · 独立回流'}
                </button>
                <button
                  disabled={s.softStart}
                  onClick={() => dispatch({ type: 'repair', part: 'surge' })}
                >
                  {s.softStart ? '✓ 软启动已加入' : '加入压缩机软启动'}
                </button>
              </div>
            </details>
            <button
              className="street-verify"
              onClick={() => dispatch({ type: 'verify' })}
              disabled={s.verifying || s.completed}
            >
              <ShieldCheck size={16} />
              {s.completed
                ? '7 秒全周期校验通过'
                : s.verifying
                  ? `稳定性校验 ${Math.min(s.modifiers?.protocol ? verifyDuration(7,s.modifiers.sync) : 7, s.verifiedSeconds).toFixed(1)} / ${s.modifiers?.protocol ? verifyDuration(7,s.modifiers.sync) : 7} s`
                  : s.modifiers?.protocol ? `恢复供电 · ${verifyDuration(7,s.modifiers.sync)} 秒校验` : '恢复供电 · 7 秒校验'}
            </button>
            <button
              className="street-danger"
              disabled={s.completed || s.stage !== 'idle' || !s.powered}
              onClick={() => dispatch({ type: 'jumper' })}
            >
              <Flame size={14} />
              未排障，强行跨接供电
            </button>
            <p className="street-status" role="status">
              {s.message}
            </p>
            <footer>
              <span>{s.powered ? '● 带电' : '○ 断电'}</span>
              <span>{s.fuse === 'blown' ? 'F1 / 已熔断' : 'F1 / 完好'}</span>
              <span>{stages[s.stage]}</span>
            </footer>
            <small className="street-model-note">24V 仿真 · 热量 / I²t 示意模型</small>
          </section>
          {PROBES.map((probe) => (
            <button
              key={probe.id}
              hidden
              data-street-probe={probe.id}
              className={'street-probe ' + (probe.id === 'return' ? 'hotspot' : '')}
              onClick={() => dispatch({ type: 'measure', id: probe.id })}
            >
              <i />
              <span>
                {probe.label}
                <small>点击测量 · −12 专注</small>
              </span>
            </button>
          ))}
          <button className="street-vendor" onClick={() => dispatch({ type: 'talk' })}>
            <MessageCircle size={16} />
            与夜宵摊老板交谈
          </button>
          {s.stage !== 'idle' && (
            <div className={'street-hazard ' + s.stage} role="alert">
              <Flame size={20} />
              <div>
                <b>{stages[s.stage]}</b>
                <span>
                  {s.stage === 'tripped'
                    ? '供电已切断 · 检查余热并更换保险丝'
                    : '短路故障链正在推进 · 保险丝保护计时中'}
                </span>
              </div>
            </div>
          )}
          {s.completed && (
            <div className="street-reward">
              <ShieldCheck size={18} />
              <div>
                检修验收完成
                <small>
                  知识经验 +{s.xp} XP · 记忆棱镜 ×{s.prisms}
                </small>
              </div>
            </div>
          )}
          {s.dialogue > 0 && s.completed && (
            <div className="street-dialogue" key={s.dialogue} data-testid="street-dialogue">
              <small>熔炉外街 / 夜宵摊老板</small>
              <p>“今晚灯没眨，客人多了一倍。”</p>
              <span>你修好的不只是路灯，也是这里继续生活的理由。</span>
              <button onClick={() => dispatch({ type: 'dismissDialogue' })}>收起对话</button>
            </div>
          )}
          {s.storageError && (
            <p className="street-save-warning">存储不可用，本次奖励已获得，但刷新后无法保留。</p>
          )}
        </>
      )}
    </div>
  );
}
