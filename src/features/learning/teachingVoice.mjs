// 课节旁白朗读：纯逻辑可测，浏览器 API 通过依赖注入。
// 不做自动播放；由学习者手动触发，随时可停。

export function splitNarration(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  return text
    .split(/(?<=[。！？!?；;])/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function pickVoice(voices = []) {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const zh = voices.filter((voice) => {
    const lang = String(voice.lang || '').toLowerCase();
    const name = String(voice.name || '');
    return lang.startsWith('zh') || lang.startsWith('cmn') || /中文|普通话|Chinese/i.test(name);
  });
  return zh.find((voice) => voice.localService) || zh[0] || null;
}

export function isVoiceSupported(win = typeof window !== 'undefined' ? window : null) {
  return Boolean(win && win.speechSynthesis && typeof win.SpeechSynthesisUtterance === 'function');
}

export function createNarrator(win = typeof window !== 'undefined' ? window : null) {
  if (!isVoiceSupported(win)) {
    return { supported: false, speak: () => false, stop: () => {} };
  }
  const synth = win.speechSynthesis;
  const Utterance = win.SpeechSynthesisUtterance;
  let current = null;

  function stop() {
    current = null;
    try {
      synth.cancel();
    } catch {
      /* 部分浏览器在未播放时 cancel 会抛错，忽略即可 */
    }
  }

  function speak(lines, options = {}) {
    const list = (Array.isArray(lines) ? lines : splitNarration(lines)).filter(Boolean);
    if (list.length === 0) return false;
    stop();
    const voice = options.voice || pickVoice(synth.getVoices?.() || []);
    let index = 0;
    const next = () => {
      if (index >= list.length) {
        current = null;
        options.onEnd?.();
        return;
      }
      const line = list[index];
      const utterance = new Utterance(line);
      utterance.lang = (voice && voice.lang) || 'zh-CN';
      utterance.rate = options.rate ?? 0.98;
      utterance.pitch = options.pitch ?? 0.92;
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        index += 1;
        next();
      };
      utterance.onerror = () => {
        current = null;
        options.onEnd?.();
      };
      current = utterance;
      options.onLine?.(index + 1, list.length);
      synth.speak(utterance);
    };
    next();
    return true;
  }

  return { supported: true, speak, stop, get speaking() { return Boolean(current); } };
}
