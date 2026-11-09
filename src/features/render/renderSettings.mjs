export function readRenderSettings(search) {
  const params = new URLSearchParams(search);
  const value = Number(params.get('time') ?? 10);
  return {
    hour: Number.isFinite(value) ? Math.max(0, Math.min(24, value)) : 10,
    outline: params.get('outline') !== '0',
    dof: params.get('dof') === '1',
  };
}

export function daylightAt(hour) {
  return Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2));
}
