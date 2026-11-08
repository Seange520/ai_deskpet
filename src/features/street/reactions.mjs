// Canonical phenomenon/condition catalogue. Inactive rows are authoring data only.
export const REACTIONS = Object.freeze(
  [
    {
      id: 'overvoltage',
      name: '过压击穿',
      condition: '电压超过元件耐受窗口，受潮会降低绝缘裕量。',
      phenomenon: '接口异常、复位或绝缘击穿。',
      active: true,
    },
    {
      id: 'overcurrent',
      name: '过流熔断',
      condition: '电流超过额定并持续积累热应力。',
      phenomenon: '保险丝断开，支路失去供电。',
      active: true,
    },
    {
      id: 'short',
      name: '短路跳闸',
      condition: '低阻跨接使电流持续超出支路保护窗口。',
      phenomenon: '保护切断，支路暂时停电。',
      active: true,
    },
    {
      id: 'back-emf',
      name: '反峰击穿',
      condition: '感性负载被快速分断，储能没有受控的释放路径。',
      phenomenon: '开断瞬间出现尖峰，邻近接口可能复位。',
      active: true,
    },
    {
      id: 'ground-loop',
      name: '地环噪声',
      condition: '多个接地点形成回路并耦合模拟信号。',
      phenomenon: '读数叠加周期性噪声。',
      active: false,
    },
    {
      id: 'saturation',
      name: '容性饱和',
      condition: '电容充电接近稳态，或磁芯进入饱和区域。',
      phenomenon: '电流变化异常，保护负担增加。',
      active: false,
    },
    {
      id: 'thermal',
      name: '热跑失控',
      condition: '温升与电流构成持续增强的正反馈。',
      phenomenon: '温度与损耗继续上升。',
      active: false,
    },
    {
      id: 'avalanche',
      name: '雪崩击穿',
      condition: '反向电压达到击穿窗口，且电流被限制。',
      phenomenon: '端电压出现钳位平台。',
      active: false,
    },
    {
      id: 'latch-up',
      name: '闩锁死机',
      condition: 'CMOS 接口的过压或注入电流超出约束。',
      phenomenon: '器件异常耗流或失去响应。',
      active: false,
    },
    {
      id: 'drift',
      name: '信号漂移',
      condition: '温度或时间变化使参考与读数逐渐偏离。',
      phenomenon: '相同输入得到不同读数。',
      active: false,
    },
    {
      id: 'oscillation',
      name: '自激振荡',
      condition: '反馈的相位与增益满足持续振荡条件。',
      phenomenon: '没有外部周期输入仍出现持续波动。',
      active: false,
    },
    {
      id: 'creepage',
      name: '表面爬电',
      condition: '高电场与污染或潮湿共同作用于表面绝缘。',
      phenomenon: '沿表面出现漏电或局部放电。',
      active: false,
    },
  ].map(Object.freeze),
);
export function detectReactions(event, lessonPassed) {
  if (!lessonPassed) return [];
  const active = [];
  if (event.inductiveOpening && !event.clamped && event.peak > event.breakdown)
    active.push('back-emf');
  if (event.peak > event.breakdown) active.push('overvoltage');
  if (event.shortCircuit) active.push('short');
  if (event.meterFuseTripped) active.push('overcurrent');
  return active.filter((id) => REACTIONS.some((r) => r.id === id && r.active));
}
