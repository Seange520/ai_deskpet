export const COMMANDS = {
  move: ['forward', 'backward', 'stop'],
  light: ['on', 'off'],
  play: ['success'],
};
export const DEFAULT_PROGRAM = [
  '// 你可以尝试修改括号里的参数',
  '// move: forward / backward / stop',
  '// light: on / off，play: success',
  'move("forward");',
  'light("on");',
  'play("success");',
].join('\n');

// 有限指令语言，不是通用 JS 沙盒。原始输入不直接传给 Function。
export function parseProgram(source) {
  if (typeof source !== 'string' || source.length > 8192) {
    throw new Error('代码最多 8192 个字符，请拆成更小的练习。');
  }
  const instructions = [];
  const trivia = /(?:\s|;|\/\/[^\n]*|\/\*[\s\S]*?\*\/)+/y;
  const call = /(move|light|play)\s*\(\s*(["'])([a-z]+)\2\s*\)/y;
  let cursor = 0;
  const fail = (message) => {
    const prefix = source.slice(0, cursor).split('\n');
    throw new Error(
      '第 ' + prefix.length + ' 行，第 ' + (prefix.at(-1).length + 1) + ' 列：' + message,
    );
  };
  while (cursor < source.length) {
    trivia.lastIndex = cursor;
    const gap = trivia.exec(source)?.[0] || '';
    cursor += gap.length;
    if (cursor === source.length) break;
    if (instructions.length && !/[;\r\n]/.test(gap)) fail('指令之间请使用分号或换行。');
    call.lastIndex = cursor;
    const match = call.exec(source);
    if (!match) fail('请使用 move("forward")、light("on") 或 play("success") 这样的指令。');
    const [, command, , value] = match;
    if (!COMMANDS[command].includes(value)) {
      fail(command + ' 不支持参数 "' + value + '"，可选：' + COMMANDS[command].join(' / ') + '。');
    }
    instructions.push({ command, value });
    if (instructions.length > 32) fail('一次最多运行 32 条指令。');
    cursor = call.lastIndex;
  }
  if (!instructions.length) throw new Error('还没有可运行的指令，请先写一条试试。');
  return instructions;
}

export function executeProgram(source, actions) {
  const instructions = parseProgram(source);
  const generated = instructions
    .map(({ command, value }) => command + '(' + JSON.stringify(value) + ');')
    .join('\n');
  // 只执行规范化的白名单指令，不支持循环、表达式或浏览器 API。
  const run = new Function('move', 'light', 'play', '"use strict";\n' + generated);
  run(actions.move, actions.light, actions.play);
  return instructions;
}
