import { inputGuard, outputGuard } from './guard.mjs';
import { retrieve } from './rag.mjs';
import { pruneMemory, dayKey } from './memory.mjs';
import { buildPrompt } from './prompt.mjs';
export const enabled = ({ dev = false, search = '', tier = 0 } = {}) => {
  const p = new URLSearchParams(search);
  return dev && p.get('aiTest') === '1' && p.get('ai') !== '0' && tier === 3;
};
export const responseDelay = (random = Math.random) =>
  300 + Math.floor(Math.max(0, Math.min(1, random())) * 300);
export const choosePersona = (text, profile = {}) =>
  /测量|读数|诊断|错误|为什么|校验/.test(text) || profile.failedDiagnoses >= 2
    ? 'verifier'
    : 'zero';
export function diagnosticEvent(state, event) {
  const next = { ...state };
  if (event.type === 'measurement') {
    next.key = event.key;
    next.repeats = state.key === event.key ? (state.repeats || 0) + 1 : 1;
  }
  if (event.type === 'wrongDiagnosis') next.errors = (state.errors || 0) + 1;
  const key =
    event.type === 'measurement' && next.repeats >= 3
      ? `measure:${event.key}`
      : event.type === 'wrongDiagnosis' && next.errors >= 2
        ? 'diagnosis'
        : null;
  return { state: next, key };
}
export function generateResponse({
  input,
  profile = {},
  memory,
  corpus = [],
  now = Date.now(),
  off = false,
  random,
}) {
  const m = pruneMemory(memory, now),
    usage = m.aiUsage;
  if (off) return { source: 'local-mock', status: 'off', text: '', delayMs: 0, memory: m };
  if (usage.rounds >= 60)
    return {
      source: 'local-mock',
      status: 'limited',
      text: '今日校验次数已用尽。下一步：回到已开放课节，明天再核对观察。',
      delayMs: 0,
      memory: m,
    };
  const guarded = inputGuard(input, profile),
    persona = choosePersona(guarded.text, profile);
  buildPrompt(profile, persona);
  const hits = guarded.category ? [] : retrieve(guarded.text, profile, corpus);
  const body =
    guarded.refusal ||
    (hits.length
      ? `${hits[0].text} 下一步：打开课节 ${hits[0].kpId}，核对自己的观察。`
      : '档案缺失。下一步：说说你看到的变化，或比较两次读数；选择仍由你作出。');
  const checked = outputGuard(
    (persona === 'verifier' ? '校验体 · 1. ' : '零 · ') + body,
    profile,
    corpus,
    hits.map((h) => h.id),
  );
  return {
    source: 'local-mock',
    status: guarded.category || (checked.blocked ? 'spoiler' : 'ready'),
    persona,
    ...checked,
    delayMs: responseDelay(random),
    input: guarded.text,
    memory: {
      ...m,
      aiUsage: {
        day: dayKey(now),
        rounds: usage.rounds + 1,
        characters: usage.characters + [...guarded.text].length + [...checked.text].length,
      },
    },
  };
}
