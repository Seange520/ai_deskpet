import { useId } from 'react';
import { hardwareRoutes } from '../data/hardwareRoutes';

export default function RouteSelect({ routeId, onChange, label = '切换路线' }) {
  const id = useId();
  return (
    <label className="route-select" htmlFor={id}>
      <span>{label}</span>
      <select id={id} aria-label={label} value={routeId} onChange={(e) => onChange(e.target.value)}>
        {hardwareRoutes.map((route) => (
          <option key={route.id} value={route.id}>
            {route.name}
          </option>
        ))}
      </select>
    </label>
  );
}
