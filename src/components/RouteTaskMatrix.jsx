import { useRef } from 'react';
import useDashboardDepth from './useDashboardDepth';
import { LockKeyhole } from 'lucide-react';
import { hardwareRoutes } from '../data/hardwareRoutes';
import { levelForRoute } from '../data/learningLevels';
import { useLearningStore } from '../stores/useLearningStore';
import './RouteTaskMatrix.css';

const tasks = [
  { key: 'materials', label: '物料' },
  { key: 'wiring', label: '接线' },
  { key: 'parameters', label: '参数' },
  { key: 'challenge', label: '代码' },
];

export default function RouteTaskMatrix() {
  const ref = useRef(null);
  useDashboardDepth(ref);
  const routeId = useLearningStore((state) => state.routeId);
  const routes = useLearningStore((state) => state.routes);
  const unlockedLevels = useLearningStore((state) => state.unlockedLevels);
  const completedLevels = useLearningStore((state) => state.completedLevels);

  return (
    <section ref={ref} className="task-matrix dashboard-depth" aria-labelledby="task-matrix-title">
      <div className="eyebrow">YOUR LEARNING MAP</div>
      <h2 id="task-matrix-title">路线任务矩阵</h2>
      <p className="task-matrix-intro">每条路线的四项任务，一眼看清下一步。</p>
      <table className="task-matrix-table">
        <caption className="sr-only">四条路线的物料、接线、参数实验和代码挑战完成情况</caption>
        <thead>
          <tr>
            <th scope="col">创造路线</th>
            {tasks.map((task) => (
              <th scope="col" key={task.key}>
                {task.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hardwareRoutes.map((route) => {
            const level = levelForRoute(route.id);
            const locked = !unlockedLevels.includes(level.id);
            const current = routeId === route.id;
            const progress = routes[route.id];
            const values = {
              materials: progress.materials === true,
              wiring: progress.wiring === true,
              parameters: progress.code === true,
              challenge: completedLevels.includes(level.id),
            };
            return (
              <tr
                className="task-matrix-row"
                data-route-id={route.id}
                data-current={current}
                key={route.id}
              >
                <th scope="row" className="task-matrix-route">
                  <span>{route.name}</span>
                  <small className="task-matrix-route-state">
                    {locked && <LockKeyhole size={10} aria-hidden="true" />}
                    {current ? '当前路线' : locked ? '未解锁' : '已解锁'}
                  </small>
                </th>
                {tasks.map((task) => (
                  <td className="task-matrix-cell" data-task={task.key} key={task.key}>
                    <span className="task-matrix-status" data-complete={values[task.key]}>
                      <span aria-hidden="true">{values[task.key] ? '[x]' : '[ ]'}</span>
                      <span className="sr-only">{values[task.key] ? '已完成' : '未完成'}</span>
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="task-matrix-note">
        [x] 已完成 · [ ] 未完成
        <br />
        参数实验与代码挑战分别记录。
      </p>
    </section>
  );
}
