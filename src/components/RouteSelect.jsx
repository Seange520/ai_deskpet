import { useLearningStore } from '../stores/useLearningStore';
import { levelForRoute } from '../data/learningLevels';
import { useId } from 'react';
import { hardwareRoutes } from '../data/hardwareRoutes';

export default function RouteSelect({ routeId, onChange, label = '切换路线' }) {
  const id = useId();
  const unlockedLevels = useLearningStore((s) => s.unlockedLevels);
  return (
    <label className="route-select" htmlFor={id}>
      <span>{label}</span>
      <select id={id} aria-label={label} value={routeId} onChange={(e) => onChange(e.target.value)}>
        {hardwareRoutes.map((route) => (
          <option
            key={route.id}
            value={route.id}
            disabled={!unlockedLevels.includes(levelForRoute(route.id).id)}
          >
            {levelForRoute(route.id).id} · {route.name}
            {!unlockedLevels.includes(levelForRoute(route.id).id) ? ' · 未解锁' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
