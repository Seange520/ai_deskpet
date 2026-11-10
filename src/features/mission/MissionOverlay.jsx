import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Gauge, ShieldCheck, Wrench, Zap, Volume2, VolumeX } from 'lucide-react';
import { isMuted, playSound, setMuted } from '../../lib/sounds';
import { useMission } from './missionStore.mjs';
import { ORDERS, POINTS, STEP_LABELS, objective } from './missionData.mjs';
import { inRange } from './mission.mjs';

export default function MissionOverlay() {
  const { mission: s, ready, dispatch, metrics, destination, progress } = useMission();
  const [now, setNow] = useState(Date.now()),
    [muted, mute] = useState(isMuted);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        location.assign('?');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const cues = {
      briefed: 'confirm',
      powered: 'relay',
      isolated: 'click',
      located: 'measure',
      repaired: 'confirm',
      verified: 'chime',
      scored: 'success',
      violated: 'warning',
      retry: 'dizzy',
    };
    const kind = cues[s.step];
    if (kind) playSound(kind, muted);
  }, [s.step, muted]);
  const order = ORDERS[s.orderIndex],
    point = POINTS.find((p) => p.id === s.selected);
  const at = (id) => s.selected === id && inRange(s.position, id);
  const active = !['idle', 'briefed', 'violated', 'retry', 'scored'].includes(s.step);
  const seconds =
    s.step === 'idle' ? 0 : Math.max(0, Math.floor(((s.endedAt ?? now) - s.startedAt) / 1000));
  const button = (type, text, Icon = Wrench) => (
    <button data-testid={`action-${type}`} onClick={() => dispatch({ type })}>
      <Icon size={16} aria-hidden="true" />
      {text}
    </button>
  );
  return (
    <div
      className="mission-hud"
      data-mission-step={s.step}
      data-order={order.id}
      data-track={s.track}
      data-ready={ready}
    >
      <header className="mission-paper mission-header">
        <div className="mission-emblem">
          <Zap size={23} />
        </div>
        <div className="mission-heading">
          <small>
            <span className="mission-field-name">
              晴光街 / FIELD COMMISSION {order.id} · {s.orderIndex + 1} OF 3
            </span>
            <span
              className="mission-progress"
              data-progress={`${progress?.completed?.length ?? 0}/3`}
            >
              · 已完成 {progress?.completed?.length ?? 0}/3
            </span>
          </small>
          <h1>{order.title}</h1>
          <p>{objective(s)}</p>
        </div>
        <div className="mission-status">
          <span>{STEP_LABELS[s.step]}</span>
          <output aria-label="任务用时">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </output>
          <a className="mission-exit" href="?" title="退出委托，返回学习枢纽（Esc）">
            退出
          </a>
        </div>
        <button
          className="mission-mute"
          aria-label={muted ? '开启音效' : '静音'}
          onClick={() => {
            mute(!muted);
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </header>
      <div className="mission-street-title" aria-hidden="true">
        <span>THE SEVENTH CHECKSUM</span>
        <strong>晴光街</strong>
        <small>一盏灯，一条回家的路。</small>
      </div>
      {['idle', 'briefed', 'violated', 'retry', 'scored'].includes(s.step) && (
        <motion.section
          key={s.step + order.id}
          className="mission-paper mission-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          aria-labelledby="mission-dialog-title"
        >
          <small>维护者手册 / {order.id}</small>
          <h2 id="mission-dialog-title">
            {s.step === 'scored' ? '街灯又亮起来了' : STEP_LABELS[s.step]}
          </h2>
          {s.step === 'idle' && (
            <>
              <p>{order.symptom}</p>
              <div className="mission-tracks">
                <button
                  aria-pressed={s.track === 'experience'}
                  onClick={() => dispatch({ type: 'track', track: 'experience' })}
                >
                  体验轨<small>更多提示 · 最高 70 分</small>
                </button>
                <button
                  aria-pressed={s.track === 'validation'}
                  onClick={() => dispatch({ type: 'track', track: 'validation' })}
                >
                  校验轨<small>测量与记录 · 最高 100 分</small>
                </button>
              </div>
              <button
                className="mission-primary"
                data-testid="action-accept"
                disabled={!ready}
                onClick={() => dispatch({ type: 'accept' })}
              >
                {ready ? '接下这份委托' : '正在载入街景…'}
              </button>
            </>
          )}
          {s.step === 'briefed' && (
            <>
              <p>{order.symptom}</p>
              <p>
                {order.live
                  ? '保持 24V SELV 供电。先验电并记录，再设置隔离护罩，完成受保护的仿真操作。'
                  : '先断电、再测量、后修复。完成复核后再合闸。'}
              </p>
              {button('begin', '走进晴光街', ShieldCheck)}
            </>
          )}
          {s.step === 'violated' && (
            <>
              <p className="mission-warning">{s.message}</p>
              <p>
                本单失败 {s.failures} / 3 · 安全 {s.safety} 分。
                {s.failures >= 3 ? '本次重试将重开本单。' : '可以重新检查后继续。'}
              </p>
              {button('retry', '重新检查', ShieldCheck)}
            </>
          )}
          {s.step === 'retry' && (
            <>
              <p>供电状态已恢复；重新执行安全隔离。失败记录仍计入本单。</p>
              {button('resume', '开始重试', ShieldCheck)}
            </>
          )}
          {s.step === 'scored' && (
            <>
              <div className="mission-score">
                <strong data-testid="mission-score">{s.result.score}</strong>
                <span>
                  {s.result.title}
                  <small>
                    {Math.floor(s.result.elapsedSeconds)} 秒 ·{' '}
                    {s.track === 'validation' ? '校验轨' : '体验轨'}
                  </small>
                </span>
                <ClipboardCheck size={38} />
              </div>
              <p>{order.feedback}</p>
              <dl className="mission-breakdown">
                {Object.entries(s.result.components).map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {{ correctness: '正确', evidence: '证据', time: '时间', safety: '安全' }[key]}
                    </dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {s.orderIndex < 2 ? (
                button('next', '下一单 →', ClipboardCheck)
              ) : (
                <p data-testid="mission-complete">三单全部完成 · 晴光街恢复照明</p>
              )}
              <p className="mission-study">
                对应课节：K0-02《万用表 · 先选对档》
                <a href="/">回学习枢纽复习 →</a>
              </p>
              <a href="?">返回学习枢纽</a>
            </>
          )}
        </motion.section>
      )}
      <aside className="mission-paper mission-hint">
        <small>贺菲的便笺 / {s.track === 'experience' ? '体验轨' : '校验轨'}</small>
        <p>
          {destination
            ? `正在走向${POINTS.find((p) => p.id === destination)?.label}…`
            : s.track === 'experience'
              ? objective(s)
              : '让读数说话：故障记录与修复复测组成完整证据链。'}
        </p>
        <p className="mission-controls">
          WASD / 方向键行走 · E 交互
          <br />
          也可点击街上的设备走近操作
        </p>
        <small>24V SELV 教学仿真 · 不作为现场作业指导</small>
      </aside>
      {active && (
        <aside
          className="mission-paper mission-kit"
          aria-label="证据与测量面板"
          data-selected-point={s.selected || ''}
        >
          <header>
            <Gauge size={19} />
            <h2>{point ? point.label : '证据 / 测量'}</h2>
            <span>{s.evidence.filter((e) => e.key !== 'supply').length} / 2</span>
          </header>
          {!point && <p>点击设备走近，或靠近后按 E 打开工具。</p>}
          {point && (
            <>
              <output className="mission-reading" data-testid="mission-reading">
                {s.reading?.point === s.selected ? s.reading.value : '— — · 等待测量'}
              </output>
              <div className="mission-actions">
                {button('measure', '测量', Gauge)}
                <button
                  data-testid="action-record"
                  disabled={!s.reading || s.reading.point !== s.selected}
                  onClick={() => dispatch({ type: 'record' })}
                >
                  <ClipboardCheck size={16} />
                  记录读数
                </button>
                {at('switch') && s.step === 'powered' && (
                  <>
                    {button('isolate', order.live ? '设置隔离护罩' : '断电挂牌', ShieldCheck)}
                    {order.live && button('disconnect', '尝试断电', Zap)}
                  </>
                )}
                {at('switch') &&
                  ['repaired', 'verified'].includes(s.step) &&
                  button('energize', order.live ? '负载验证' : '合闸验证', Zap)}
                {s.selected !== 'switch' && s.step === 'powered' && (
                  <>
                    {button('pry', '尝试撬盖', Wrench)}
                    {button('repair', '尝试接线', Wrench)}
                  </>
                )}
                {s.selected !== 'switch' &&
                  s.step === 'isolated' &&
                  button('inspect', '检查故障', Gauge)}
                {at(order.target) && s.step === 'located' && button('repair', order.repair)}
                {at(order.target) &&
                  s.step === 'repaired' &&
                  button('verify', '复核修复结果', ClipboardCheck)}
              </div>
            </>
          )}
          <ul className="mission-evidence" aria-label="已记录证据">
            {s.evidence.map((e) => (
              <li key={e.key}>
                <ClipboardCheck size={13} />
                {e.key === 'supply' ? '验电' : e.key === 'pre' ? '故障' : '复测'}：{e.value}
              </li>
            ))}
          </ul>
          <p className="mission-message" role="status">
            {s.message}
          </p>
        </aside>
      )}
      <footer className="mission-footer">
        <span>
          R1 / 24V SELV · {s.track === 'validation' ? '校验轨' : '体验轨'} · 安全 {s.safety}
        </span>
        <output data-testid="mission-metrics" data-metrics={metrics ? JSON.stringify(metrics) : ''}>
          {metrics
            ? `${metrics.calls} DC / ${metrics.triangles.toLocaleString()} tris / ${metrics.fps ?? '…'} FPS`
            : '街景准备中'}
        </output>
      </footer>
    </div>
  );
}
