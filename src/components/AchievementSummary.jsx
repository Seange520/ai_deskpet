import { hardwareRoutes } from '../data/hardwareRoutes';
import { BADGES, useLearningStore } from '../stores/useLearningStore';
import './AchievementSummary.css';

const goals = [
  { key: 'materials', hint: '认识任一已解锁路线的全部物料。' },
  { key: 'wiring', hint: '完成任一已解锁路线的正确接线。' },
  { key: 'code', hint: '完成接线后，调整参数并主动领取奖励。' },
];
const totalFaults = hardwareRoutes.reduce((sum, route) => sum + route.faultyCircuits.length, 0);

export default function AchievementSummary({ badges }) {
  const repaired = useLearningStore((state) => hardwareRoutes.reduce(
    (sum, route) => sum + route.faultyCircuits.filter(
      (fault) => state.debugProgress[route.id]?.[fault.id] === true,
    ).length,
    0,
  ));
  const next = goals.find((goal) => !badges[goal.key]);

  return (
    <div className="achievement-summary">
      <dl className="achievement-fault-stat">
        <dt>故障修复总数</dt>
        <dd><strong>{repaired}</strong><span> / {totalFaults} 题</span></dd>
      </dl>
      <div className="achievement-next">
        <span>下一枚勋章</span>
        <strong>{next ? BADGES[next.key] : '四枚成长勋章已集齐'}</strong>
        <p>{next ? next.hint : repaired === totalFaults
          ? '勋章与故障挑战均已完成，继续创造你的新作品。'
          : '四枚勋章已点亮，可以继续挑战故障排查。'}</p>
      </div>
    </div>
  );
}
