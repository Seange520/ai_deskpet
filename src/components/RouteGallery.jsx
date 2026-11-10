import { useLearningStore } from '../stores/useLearningStore';
import { levelForRoute } from '../data/learningLevels';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { hardwareRoutes } from '../data/hardwareRoutes';
import Button from './Button';
import NumberTicker from './ui/NumberTicker';

// SVG 仅来自本地受信配置，不接受用户输入或远程 HTML。
export function RouteArtwork({ route }) {
  return (
    <div
      className="route-artwork"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: route.hardwareImage }}
    />
  );
}
export default function RouteGallery({ routeId, onChoose }) {
  const unlockedLevels = useLearningStore((s) => s.unlockedLevels);
  const allProgress = useLearningStore((s) => s.routes);
  const completedLevels = useLearningStore((s) => s.completedLevels);
  return (
    <section className="route-gallery" aria-labelledby="route-gallery-title">
      <div className="section-title">
        <h2 id="route-gallery-title">选择你的创造路线</h2>
        <span>从 L1 出发，在誊写房通关后解锁下一条路线。</span>
      </div>
      <div className="route-grid">
        {hardwareRoutes.map((route) => {
          const level = levelForRoute(route.id),
            locked = !unlockedLevels.includes(level.id);
          const count =
            Object.values(allProgress[route.id]).filter(Boolean).length +
            Number(completedLevels.includes(level.id));
          return (
            <section
              className={`panel route-card ${locked ? 'is-locked' : ''} ${routeId === route.id ? 'is-selected' : ''}`}
              key={route.id}
              onClick={(event) => {
                if (locked && !event.target.closest('button')) onChoose(route.id, 'hardware');
              }}
              aria-label={`${route.name}路线卡片`}
            >
              <div className="route-card-meta">
                <span className="route-status">
                  {locked ? (
                    <>
                      <LockKeyhole size={13} /> 未解锁
                    </>
                  ) : count === 4 ? (
                    '已完成'
                  ) : routeId === route.id ? (
                    '当前路线'
                  ) : (
                    '继续挑战'
                  )}
                </span>
              </div>
              <h3 className="route-level-title">
                {level.id} · {route.difficulty}
              </h3>
              <div className="route-task-progress">
                <span>
                  任务进度 <NumberTicker value={count} /> / 4
                </span>
                <progress aria-label={route.name + '任务进度'} max="4" value={count} />
                <small>物料 · 接线 · 参数 · 代码挑战</small>
              </div>
              <RouteArtwork route={route} />
              <h4 className="route-name">{route.name}</h4>
              <p>{route.description}</p>
              {locked && (
                <p className="route-lock-hint">请先完成前置挑战 · 上一关代码目标通关后解锁</p>
              )}
              <Button
                className="btn full"
                aria-pressed={routeId === route.id}
                onClick={() => onChoose(route.id, 'hardware')}
              >
                {locked ? '查看解锁条件' : '探索' + route.name}
                <ArrowUpRight size={15} />
              </Button>
              <Button className="text-button" onClick={() => onChoose(route.id, 'materials')}>
                准备物料 · {route.name}
              </Button>
            </section>
          );
        })}
      </div>
    </section>
  );
}
