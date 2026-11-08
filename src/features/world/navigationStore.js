import { create } from 'zustand';
import { ANCHORS } from './poi';
export const DESTINATIONS = [
  { id: 'hub', label: '中央枢纽', position: [0, 0, 0], color: '#f3d49c' },
  ...ANCHORS,
];
export const landingFor = (id) => {
  const a = DESTINATIONS.find((a) => a.id === id);
  return a ? [a.position[0], 0.7, a.position[2] + (id === 'hub' ? 1.6 : -2.6)] : null;
};
export const useWorldMap = create((set, get) => ({
  open: false,
  active: false,
  request: 0,
  destination: 'hub',
  phase: 'idle',
  position: [0, 0.673, 1.6],
  yaw: 0,
  toggle: () => {
    if (!get().active) set((s) => ({ open: !s.open }));
  },
  close: () => set({ open: false }),
  travel: (id) => {
    if (get().active || !landingFor(id)) return;
    set((s) => ({
      open: false,
      active: true,
      destination: id,
      request: s.request + 1,
      phase: 'charge',
    }));
  },
  finish: () => set({ active: false, phase: 'idle' }),
  reset: () => set({ open: false, active: false, phase: 'idle' }),
}));
