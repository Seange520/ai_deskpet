let context;
const active = new Set();
let generation = 0;
export function silence() {
  generation++;
  for (const gain of active) {
    try {
      gain.gain.cancelScheduledValues(0);
      gain.gain.value = 0;
    } catch {
      /* optional audio */
    }
  }
}
// 用户事件创建共享 Context；自动氛围音仅复用已运行的 Context，失败时静默降级。
export async function playSound(kind, muted = false, { ambient = false } = {}) {
  if (muted || (ambient && (!context || context.state !== 'running'))) return;
  const gentle = ['day', 'night', 'dizzy'].includes(kind);
  const ticket = generation;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!context || context.state === 'closed') context = new Audio();
    if (context.state === 'suspended') await context.resume();
    if (ticket !== generation || context.state !== 'running') return;
    const notes =
      kind === 'warning'
        ? [[110, 0, 0.42]]
        : kind === 'success'
          ? [
              [880, 0, 0.18],
              [1320, 0.09, 0.25],
            ]
          : kind === 'day'
            ? [[660, 0, 0.08]]
            : kind === 'night'
              ? [[440, 0, 0.1]]
              : kind === 'dizzy'
                ? [
                    [740, 0, 0.08],
                    [620, 0.06, 0.1],
                  ]
                : [[1450, 0, 0.045]];
    for (const [hz, delay, duration] of notes) {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      const time = context.currentTime + delay;
      oscillator.type = kind === 'warning' ? 'sawtooth' : 'sine';
      oscillator.frequency.setValueAtTime(hz, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(
        kind === 'warning' ? 0.035 : gentle ? 0.012 : 0.07,
        time + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      active.add(gain);
      oscillator.onended = () => {
        active.delete(gain);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(time);
      oscillator.stop(time + duration + 0.01);
    }
  } catch {
    /* 创建、恢复或播放失败时静默降级。 */
  }
}
