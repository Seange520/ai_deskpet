import { create } from 'zustand';
import { ISLAND_HUD } from './spaceLayout.js';

export const INITIAL_ISLAND = 'dashboard';

export const useSpaceStore = create((set) => ({
  focus: INITIAL_ISLAND,
  destination: INITIAL_ISLAND,
  phase: 'idle',
  request: 0,
  travelTo: (id) =>
    set((state) => {
      if (!Object.hasOwn(ISLAND_HUD, id) || id === state.destination) return state;
      return { destination: id, phase: 'departing', request: state.request + 1 };
    }),
  jumpTo: (id) =>
    set((state) => {
      if (!Object.hasOwn(ISLAND_HUD, id) || (id === state.focus && state.phase === 'idle'))
        return state;
      return { focus: id, destination: id, phase: 'idle', request: state.request + 1 };
    }),
  depart: (request) =>
    set((state) =>
      state.request === request && state.phase === 'departing' ? { phase: 'traveling' } : state,
    ),
  arrived: (request) =>
    set((state) =>
      state.request === request && state.phase === 'traveling'
        ? { focus: state.destination, phase: 'arriving' }
        : state,
    ),
  settle: (request) =>
    set((state) =>
      state.request === request && state.phase === 'arriving' ? { phase: 'idle' } : state,
    ),
}));
