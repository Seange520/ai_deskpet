import { ENV_CLUES, EVIDENCE } from './env.mjs';
export const HYPOTHESES = [
  { id: 'h1', text: '负载启动的时刻可能有关。' },
  { id: 'h2', text: '不同灯的线路可能有关。' },
  { id: 'h3', text: '灯具本身的差异可能有关。' },
];
export const CATEGORY_LABELS = {
  ground_break: '通断',
  shared_ground: '链路电阻',
  drop_abnormal: '负载压降',
  terminal_rust: '拆检',
};
export function pinClue(board, clues, clueId, x, y) {
  if (
    !ENV_CLUES.some((c) => c.id === clueId) ||
    !clues[clueId]?.found ||
    ![x, y].every(Number.isFinite)
  )
    return board;
  return {
    ...board,
    pins: [
      ...board.pins.filter((p) => p.clueId !== clueId),
      { clueId, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) },
    ],
  };
}
export function addHypothesis(board, id) {
  const item = HYPOTHESES.find((h) => h.id === id);
  if (!item || board.hypotheses.some((h) => h.id === id) || board.hypotheses.length >= 3)
    return board;
  return { ...board, hypotheses: [...board.hypotheses, item] };
}
export function validateCase(board, measurements) {
  const obtained = EVIDENCE.filter((e) => measurements.includes(e));
  const missing = EVIDENCE.filter((e) => !obtained.includes(e));
  return { valid: missing.length === 0, missing, obtained };
}
