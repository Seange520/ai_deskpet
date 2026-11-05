import { create } from 'zustand';

const imports = {
  dashboard: () => import('./islands/DashboardIsland.jsx'),
  hardware: () => import('./islands/HardwareIsland.jsx'),
  code: () => import('./islands/CodeIsland.jsx'),
  ranking: () => import('./islands/RankingIsland.jsx'),
};
const requests = new Map();
const timeoutMs = 4000;

export const useIslandAssetFailures = create(() => ({}));

export function preloadIsland(id) {
  if (!Object.hasOwn(imports, id) || requests.has(id)) return;
  const record = { Content: null, pending: null };
  requests.set(id, record);
  record.pending = new Promise((resolve) => {
    const finish = (failed) => {
      clearTimeout(timer);
      record.pending = null;
      const failures = useIslandAssetFailures.getState();
      if (Boolean(failures[id]) !== failed) useIslandAssetFailures.setState({ [id]: failed });
      resolve();
    };
    const timer = setTimeout(() => finish(true), timeoutMs);
    imports[id]().then(
      ({ default: Content }) => {
        record.Content = Content;
        finish(false);
      },
      () => finish(true),
    );
  });
}

export function useIslandContent(id) {
  // A delayed successful import can replace a timeout placeholder on an already visible island.
  useIslandAssetFailures((state) => state[id]);
  preloadIsland(id);
  const { pending, Content } = requests.get(id);
  if (pending) throw pending;
  return Content;
}
