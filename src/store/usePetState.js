import { create } from 'zustand';
import { useHardwareTelemetry } from './useHardwareTelemetry.js';

const sleepThreshold = 20;
const soundJump = 25;
const reactionMs = 450;
const idle = 'idle';
const sleeping = 'sleeping';
const reacting = 'reacting';

export const usePetState = create(() => ({
  status: useHardwareTelemetry.getState().lightLevel < sleepThreshold ? sleeping : idle,
}));

let timeout;
const unsubscribe = useHardwareTelemetry.subscribe((sample, previous) => {
  const { status } = usePetState.getState();
  if (sample.lightLevel < sleepThreshold) {
    clearTimeout(timeout);
    if (status !== sleeping) usePetState.setState({ status: sleeping });
  } else if (status === sleeping || sample.isConnected !== previous.isConnected) {
    clearTimeout(timeout);
    if (status !== idle) usePetState.setState({ status: idle });
  } else if (status === idle && Math.abs(sample.soundLevel - previous.soundLevel) >= soundJump) {
    timeout = setTimeout(() => usePetState.setState({ status: idle }), reactionMs);
    usePetState.setState({ status: reacting });
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribe();
    clearTimeout(timeout);
  });
}
