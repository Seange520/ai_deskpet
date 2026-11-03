import { useLearningStore } from '../stores/useLearningStore';
import { levelForRoute } from '../data/learningLevels';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { hardwareRoutes } from '../data/hardwareRoutes';
import Button from './Button';

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
  const completedLevels = useLearningStore((s) => s.completedLevels);
  return (
    <section className="route-gallery" aria-labelledby="route-gallery-title">
      <div className="section-title">
        <h2 id="route-gallery-title">选择你的创造路线</h2>
        <span>从 L1 出发，在代码工坊通关后解锁下一条路线。</span>
      </div>
      <div className="route-grid">
        {hardwareRoutes.map((route) => {
          const level = levelForRoute(route.id),
            locked = !unlockedLevels.includes(level.id);
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
                <span>
                  {level.id} · {route.difficulty}
                </span>
                <span>
                  {locked ? (
                    <>
                      <LockKeyhole size={13} /> 未解锁
                    </>
                  ) : completedLevels.includes(level.id) ? (
                    '挑战已通关'
                  ) : routeId === route.id ? (
                    '当前路线'
                  ) : (
                    '已解锁'
                  )}
                </span>
              </div>
              <RouteArtwork route={route} />
              <h3>{route.name}</h3>
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
