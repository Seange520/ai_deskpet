export function codecheck(spec, answer) {
  const option = spec?.options?.find((o) => o.id === answer);
  return {
    passed: option?.correct === true,
    score: option?.correct === true ? 1 : 0,
    feedback: option?.why || '请选择结构化答案。',
  };
}

const supplements = {
  'K3-04': [
    '循环 3 次：输出高；等待 500ms；输出低；等待 500ms',
    '循环无限次：只输出高',
    '循环 3 次：输出高；等待 5000ms；输出低',
  ],
  'K3-05': [
    '每 250ms 用时间戳切换高低电平，主循环继续处理输入',
    '每 2s 切换高低电平',
    '亮 250ms，灭 500ms',
  ],
  'K3-06': [
    '串口 115200；循环输出 state=1',
    '串口 9600；输出 sate=1',
    '只在初始化输出 sate=1',
  ],
  'K4-05': [
    '绘制 (10,20,"24.0")；设置变化时写入 3 字节；读回核对；重启复查',
    '每帧擦写 EEPROM',
    '绘制到屏幕外；写入后直接结束',
  ],
  'K5-01': [
    '扫描目标 SSID；匹配认证；等待 DHCP；读取连接状态与 RSSI；失败后重试',
    '认证后直接宣告联网成功',
    '跳过 SSID 扫描与 IP 获取',
  ],
  'K5-02': [
    '构造 GET；检查状态码；解析 JSON 字段 lamp 与 temp；错误路径验证 404',
    '把 404 当成请求成功',
    '用字符串搜索代替 JSON 解析',
  ],
};
export function codeSpec(lesson) {
  return (
    lesson.segments[2].code ||
    (supplements[lesson.kp.id]
      ? {
          answerType: 'structured-choice',
          options: supplements[lesson.kp.id].map((code, i) => ({
            id: 'structure-' + i,
            code,
            correct: i === 0,
            why:
              i === 0
                ? '结构与任务要求一致。'
                : '请核对任务的顺序、参数和输出。',
          })),
        }
      : null)
  );
}
