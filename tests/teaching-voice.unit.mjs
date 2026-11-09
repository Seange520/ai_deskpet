import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createNarrator,
  isVoiceSupported,
  pickVoice,
  splitNarration,
} from '../src/features/learning/teachingVoice.mjs';

function fakeWindow() {
  const spoken = [];
  const cancels = [];
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  const win = {
    SpeechSynthesisUtterance: Utterance,
    speechSynthesis: {
      getVoices: () => [
        { name: 'English', lang: 'en-US', localService: true },
        { name: '中文普通话', lang: 'zh-CN', localService: false },
        { name: '中文本地', lang: 'zh-CN', localService: true },
      ],
      speak: (utterance) => spoken.push(utterance),
      cancel: () => cancels.push(true),
    },
  };
  return { win, spoken, cancels };
}

test('splitNarration 按中英文句末标点分段并丢弃空段', () => {
  assert.deepEqual(splitNarration('第一句。第二句！Third? '), ['第一句。', '第二句！', 'Third?']);
  assert.deepEqual(splitNarration('一段没有标点的旁白'), ['一段没有标点的旁白']);
  assert.deepEqual(splitNarration(''), []);
  assert.deepEqual(splitNarration(null), []);
});

test('pickVoice 优先中文且优先本地语音', () => {
  const voices = [
    { name: 'English', lang: 'en-US', localService: true },
    { name: '中文普通话', lang: 'zh-CN', localService: false },
    { name: '中文本地', lang: 'zh-CN', localService: true },
  ];
  assert.equal(pickVoice(voices).name, '中文本地');
  assert.equal(pickVoice([{ name: 'English', lang: 'en-US' }]), null);
  assert.equal(pickVoice([]), null);
  assert.equal(pickVoice(undefined), null);
});

test('无 speechSynthesis 时安全降级', () => {
  assert.equal(isVoiceSupported(null), false);
  assert.equal(isVoiceSupported({}), false);
  const narrator = createNarrator(null);
  assert.equal(narrator.supported, false);
  assert.equal(narrator.speak(['你好']), false);
  narrator.stop();
});

test('createNarrator 按句朗读并回调进度、结束与停止', () => {
  const { win, spoken, cancels } = fakeWindow();
  const narrator = createNarrator(win);
  assert.equal(narrator.supported, true);
  const lines = [];
  let ended = false;
  assert.equal(
    narrator.speak(['第一句。', '第二句。'], {
      onLine: (line, total) => lines.push([line, total]),
      onEnd: () => {
        ended = true;
      },
    }),
    true,
  );
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, '第一句。');
  assert.equal(spoken[0].lang, 'zh-CN');
  assert.equal(spoken[0].voice.name, '中文本地');
  spoken[0].onend();
  assert.equal(spoken.length, 2);
  assert.equal(spoken[1].text, '第二句。');
  spoken[1].onend();
  assert.equal(ended, true);
  assert.deepEqual(lines, [
    [1, 2],
    [2, 2],
  ]);
  narrator.stop();
  assert.ok(cancels.length >= 1);
});

test('createNarrator 空文本不朗读、重复 speak 先取消上一段', () => {
  const { win, spoken, cancels } = fakeWindow();
  const narrator = createNarrator(win);
  assert.equal(narrator.speak([]), false);
  narrator.speak(['甲。', '乙。']);
  narrator.speak(['丙。']);
  assert.ok(cancels.length >= 1);
  assert.equal(spoken.at(-1).text, '丙。');
});
