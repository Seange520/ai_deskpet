import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Activity, Eye, Snowflake, ShieldCheck } from 'lucide-react';
import { useWorldMap } from '../world/navigationStore';
import { useExploration } from '../world/explorationState';
import { HYPOTHESES, LESSON, LENSES, KICKBACK_PROBES } from './kickback.mjs';
import { REACTIONS } from './reactions.mjs';
import { useKickback, nearKickback } from './kickbackStore';
function displayReading(r) {
  if (!r) return '等待测量';
  if (r.status === 'blocked') return '禁止带电检测';
  if (r.status === 'overflow') return 'OL · 量程溢出';
  if (r.status === 'fuse') return '电流档保险已断';
  if (r.status === 'open') return 'OL · 未导通';
  return `${r.value.toFixed(r.unit === 'A' ? 3 : 2)} ${r.unit}`;
}
export default function KickbackOverlay() {
  const s = useKickback(),
    nav = useWorldMap(),
    blocked = useExploration((v) => v.blocked);
  const available = nearKickback() && !nav.open && !nav.active;
  const [answer, setAnswer] = useState(''),
    [selected, setSelected] = useState(s.hypotheses);
  const [polarity, setPolarity] = useState('cathode-positive');
  const lessonRef = useRef(),
    dispatch = s.dispatch;
  useEffect(() => {
    if (!available) s.suspendView();
  }, [available]);
  useEffect(() => {
    if (s.courseOpen && available) lessonRef.current?.focus();
  }, [s.courseOpen, available]);
  const lens = LENSES.find((m) => m.id === s.mode);
  const keys = ['K1:voltage', 'U1:ac', 'M2:current', 'M2:resistance', 'K1:continuity', 'D1:diode'];
  const evidenceCount = keys.filter((k) => s.evidence[k]).length;
  if (!available) return null;
  return createPortal(
    <div
      className={'kickback-ui' + (s.blurSeconds > 0 ? ' fatigued' : '')}
      inert={blocked ? '' : undefined}
    >
      <output
        hidden
        data-testid="kickback-telemetry"
        data-lesson={s.lessonPassed}
        data-count={s.verified}
        data-completed={s.completed}
        data-peak={s.lastEvent?.peak ?? 0}
        data-resets={s.resets}
        data-protected={s.protected}
        data-meter-fuse={s.meterFuse}
        data-powered={s.powered}
        data-evidence={evidenceCount}
        data-repair={s.repair}
        data-xp={s.xp}
        data-prisms={s.prisms}
      />
      {!s.open && !s.courseOpen && (
        <button
          className="kickback-launch"
          data-testid="kickback-enter"
          onClick={() => dispatch({ type: 'enter' })}
        >
          <Snowflake size={18} />
          冷库支路 · 反峰陷阱
        </button>
      )}
      {s.courseOpen && !s.lessonPassed && (
        <div className="kickback-lesson-backdrop">
          <section
            ref={lessonRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="反峰观察微课"
            className="kickback-lesson"
            data-testid="kickback-lesson"
          >
            <small>熔炉外街 / 检修前观察</small>
            <h2>停下三十秒，看清先后。</h2>
            <p>不急着猜坏了哪一件。先记住现象出现的条件。</p>
            <div className="kickback-lesson-grid">
              {LESSON.map((row, i) => (
                <article key={i}>
                  <b>0{i + 1} / 现象</b>
                  <p>{row.phenomenon}</p>
                  <small>条件</small>
                  <p>{row.condition}</p>
                  <small>原理</small>
                  <p>{row.principle}</p>
                </article>
              ))}
            </div>
            <label>
              断开电流后，磁场里的储能会怎样？
              <select
                aria-label="微课单选答案"
                data-testid="kickback-lesson-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              >
                <option value="">选择一个解释</option>
                <option value="vanish">随开关断开立刻消失</option>
                <option value="release">经路径释放；快速电流变化可能产生尖峰</option>
                <option value="random">只由运气决定下一次是否异常</option>
              </select>
            </label>
            <footer>
              <output data-testid="kickback-lesson-time">
                观察 {Math.floor(s.lessonSeconds)} / 30 秒
              </output>
              <button
                data-testid="kickback-lesson-submit"
                disabled={s.lessonSeconds < 30 || !answer}
                onClick={() => dispatch({ type: 'lesson', answer })}
              >
                记录理解，开始排查
              </button>
            </footer>
            <p role="status" data-testid="kickback-lesson-status">
              {s.message}
            </p>
          </section>
        </div>
      )}
      {s.lessonPassed && s.open && (
        <section
          className="kickback-panel"
          aria-label="冷库支路六透镜仪表"
          data-testid="kickback-panel"
        >
          <header>
            <Snowflake size={22} />
            <div>
              <small>THE FORGE / CIRCUIT 02</small>
              <h2>反峰陷阱</h2>
            </div>
            <button
              aria-label="收起冷库仪表"
              data-testid="kickback-close"
              onClick={() => dispatch({ type: 'close' })}
            >
              收起
            </button>
          </header>
          <details open={s.hypotheses.length < 2}>
            <summary>观察 → 假设板</summary>
            <p>选 2–3 条记录，系统不评判对错。</p>
            {HYPOTHESES.map((h) => (
              <label className="kickback-hypothesis" key={h.id}>
                <input
                  type="checkbox"
                  data-testid={`kickback-hypothesis-${h.id}`}
                  checked={selected.includes(h.id)}
                  onChange={(e) =>
                    setSelected((items) =>
                      e.target.checked ? [...items, h.id] : items.filter((id) => id !== h.id),
                    )
                  }
                />
                {h.text}
              </label>
            ))}
            <button
              data-testid="kickback-save-hypotheses"
              onClick={() => dispatch({ type: 'hypotheses', values: selected })}
            >
              记录假设
            </button>
            <small data-testid="kickback-hypotheses-status">已记录 {s.hypotheses.length} 条</small>
          </details>
          <div className="kickback-lenses" role="group" aria-label="六种测量透镜">
            {LENSES.map((m) => (
              <button
                key={m.id}
                data-testid={`kickback-mode-${m.id}`}
                aria-pressed={s.mode === m.id}
                onClick={() => dispatch({ type: 'mode', mode: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="kickback-range">
            <label>
              量程
              <select
                aria-label="M1 量程"
                data-testid="kickback-range"
                value={s.range}
                onChange={(e) => dispatch({ type: 'range', range: e.target.value })}
              >
                {lens.ranges.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            {s.mode === 'diode' && (
              <label>
                方向
                <select
                  aria-label="二极管表笔方向"
                  data-testid="kickback-leads"
                  value={s.leads}
                  onChange={(e) => dispatch({ type: 'leads', value: e.target.value })}
                >
                  <option value="forward">正向：红接阳极</option>
                  <option value="reverse">反向：红接阴极</option>
                </select>
              </label>
            )}
          </div>
          <div className="street-lcd kickback-lcd">
            <small>
              {s.reading?.node ? `${s.reading.node} / ${lens.label}` : '24V 工作支路 · U1 5V'}
            </small>
            <output data-testid="kickback-reading">{displayReading(s.reading)}</output>
            <span>
              {s.reading?.detail || '电压档的峰值保持记录最近一次分断；不能把 OL 当故障结论。'}
            </span>
          </div>
          <button
            className="street-scanner-toggle"
            data-testid="kickback-scanner"
            aria-pressed={s.scanner}
            onClick={() => dispatch({ type: 'scanner' })}
          >
            <Eye size={16} />
            {s.scanner ? '关闭冷库检修视野' : '开启冷库检修视野'}
          </button>
          <div className="street-focus">
            <span>专注</span>
            <meter aria-label="冷库专注值" min="0" max="100" value={s.focus} />
            <b data-testid="kickback-focus">{Math.floor(s.focus)}</b>
            <small>视野 −5/s · 测量 −6</small>
          </div>
          <div className="kickback-evidence" data-testid="kickback-evidence">
            六类证据 {evidenceCount} / 6
            {keys.map((key) => (
              <span key={key} data-recorded={!!s.evidence[key]}>
                {key.replace(':', ' / ')} {s.evidence[key] ? '✓' : '○'}
              </span>
            ))}
          </div>
          <div className="kickback-actions">
            <button
              data-testid="kickback-cycle"
              disabled={s.verifying || s.cycleTime !== null}
              onClick={() => dispatch({ type: 'cycle' })}
            >
              <Activity size={13} />
              观察一次分断
            </button>
            <button data-testid="kickback-isolate" onClick={() => dispatch({ type: 'isolate' })}>
              断电隔离冷库
            </button>
            <button data-testid="kickback-energize" onClick={() => dispatch({ type: 'energize' })}>
              恢复冷库供电
            </button>
            <button
              data-testid="kickback-reset-protection"
              onClick={() => dispatch({ type: 'releaseProtection' })}
            >
              复位支路保护
            </button>
            <button
              data-testid="kickback-replace-fuse"
              onClick={() => dispatch({ type: 'replaceMeterFuse' })}
            >
              更换仪表保险
            </button>
            <button
              data-testid="kickback-diagnose"
              onClick={() => dispatch({ type: 'diagnose', cause: 'back-emf' })}
            >
              提交分断反峰诊断
            </button>
          </div>
          <details open={s.diagnosed}>
            <summary>断电修复与验收</summary>
            <label>
              续流支路方向
              <select
                aria-label="续流二极管安装方向"
                data-testid="kickback-polarity"
                value={polarity}
                onChange={(e) => setPolarity(e.target.value)}
              >
                <option value="cathode-positive">阴极接 +24V 侧</option>
                <option value="cathode-return">阴极接 0V 侧</option>
              </select>
            </label>
            <div className="kickback-actions">
              <button
                data-testid="kickback-install-diode"
                onClick={() => dispatch({ type: 'install', part: 'diode', polarity })}
              >
                安装续流二极管
              </button>
              <button
                data-testid="kickback-install-rc"
                onClick={() => dispatch({ type: 'install', part: 'rc' })}
              >
                安装 RC 吸收
              </button>
            </div>
            <button
              className="street-verify"
              data-testid="kickback-verify"
              disabled={s.verifying || s.completed}
              onClick={() => dispatch({ type: 'verify' })}
            >
              <ShieldCheck size={15} />
              {s.completed
                ? '10 次分断验收通过'
                : s.verifying
                  ? `连续分断 ${s.verified} / 10`
                  : '执行连续 10 次分断校验'}
            </button>
          </details>
          <button data-testid="kickback-talk" onClick={() => dispatch({ type: 'talk' })}>
            听听夜宵摊老板怎么说
          </button>
          <p className="street-status" role="status" data-testid="kickback-status">
            {s.message}
          </p>
          <footer>
            <span>{s.powered ? '● 供电' : '○ 隔离'}</span>
            <span>余压 {s.residualVoltage.toFixed(2)} V</span>
            <span>
              {s.protected ? '支路保护' : s.meterFuse === 'blown' ? '仪表保险熔断' : '仪表保险完好'}
            </span>
          </footer>
          {s.completed && (
            <p className="kickback-reward" data-testid="kickback-reward">
              知识经验 +{s.xp} XP · 记忆棱镜 ×{s.prisms} · 已领取
            </p>
          )}
          {s.storageError && <p role="alert">本地存储不可用，本次记录仅保留在当前会话。</p>}
          <details>
            <summary>工程反应图鉴 / 4 条可观测</summary>
            <div className="kickback-catalog">
              {REACTIONS.map((r) => (
                <article key={r.id} data-testid={`reaction-${r.id}`} data-active={r.active}>
                  <b>{r.name}</b>
                  <small>
                    {r.active ? (s.reactions.includes(r.id) ? '已观测' : '未观测') : '档案封存'}
                  </small>
                  <p>现象：{r.phenomenon}</p>
                  <p>条件：{r.condition}</p>
                </article>
              ))}
            </div>
          </details>
          <small className="street-model-note">24V 等效教学模型 · 0V 工作回流 ≠ PE</small>
        </section>
      )}
      {s.lessonPassed &&
        s.open &&
        KICKBACK_PROBES.map((p) => (
          <button
            hidden
            key={p.id}
            data-kickback-probe={p.id}
            data-testid={`kickback-probe-${p.id}`}
            className={`street-probe kickback-probe probe-${p.id}`}
            aria-label={`测量 ${p.label}`}
            onClick={() => dispatch({ type: 'measure', id: p.id })}
          >
            <i />
            <span>
              {p.label}
              <small>点击测量 · −6 专注</small>
            </span>
          </button>
        ))}
      {s.open && s.dialogue && (
        <div className="kickback-dialogue" data-testid="kickback-dialogue">
          <small>夜宵摊老板 / 冷柜那头</small>
          <p>{s.dialogue}</p>
          <button
            data-testid="kickback-dismiss-dialogue"
            onClick={() => dispatch({ type: 'dismissDialogue' })}
          >
            记下这句现象
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
