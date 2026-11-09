export const POINTS = Object.freeze([
  { id: 'switch', label: '配电闸', position: [-7, 1.1, 1.1], short: '00' },
  { id: 'meter', label: '表箱', position: [-3, 1.1, 1.1], short: '01' },
  { id: 'joint', label: '接头', position: [2, 1.1, 1.1], short: '02' },
  { id: 'lamp', label: '灯座', position: [7, 1.1, 1.1], short: '03' },
]);

export const ORDERS = Object.freeze([
  {
    id: 'A',
    title: '熄灯的晚餐',
    symptom: '整段街灯不亮，汤铺还在等第一位客人。',
    target: 'meter',
    fault: '保险熔断',
    repair: '更换匹配保险',
    before: 'OL · 保险不通',
    after: '0.2 Ω · 回路恢复',
    live: false,
    budgetSeconds: 300,
    feedback: '贺菲：灯亮了，今晚的热汤还来得及。',
  },
  {
    id: 'B',
    title: '发烫的接头',
    symptom: '灯光忽明忽暗，接头处有异常温升。',
    target: 'joint',
    fault: '压接不良',
    repair: '重新压接并恢复绝缘',
    before: '4.8 Ω · 接触电阻异常',
    after: '0.1 Ω · 接触稳定',
    live: false,
    budgetSeconds: 300,
    feedback: '贺菲：这一次，灯光没有再闪。',
  },
  {
    id: 'C',
    title: '不能熄灭的灯',
    symptom: '应急照明需保持供电，灯座接触异常。仅限 24V SELV 仿真。',
    target: 'lamp',
    fault: '灯座接触异常',
    repair: '执行受保护的仿真更换',
    before: '24.0 V · 保持供电',
    after: '24.0 V / 0.4 A · 负载稳定',
    live: true,
    budgetSeconds: 300,
    feedback: '贺菲：应急灯一直亮着，你也平安回来了。',
  },
]);

export const STEP_LABELS = Object.freeze({
  idle: '待接单',
  briefed: '任务简报',
  powered: '观察与隔离',
  isolated: '定位故障',
  located: '准备抢修',
  repaired: '等待复核',
  verified: '等待送电验证',
  scored: '委托完成',
  violated: '安全违规',
  retry: '重新检查',
});

export function objective(state) {
  const order = ORDERS[state.orderIndex];
  return {
    idle: '选择一条轨道，接下这一单。',
    briefed: order.symptom,
    powered: order.live ? '到配电闸验电、记录，然后设置隔离护罩。' : '前往配电闸，断电挂牌。',
    isolated: `检查表箱、接头与灯座，找出${order.fault}。`,
    located: `确认故障后，${order.repair}。`,
    repaired: '在故障点复核修复结果；提前合闸会复燃。',
    verified: order.live ? '返回配电闸，执行负载验证。' : '返回配电闸，合闸验证。',
    scored: order.feedback,
    violated: '操作已停止。阅读原因后重试。',
    retry: '重新确认供电状态，再开始隔离。',
  }[state.step];
}
