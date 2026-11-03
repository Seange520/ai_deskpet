import { Trophy, Sprout } from 'lucide-react';

const classmates = [
  { name: '小林同学', university: '东南大学', score: 820, color: '#d9ad75' },
  { name: '电路小熊', university: '电子科技大学', score: 680, color: '#84b7a0' },
  { name: '阿圆', university: '西安电子科技大学', score: 520, color: '#b4a5d0' },
  { name: '慢慢发光', university: '杭州电子科技大学', score: 300, color: '#9dbbd3' },
];
export default function MakerRanking({ xp }) {
  const rows = [
    ...classmates,
    {
      name: '未来创造者（你）',
      university: '我的大学 · 尚未设置',
      score: xp,
      color: '#7abb9b',
      self: true,
    },
  ].sort((a, b) => b.score - a.score || Number(Boolean(b.self)) - Number(Boolean(a.self)));
  const position = rows.findIndex((r) => r.self) + 1;
  return (
    <div className="page ranking-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">一起进步，比独自冲刺更有趣</div>
          <h1>
            创客排位，<span className="text-neon">慢慢发光。</span>
          </h1>
          <p>每一次尝试都值得被看见。这里比的是好奇心，不是起跑线。</p>
        </div>
      </div>
      <div className="rank-summary panel">
        <Sprout size={32} />
        <div>
          <span>你在体验榜的排名</span>
          <h2>
            第 {position} 名 <small>· {xp} 积分</small>
          </h2>
        </div>
        <Trophy size={32} />
      </div>
      <section className="panel rank-board" aria-label="创客排位体验榜">
        <div className="rank-board-heading">
          <h2>校园创客 · 体验榜</h2>
          <span className="pill">示例数据 · 非真实排名</span>
        </div>
        <ol>
          {rows.map((r, i) => (
            <li
              className={r.self ? 'is-you' : ''}
              key={r.name}
              aria-current={r.self ? 'true' : undefined}
            >
              <span className="rank-number">{i + 1}</span>
              <span className="rank-avatar" style={{ '--avatar': r.color }} aria-hidden="true">
                <i />
                <i />
              </span>
              <div className="rank-person">
                <b>{r.name}</b>
                <span>{r.university}</span>
              </div>
              <strong>
                {r.score}
                <small> XP</small>
              </strong>
            </li>
          ))}
        </ol>
      </section>
      <p className="rank-note">
        其他同学、大学与积分为演示用 Mock 数据；你的积分来自本机四路线累计 XP（基础课程每路线 500
        XP，故障题每题 25 XP，总上限 2200），重复练习不加分。无需注册，不上传个人信息。
      </p>
    </div>
  );
}
