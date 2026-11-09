import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';

export const data = {
  id: 'expression-frame',
  title: '屏幕表情 · 一张脸的字节',
  instructions:
    '一块 128×64 的单色屏分成 8 页，每页 8 行。先算出整块显存有多大，再把眼睛放到正确的页，最后算每页每行占多少字节。',
  elements: ['buffer', 'page', 'row-bytes'],
  checks: [
    { id: 'buffer', type: 'numeric', task: 'buffer', expected: 1024, tolerance: 0 },
    { id: 'page', type: 'choice', task: 'page', expected: 'page-5' },
    { id: 'row-bytes', type: 'numeric', task: 'row-bytes', expected: 16, tolerance: 0 },
  ],
  evidenceTypes: ['numeric', 'choice'],
};

const PAGES = [0, 1, 2, 3, 4, 5, 6, 7];
const EYE = [
  '00111100',
  '01111110',
  '11100111',
  '11000011',
  '11000011',
  '11100111',
  '01111110',
  '00111100',
];

export default function ExpressionFrameSim({ onComplete } = {}) {
  const [buffer, setBuffer] = useState('');
  const [page, setPage] = useState('');
  const [rowBytes, setRowBytes] = useState('');
  const [log, setLog] = useState('先算：128×64 的单色屏，一共多少字节？');
  const { evidence, record } = useEvidence(data, onComplete);

  function toNumber(text) {
    const value = Number(text);
    return text.trim() === '' || !Number.isFinite(value) ? undefined : value;
  }

  function check() {
    const values = { buffer: toNumber(buffer), page: page || null, 'row-bytes': toNumber(rowBytes) };
    const result = record(values);
    const failed = result.checks.filter((c) => !c.passed).map((c) => c.id);
    if (result.passed) {
      setLog('帧缓冲对上了：1024 字节，眼睛在第 5 页，每行 16 字节。');
    } else if (failed.includes('buffer')) {
      setLog('显存不对。提示：宽 × 高 ÷ 8。128×64 是单色，每个像素 1 bit。');
    } else if (failed.includes('page')) {
      setLog('页不对。提示：y=40 时，40 ÷ 8 = 5，页号从 0 开始。');
    } else {
      setLog('每行字节不对。提示：一行 128 个像素，8 像素一个字节。');
    }
  }

  return (
    <SimFrame data={data} evidence={evidence}>
      <p>显存按页组织：每页包含 8 行像素。</p>
      <div className="sim-row" role="group" aria-label="屏幕页">
        {PAGES.map((p) => (
          <span
            key={p}
            className="sim-page"
            data-active={page === `page-${p}` ? 'true' : 'false'}
            aria-hidden="true"
          >
            {p}
          </span>
        ))}
      </div>
      <svg
        className="sim-glyph"
        viewBox="0 0 8 8"
        role="img"
        aria-label="8×8 眼睛图块"
        width="96"
        height="96"
      >
        {EYE.map((row, y) =>
          row
            .split('')
            .map((bit, x) =>
              bit === '1' ? (
                <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
              ) : null,
            ),
        )}
      </svg>
      <p>这块 8×8 的眼睛图块，正好占满一页的一行 8 字节。</p>
      <label>
        整块屏幕显存
        <input
          type="number"
          inputMode="numeric"
          value={buffer}
          onChange={(e) => setBuffer(e.target.value)}
          aria-label="显存字节数"
          placeholder="字节"
        />
      </label>
      <label>
        眼睛放在第几页（y = 40）
        <select value={page} onChange={(e) => setPage(e.target.value)} aria-label="表情页">
          <option value="">选择页号</option>
          {PAGES.map((p) => (
            <option key={p} value={`page-${p}`}>
              第 {p} 页
            </option>
          ))}
        </select>
      </label>
      <label>
        每页每行字节数
        <input
          type="number"
          inputMode="numeric"
          value={rowBytes}
          onChange={(e) => setRowBytes(e.target.value)}
          aria-label="每行字节数"
          placeholder="字节"
        />
      </label>
      <button type="button" onClick={check}>
        校验帧缓冲
      </button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
