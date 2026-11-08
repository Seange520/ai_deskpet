import { useRaid } from './raidStore';
import { LOOT, CODE_MODULE, lootChoices, effects } from './raid.mjs';
import { useWorldMap } from '../world/navigationStore';
import { TARGETS, NODE, ENTRY, nearPoint } from './layout.mjs';
import { Shield, Radio, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import './raid.css';
const desc = {
  thick: '压降 −50% · 移速 −10%',
  shield: '抵消一次脚步噪声',
  capacitor: '冷却 −20% · 热势 +10',
  fuse: '短路损失 −60%',
  loose: '接点可能松动 · 每房材料 +1',
  mute: '鹰眼关闭文字提示 · 算力 +20',
};
const questions = [
  '工作线程停止心跳，怎样恢复？',
  '读数高频抖动，怎样稳定？',
  '链路反复断开，怎样避免重试拥塞？',
];
export default function RaidOverlay() {
  const s = useRaid(),
    r = s.run,
    nav = useWorldMap(),
    p = nav.position;
  const send = (type, extra = {}) => s.dispatch({ type, ...extra });
  const nearEntry = nearPoint(p, ENTRY, 2.6),
    terminal = r && ['failed', 'extracted'].includes(r.state);
  if (!r)
    return nearEntry && !nav.open && !nav.active ? (
      <section className="raid-entry">
        <b>[COPY-PENDING] 残响潜行 · 熔炉废料场</b>
        <p>12 分钟 / 三房测量 / 三枚核心。刷新或离开即放弃，失败保留 30% 材料。</p>
        <button
          data-raid-enter
          onClick={() => {
            s.start();
            send('enter');
            send('begin');
          }}
        >
          开启单局 · 步行穿过东门
        </button>
      </section>
    ) : null;
  const room = r.rooms[r.room],
    near = nearPoint(p, TARGETS[r.room]),
    node = nearPoint(p, NODE),
    choices = lootChoices(r);
  const start = () => {
    if (p[0] > 20.7) nav.travel('hardware');
    s.close();
  };
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="raid-panel"
      data-raid-panel
      data-raid-state={r.state}
      data-room={r.room}
    >
      <header>
        <b>
          <Radio size={16} /> 残响潜行
        </b>
        <output data-raid-clock>
          {Math.floor(r.timeLeft / 60)
            .toString()
            .padStart(2, '0')}
          :
          {Math.floor(r.timeLeft % 60)
            .toString()
            .padStart(2, '0')}
        </output>
        <button data-raid-close onClick={start}>
          返回 / 放弃
        </button>
      </header>
      {terminal ? (
        <div data-raid-result>
          <h2>[COPY-PENDING] {r.state === 'extracted' ? '撤离成功' : '本局结束'}</h2>
          <p>
            携回材料 {r.state === 'extracted' ? r.materials : Math.floor(r.materials * 0.3)} /{' '}
            {r.materials} · 核心 {r.cores}/3
          </p>
          <p>
            {r.state === 'failed'
              ? '这次没能走完，但你测得的知识还在。歇一会，再试一次。'
              : '工程结论：先隔离电源，再用低阻读数确认接地路径。'}
          </p>
          <p>
            累计材料 {s.save.meta.materials} · 首通奖励 {s.save.rewards.xp} XP /{' '}
            {s.save.rewards.prisms} 棱镜
          </p>
          <button data-raid-restart onClick={start}>
            回到街区
          </button>
        </div>
      ) : (
        <>
          <div className="raid-bars">
            <label>
              暴露 {r.exposure.toFixed(0)}
              <progress max="100" value={r.exposure} />
            </label>
            <label>
              警报 <span data-raid-alarm>{r.alarm.toFixed(0)}</span>
              <progress max="100" value={r.alarm} />
            </label>
          </div>
          <p className="raid-objective">
            [COPY-PENDING]{' '}
            {r.state === 'running'
              ? room.name + ' · ' + (r.kit.scanner && !effects(r).eyeText ? '—' : room.target)
              : r.state === 'checkpoint'
                ? '前往东侧校验节点'
                : '带三枚核心步行返回入口撤离'}{' '}
            · 核心 {r.cores}/3 · 材料 {r.materials}
          </p>
          <small>Ctrl 蹲行降低脚步噪声；箱体遮挡视线。进入院落后沿南侧三个琥珀测点推进。</small>
          {r.state === 'running' && (
            <>
              <div className="raid-measure">
                <button data-raid-eye onClick={() => send('scanner')} aria-pressed={r.kit.scanner}>
                  鹰眼 {r.kit.scanner ? '开' : '关'}
                </button>
                <select
                  data-raid-mode
                  value={r.kit.mode}
                  onChange={(e) => send('mode', { mode: e.target.value })}
                >
                  <option value="voltage">电压 V</option>
                  <option value="continuity">通断 Ω</option>
                </select>
                <button
                  data-raid-power
                  disabled={!near || room.powerUsed}
                  onClick={() => send('power')}
                >
                  隔离电源 · 停机 8s
                </button>
                <output className="raid-lcd" data-raid-reading>
                  {r.reading
                    ? r.reading.blocked
                      ? '联锁：请先断电'
                      : r.reading.value === null
                        ? 'OL'
                        : r.reading.value.toFixed(2) + ' ' + r.reading.unit
                    : '— —'}
                </output>
                <span>
                  专注 <output data-raid-focus>{r.kit.focus.toFixed(0)}</output> · 每次 −12 / 关鹰眼
                  +6/s
                </span>
                <div>
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      data-raid-probe={i}
                      disabled={!near}
                      onClick={() => send('measure', { probe: i })}
                    >
                      测点 {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  data-raid-solve
                  disabled={!near || !r.reading}
                  onClick={() => send('solve', { probe: r.reading?.probe })}
                >
                  确认当前测点
                </button>
              </div>
              {!near && <small>靠近当前房间的三灯测量柜（2.4m 内）才能操作。</small>}
              {!!choices.length && (
                <div className="raid-choices" data-raid-loot>
                  <b>[COPY-PENDING] 固定掉落：核心 ×1、材料 ×10；选择一项词条</b>
                  {choices.map((id) => (
                    <button key={id} data-raid-mod={id} onClick={() => send('loot', { id })}>
                      <b>{LOOT.find((m) => m.id === id).name}</b>
                      <small>{desc[id]}</small>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {r.state === 'checkpoint' && (
            <div className="raid-choices">
              <p>[COPY-PENDING] 重组机会 {r.rebuilds}/2 · 静默脚步 5s / CD30s</p>
              <button
                data-raid-rebuild
                disabled={!node || r.rebuilds === 0}
                onClick={() => send('rebuild')}
              >
                重组 · 解锁静默脚步
              </button>
              <b>{questions[r.question]}</b>
              {CODE_MODULE.map((m) => (
                <button
                  data-raid-code={m.id}
                  key={m.id}
                  disabled={!node || r.codeAnswered}
                  onClick={() => send('code', { id: m.id })}
                >
                  {m.name}
                  <pre>{m.code}</pre>
                </button>
              ))}
              {r.codeAnswered && (
                <output data-raid-code-result>
                  {r.modules.length ? '判分：正确，被动已获得' : '判分：未命中，本局不可用'}
                </output>
              )}
              <button
                data-raid-depart
                disabled={!node || !r.skillUnlocked}
                onClick={() => send('leaveCheckpoint')}
              >
                携核心前往撤离门
              </button>
            </div>
          )}
          <button
            data-raid-skill
            disabled={!r.skillUnlocked || r.elapsed < r.readyAt}
            onClick={() => send('skill')}
          >
            <Shield size={15} />
            静默脚步 ·{' '}
            {r.elapsed < r.silentUntil
              ? '生效中'
              : r.elapsed < r.readyAt
                ? Math.ceil(r.readyAt - r.elapsed) + 's'
                : 30 * effects(r).cooldownFactor + 's 冷却'}
          </button>
          {r.state === 'extracting' && (
            <button
              data-raid-extract
              disabled={r.cores !== 3 || !nearEntry || p[0] > 20.45}
              onClick={() => send('extract')}
            >
              <LogOut size={15} />
              撤离 · 需要三枚核心并返回旧圆台
            </button>
          )}
          <details>
            <summary>词条 {r.mods.length} / 六项说明</summary>
            {LOOT.map((m) => (
              <p key={m.id}>
                {r.mods.includes(m.id) ? '●' : '○'} {m.name}：{desc[m.id]}
              </p>
            ))}
          </details>
        </>
      )}
    </motion.section>
  );
}
