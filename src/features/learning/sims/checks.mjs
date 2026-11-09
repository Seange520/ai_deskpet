// Data comparison only. task is a literal own-property key, never an expression.
export function evaluate(state = {}, checks = []) {
  const prior = Array.isArray(state.evidence) ? state.evidence : [];
  const evidence = [];
  for (const item of prior) {
    if (!evidence.some((e) => e.id === item.id && e.type === item.type))
      evidence.push({ ...item, attempts: [...item.attempts] });
  }
  const results = checks.map((check) => {
    const value = Object.hasOwn(state.values || {}, check.task)
      ? state.values[check.task]
      : undefined;
    let passed = false;
    if (check.type === 'numeric') {
      const t = check.tolerance ?? 0;
      passed =
        Number.isFinite(value) &&
        Number.isFinite(check.expected) &&
        Number.isFinite(t) &&
        t >= 0 &&
        Math.abs(value - check.expected) <=
          t + Number.EPSILON * Math.max(1, Math.abs(check.expected)) * 4;
    } else if (check.type === 'choice') {
      passed = ['string', 'number', 'boolean'].includes(typeof value) && value === check.expected;
    } else if (check.type === 'sequence') {
      passed =
        Array.isArray(value) &&
        Array.isArray(check.expected) &&
        value.length === check.expected.length &&
        value.every(
          (v, i) => ['string', 'number', 'boolean'].includes(typeof v) && v === check.expected[i],
        );
    }
    let entry = evidence.find((e) => e.id === check.id && e.type === check.type);
    if (!entry) {
      entry = { type: check.type, id: check.id, attempts: [] };
      evidence.push(entry);
    }
    entry.attempts.push({ value: Array.isArray(value) ? [...value] : (value ?? null), passed });
    return { id: check.id, type: check.type, passed };
  });
  return {
    passed: results.length > 0 && results.every((r) => r.passed),
    checks: results,
    evidence,
  };
}
