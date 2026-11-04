import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { levelFor, MAX_XP, totalXP, useLearningStore } from '../stores/useLearningStore';
import NumberTicker from './ui/NumberTicker';
import './GrowthOverview.css';
import useDashboardDepth from './useDashboardDepth';

const milestones = [500, 1000, 1500, 2000];

export default function GrowthOverview() {
  const xp = useLearningStore((state) => totalXP(state.routes, state.debugProgress));
  const level = levelFor(xp);
  const complete = xp >= MAX_XP;
  const nextLevelXP = level * 500;
  const finalStretch = nextLevelXP > MAX_XP;
  const remaining = Math.max(0, Math.min(nextLevelXP, MAX_XP) - xp);
  const progress = Math.min(1, Math.max(0, xp / MAX_XP));
  const ref = useRef(null);
  useDashboardDepth(ref);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reducedMotion = useReducedMotion();
  const ring = {
    cx: 80,
    cy: 80,
    r: 64,
    fill: 'none',
    strokeWidth: 8,
    pathLength: 1,
    strokeDasharray: '1 1',
    strokeLinecap: 'round',
    strokeOpacity: progress === 0 ? 0 : 1,
    className: 'growth-ring-fill',
  };

  return (
    <section
      ref={ref}
      className="growth-overview dashboard-depth"
      aria-labelledby="growth-overview-title"
    >
      <div className="growth-heading">
        <div className="eyebrow">EVERY SPARK COUNTS</div>
        <h2 id="growth-overview-title">成长总览</h2>
        <p>把每一次探索，积累成看得见的成长。</p>
      </div>
      <div className="growth-body">
        <div className="growth-ring" role="img" aria-label={`课程经验 ${xp} / ${MAX_XP} XP`}>
          <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
            <circle
              className="growth-ring-track"
              cx="80"
              cy="80"
              r="64"
              fill="none"
              strokeWidth="8"
            />
            {reducedMotion !== false ? (
              <circle {...ring} strokeDashoffset={1 - progress} />
            ) : (
              <motion.circle
                {...ring}
                initial={false}
                animate={{ strokeDashoffset: inView ? 1 - progress : 1 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </svg>
          <div className="growth-ring-value" aria-hidden="true">
            <span>累计 XP</span>
            <strong>
              <NumberTicker value={xp} />
            </strong>
            <small>/ {MAX_XP} XP</small>
          </div>
        </div>
        <div className="growth-details">
          <div className="growth-level">
            LV.{level} · {xp >= 500 ? '进阶创客' : '新手创客'}
          </div>
          <p className="growth-next">
            {complete ? (
              '课程 XP 已集齐'
            ) : finalStretch ? (
              <>
                距课程 XP 集齐还差 <strong>{remaining} XP</strong>
              </>
            ) : (
              <>
                距 LV.{level + 1} 还差 <strong>{remaining} XP</strong>
              </>
            )}
          </p>
          <p className="growth-caption">
            {complete
              ? '所有课程经验已收集，继续探索你的创作可能。'
              : '四条路线与故障挑战的累计经验，都会在这里留下印记。'}
          </p>
          <ol className="growth-milestones" aria-label="等级里程碑">
            {milestones.map((threshold, index) => (
              <li key={threshold} data-reached={xp >= threshold}>
                <span>{threshold}</span>
                <small>XP · LV.{index + 2}</small>
                <span className="sr-only">{xp >= threshold ? '已达成' : '未达成'}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
