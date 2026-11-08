export const freshForge = () => ({
  powered: true,
  measured: false,
  inspected: false,
  repaired: false,
  elapsed: 0,
  inBand: 0,
  temperature: 20,
  verified: false,
  message: '',
});
export function actForge(state, action) {
  const s = { ...state };
  if (action === 'cut')
    return {
      ...s,
      powered: false,
      elapsed: 0,
      inBand: 0,
      verified: false,
      temperature: 20,
      message: '电源已断开。',
    };
  if (action === 'power') return { ...s, powered: true, elapsed: 0, inBand: 0, verified: false };
  if (s.powered) return { ...s, message: '仪表显示支路仍有电压。' };
  if (action === 'measure')
    return {
      ...s,
      measured: true,
      message: s.repaired ? '通断：有声 · 12.0Ω' : '通断：无声 · ∞Ω；标称约12Ω',
    };
  if (action === 'inspect')
    return { ...s, inspected: true, message: '端子表面有暗色氧化，压接处松动。' };
  if (['terminal', 'crimp'].includes(action) && s.measured && s.inspected)
    return { ...s, repaired: true, message: '接点重新贴合，离线电阻12.0Ω。' };
  return { ...s, message: '读数没有变化。' };
}
export function advanceForge(s, dt) {
  if (!s.powered || s.verified || !Number.isFinite(dt) || dt <= 0) return s;
  const elapsed = Math.min(7, s.elapsed + dt),
    temperature = s.repaired ? Math.min(200, 20 + 60 * elapsed) : 20;
  // Exact intersection of this interval with the temperature band, independent of frame size.
  const inBand = s.repaired ? Math.max(0, elapsed - Math.max(s.elapsed, 160 / 60)) + s.inBand : 0;
  return {
    ...s,
    elapsed,
    temperature,
    inBand,
    verified: elapsed >= 7 && inBand >= 3,
    message: elapsed >= 7 && !s.repaired ? '曲线停在室温。可断电后重试。' : s.message,
  };
}
export const SCRAPS = [
  { id: 'copper', name: '铜屑堆', length: 1, resistance: 0.8 },
  { id: 'iron', name: '铁框堆', length: 2, resistance: 0.2 },
  { id: 'ceramic', name: '瓷片堆', length: 2, resistance: Infinity },
];
export const isTorch = (s) =>
  !!s && Math.abs(s.length - 2) < 0.1 && Math.abs(s.resistance - 0.2) < 0.02;
export function wireLamp(s, voltage = 24) {
  if (s.powered) return { ...s, message: '支路仍有电压，接线未发生。' };
  if (voltage !== 24) return { ...s, message: '灯座与支路额定值不一致。' };
  return { ...s, wired: true, voltage: 24, message: '24V独立安全支路已接好。' };
}
