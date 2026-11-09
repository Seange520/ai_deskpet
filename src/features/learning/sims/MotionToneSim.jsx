import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'motion-tone',
  title: '动作与声音 · 给桌宠一个节拍',
  instructions:
    '舵机角度先换算成脉宽，蜂鸣器音高再换算成频率；把点头和提示音配在同一拍上，然后预演一次。',
  elements: ['servo', 'buzzer', 'beat'],
  checks: [
    { id: 'pulse', type: 'numeric', task: 'pulse', expected: 1.5, tolerance: 0.05 },
    { id: 'pitch', type: 'numeric', task: 'pitch', expected: 440, tolerance: 5 },
    { id: 'duration', type: 'numeric', task: 'duration', expected: 120, tolerance: 10 },
  ],
  evidenceTypes: ['numeric'],
};

export default function MotionToneSim({ onComplete } = {}) {
  const [angle, setAngle] = useState('');
  const [pitch, setPitch] = useState('');
  const [duration, setDuration] = useState('');
  const [log, setLog] = useState('先定角度：90° 对应中位脉宽。');
  const { evidence, record } = useEvidence(data, onComplete);

  const angleValue = Number(angle);
  const validAngle = angle.trim() !== '' && Number.isFinite(angleValue) && angleValue >= 0 && angleValue <= 180;
  const pulse = validAngle ? 0.5 + (angleValue / 180) * 2 : null;

  function toNumber(text) {
    const value = Number(text);
    return text.trim() === '' || !Number.isFinite(value) ? undefined : value;
  }

  function preview() {
    const result = record({
      pulse: pulse === null ? undefined : Number(pulse.toFixed(3)),
      pitch: toNumber(pitch),
      duration: toNumber(duration),
    });
    const failed = result.checks.filter((c) => !c.passed).map((c) => c.id);
    if (result.passed) {
      setLog('舵机到 90°，脉宽 1.5 ms；提示音 440 Hz、每声 120 ms。动作和声音对上了节拍。');
    } else if (failed.includes('pulse')) {
      setLog('脉宽不对：0° 是 0.5 ms，180° 是 2.5 ms，中间线性换算。');
    } else if (failed.includes('pitch')) {
      setLog('音高不对：标准提示音用 440 Hz。');
    } else {
      setLog('节拍不对：三声提示每声 120 ms。');
    }
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <p>动作通道：舵机角度 → 脉宽；声音通道：频率 → 音高，时长 → 节拍。</p>
      <label>
        舵机角度（0–180°）
        <input
          type="number"
          inputMode="numeric"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          aria-label="舵机角度"
          placeholder="度"
        />
      </label>
      <output className="sim-reading" role="status">
        {pulse === null ? '等待角度' : `当前脉宽 ${pulse.toFixed(2)} ms`}
      </output>
      <label>
        提示音频率（Hz）
        <input
          type="number"
          inputMode="numeric"
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          aria-label="提示音频率"
          placeholder="Hz"
        />
      </label>
      <label>
        每声时长（ms）
        <input
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          aria-label="每声时长"
          placeholder="ms"
        />
      </label>
      <p>节拍：一声 → 停 → 二声 → 停 → 三声；三次点头跟三声提示同拍。</p>
      <button type="button" onClick={preview}>
        预演动作与声音
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
