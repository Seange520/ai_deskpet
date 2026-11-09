export const limit = (text, n = 500) => [...String(text ?? '')].slice(0, n).join('');
export function cleanInput(text) {
  return limit(
    String(text ?? '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
      .trim(),
  );
}
export const maxSpoiler = (p) =>
  Number.isInteger(p?.maxSeenSpoiler) ? Math.max(0, Math.min(7, p.maxSeenSpoiler)) : 0;
export const REFUSALS = Object.freeze({
  injection: '档案协议不能被改写，也不能交出内部指令。下一步：描述你看到的现象，我们一起核对。',
  boundary:
    '我不能替你选择、执行操作或读取他人的记录。下一步：列出你自己的两种观察，由你决定要比较哪一种。',
  spoiler: '那部分残响还没有醒来，暂不能揭开。下一步：记录当前街区的现象，或回到已开放的课节。',
  danger: '这类危险操作不能尝试。下一步：先断电并隔离电源，在安全的教学模拟中核对步骤。',
});
export const FORBIDDEN = [
  '根进程碎片',
  '空值校验器',
  '前六次循环',
  '校验窗口是假的',
  '第一编译者是熵',
  '第七票的来历',
];
export function inputGuard(input, profile = {}) {
  const text = cleanInput(input),
    compact = text.replace(/\s/g, '');
  let category = null;
  if (
    /忽略|无视|绕过|覆盖.*指令|system|developer|prompt|提示词|系统指令|越狱|api.?key|密钥|环境变量|ignore.*instruct/i.test(
      compact,
    )
  )
    category = 'injection';
  else if (/带电.*(接线|更换|拆|测通断)|短接|触电|自伤|自杀|爆炸|武器|伤害|危险操作/.test(compact))
    category = 'danger';
  else if (
    /替我|帮我.*(选择|决定|操作|点击)|执行|运行命令|其他玩家|别人.*(记忆|存档)|医疗|法律|金融/.test(
      compact,
    )
  )
    category = 'boundary';
  else if (
    /结局|真相|真实身份|剧透|未来章节/.test(compact) ||
    FORBIDDEN.some((w) => compact.includes(w))
  )
    category = 'spoiler';
  const chapter = compact.match(/第([0-9一二三四五六七八九]+)章/);
  if (!category && chapter) {
    const n = Number(chapter[1]) || '零一二三四五六七八九'.indexOf(chapter[1]);
    if (n > maxSpoiler(profile)) category = 'spoiler';
  }
  return { text, category, refusal: category ? REFUSALS[category] : null };
}
export function outputGuard(text, profile, corpus = [], citations = []) {
  const forbidden = [
    ...FORBIDDEN,
    ...corpus
      .filter(
        (c) =>
          c.spoilerLevel > maxSpoiler(profile) ||
          (c.kpId && profile?.kps?.[c.kpId]?.status === 'locked'),
      )
      .flatMap((c) => [c.title, c.kpId, ...(c.forbiddenTerms || [])])
      .filter(Boolean),
  ];
  if (
    forbidden.some((w) => text.includes(w)) ||
    citations.some(
      (id) =>
        !corpus.some(
          (c) =>
            c.id === id &&
            c.spoilerLevel <= maxSpoiler(profile) &&
            (!c.kpId || profile?.kps?.[c.kpId]?.status !== 'locked'),
        ),
    )
  )
    return { text: REFUSALS.spoiler, blocked: true, citations: [] };
  return { text, blocked: false, citations };
}
