import { useEffect, useState } from 'react';
import { hardwareRoutes, DEFAULT_ROUTE_ID, isRouteId } from '../data/hardwareRoutes';

export const ROUTE_STORAGE = 'sparkmate.routes.v2';
const blank = () => ({ materials: false, wiring: false, code: false });
const empty = () => ({
  routeId: DEFAULT_ROUTE_ID,
  routes: Object.fromEntries(hardwareRoutes.map((r) => [r.id, blank()])),
});
function clean(p) {
  return {
    materials: p?.materials === true,
    wiring: p?.wiring === true,
    code: p?.code === true && p?.wiring === true,
  };
}
function parse(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function load() {
  const state = empty(),
    saved = parse(ROUTE_STORAGE);
  if (saved?.routes && typeof saved.routes === 'object') {
    state.routeId = isRouteId(saved.routeId) ? saved.routeId : DEFAULT_ROUTE_ID;
    for (const route of hardwareRoutes) state.routes[route.id] = clean(saved.routes[route.id]);
  } else state.routes.classic = clean(parse('sparkmate.progress.v1'));
  return state;
}

// 每条路线独立记录关卡。旧版进度只迁移到 classic，不为其他作品误发成就。
export default function useHardwareProgress() {
  const [state, setState] = useState(load),
    [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(ROUTE_STORAGE, JSON.stringify(state));
      localStorage.removeItem('sparkmate.progress.v1');
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  function selectRoute(id) {
    if (isRouteId(id)) setState((current) => ({ ...current, routeId: id }));
  }
  function complete(key) {
    if (!['materials', 'wiring', 'code'].includes(key)) return;
    const id = state.routeId;
    setState((current) => ({
      ...current,
      routes: {
        ...current.routes,
        [id]: { ...current.routes[id], [key]: key === 'code' ? current.routes[id].wiring : true },
      },
    }));
  }
  return {
    routeId: state.routeId,
    progress: state.routes[state.routeId],
    allProgress: state.routes,
    selectRoute,
    complete,
    storageError,
    reset: () => setState(empty()),
  };
}
