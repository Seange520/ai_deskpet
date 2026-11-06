import { create } from 'zustand';
import { preloadIsland } from './islandAssets';
import { ISLAND_HUD } from './spaceLayout.js';

export const INITIAL_ISLAND = 'dashboard';
const overview = 'hub';

export const isSpaceTransition = (phase) => phase === 'entering' || phase === 'leaving';

export const useSpaceStore = create((set) => ({
  focus: INITIAL_ISLAND,
  destination: INITIAL_ISLAND,
  phase: 'detail',
  request: 0,
  travelTo: (id) => {
    if (!Object.hasOwn(ISLAND_HUD, id)) return;
    preloadIsland(id);
    set((state) =>
      id === state.destination
        ? state
        : {
            destination: id,
            phase: id === overview ? 'leaving' : 'entering',
            request: state.request + 1,
          },
    );
  },
  jumpTo: (id) =>
    set((state) => {
      if (!Object.hasOwn(ISLAND_HUD, id)) return state;
      const phase = id === overview ? 'idle' : 'detail';
      if (id === state.focus && phase === state.phase) return state;
      return { focus: id, destination: id, phase, request: state.request + 1 };
    }),
  arrived: (request) =>
    set((state) =>
      state.request === request && isSpaceTransition(state.phase)
        ? { focus: state.destination, phase: state.destination === overview ? 'idle' : 'detail' }
        : state,
    ),
}));
