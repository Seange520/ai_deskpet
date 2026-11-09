import { create } from 'zustand';
import { createMission, transition } from './mission.mjs';
import { ORDERS, POINTS } from './missionData.mjs';
import { playSound } from '../../lib/sounds';
import { markMissionCompleted, nextOrderIndex, readMissionProgress } from './missionProgress.mjs';

const initialProgress = readMissionProgress();

export const useMission = create((set, get) => ({
  mission: createMission({ orderIndex: nextOrderIndex(initialProgress) }),
  progress: initialProgress,
  destination: null,
  ready: false,
  error: '',
  metrics: null,
  dispatch: (event) => {
    const previous = get().mission;
    const mission = transition(previous, event, Date.now());
    set({ mission });
    if (mission.step === 'scored' && previous.step !== 'scored') {
      set({ progress: markMissionCompleted(ORDERS[mission.orderIndex].id) });
    }
    if (mission.step !== previous.step)
      playSound(
        mission.step === 'violated' ? 'warning' : mission.step === 'scored' ? 'success' : 'relay',
      );
    else if (event.type === 'measure') playSound('measure');
  },
  walkTo: (id) => {
    const point = POINTS.find((p) => p.id === id);
    if (point) set({ destination: id });
  },
}));
