let context;
const active = new Set();
let generation = 0;
let mutedFlag = false;
let ambient = null;

/** 全局静音标志；UI 切换时调用，供所有音效与氛围音遵守。 */
export function setMuted(value) {
  mutedFlag = !!value;
  if (mutedFlag) stopAmbient();
}

export function isMuted() {
  return mutedFlag;
}

function getContext() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  // 浏览器要求先有用户手势；同时保证「音效由交互创建」：首次交互前不创建上下文。
  const activation = typeof navigator !== 'undefined' ? navigator.userActivation : null;
  if (activation && !activation.hasBeenActive) return null;
  if (!context || context.state === 'closed') context = new Audio();
  return context;
}

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

const SFX = {
  click: [[1450, 0, 0.045]],
  ui: [[880, 0, 0.05]],
  measure: [[1250, 0, 0.06]],
  chime: [
    [523.25, 0, 0.14],
    [659.25, 0.08, 0.16],
    [783.99, 0.16, 0.26],
  ],
  confirm: [
    [440, 0, 0.06],
    [660, 0.05, 0.1],
  ],
  relay: [
    [180, 0, 0.03],
    [140, 0.05, 0.04],
  ],
  warning: [[110, 0, 0.42]],
  success: [
    [880, 0, 0.18],
    [1320, 0.09, 0.25],
  ],
  day: [[660, 0, 0.08]],
  night: [[440, 0, 0.1]],
  dizzy: [
    [740, 0, 0.08],
    [620, 0.06, 0.1],
  ],
};

// 用户事件创建共享 Context；自动氛围音仅复用已运行的 Context，失败时静默降级。
export async function playSound(kind, muted = false, { ambient: allowAmbient = false } = {}) {
  if (muted || mutedFlag) return;
  if (allowAmbient && (!context || context.state !== 'running')) return;
  const gentle = ['day', 'night', 'dizzy', 'ui', 'measure', 'confirm', 'chime'].includes(kind);
  const ticket = generation;
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    if (ticket !== generation || ctx.state !== 'running') return;
    const notes = SFX[kind] || SFX.click;
    for (const [hz, delay, duration] of notes) {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      const time = ctx.currentTime + delay;
      oscillator.type = kind === 'warning' ? 'sawtooth' : kind === 'relay' ? 'square' : 'sine';
      oscillator.frequency.setValueAtTime(hz, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(
        kind === 'warning' ? 0.035 : gentle ? 0.03 : 0.07,
        time + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
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

// ---- 氛围 BGM：程序化 Dm(add9) → Bbmaj7 → Gm7 慢和声垫 ----
const CHORDS = [
  [73.42, 110.0, 146.83, 174.61, 220.0],
  [58.27, 87.31, 116.54, 146.83, 174.61],
  [98.0, 146.83, 196.0, 233.08, 293.66],
];
const AMBIENT_VOICES = 5;

export function ambientRunning() {
  return ambient !== null;
}

export function stopAmbient() {
  if (!ambient) return;
  const { ctx, oscillators, master, timer } = ambient;
  ambient = null;
  window.clearInterval(timer);
  try {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value || 0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    for (const oscillator of oscillators) {
      try {
        oscillator.stop(now + 1.3);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => {
      for (const oscillator of oscillators) {
        try {
          oscillator.disconnect();
        } catch {
          /* optional */
        }
      }
      try {
        master.disconnect();
      } catch {
        /* optional */
      }
    }, 1500);
  } catch {
    /* optional */
  }
}

export async function startAmbient({ force = false } = {}) {
  if (mutedFlag && !force) return false;
  if (ambient) return true;
  try {
    const ctx = getContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running') return false;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.05, now + 2.4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.linearRampToValueAtTime(760, now + 8);
    filter.Q.value = 0.7;
    master.connect(filter);
    filter.connect(ctx.destination);
    const oscillators = [];
    for (let i = 0; i < AMBIENT_VOICES; i += 1) {
      const oscillator = ctx.createOscillator();
      const voice = ctx.createGain();
      oscillator.type = i < 2 ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(CHORDS[0][i], now);
      voice.gain.setValueAtTime(0.16 / (i + 1), now);
      oscillator.connect(voice);
      voice.connect(master);
      oscillator.start(now);
      oscillators.push(oscillator);
    }
    let chord = 0;
    const timer = window.setInterval(() => {
      chord = (chord + 1) % CHORDS.length;
      const t = ctx.currentTime;
      oscillators.forEach((oscillator, i) => {
        try {
          oscillator.frequency.setTargetAtTime(CHORDS[chord][i], t, 2.2);
        } catch {
          /* optional */
        }
      });
      try {
        filter.frequency.setTargetAtTime(520 + (chord % 2) * 220, t, 3);
      } catch {
        /* optional */
      }
    }, 12000);
    ambient = { ctx, oscillators, master, filter, timer };
    return true;
  } catch {
    /* 无音频环境时静默 */
    return false;
  }
}

// 开发期音频探针：仅供浏览器验收脚本读取，生产构建中不挂载。
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__checksumAudio = {
    ambientRunning,
    isMuted,
    contextState: () => (context ? context.state : 'none'),
  };
}
