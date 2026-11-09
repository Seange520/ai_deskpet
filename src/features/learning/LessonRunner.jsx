import { useEffect, useRef, useState } from 'react';
import ModeMeterSim from './ModeMeterSim';
import { codecheck, codeSpec } from './codecheck.mjs';
import { lessonResult, measurementPass } from './learning.mjs';
const titles = {
  hook: '现象与问题',
  explain: '原理可视化',
  practice: '最小实践',
  verify: '测量验证',
  transfer: '迁移挑战',
  recap: '复盘卡',
};
function Choice({ options, onAnswer, label }) {
  const [selected, setSelected] = useState(null);
  return (
    <fieldset>
      <legend>{label}</legend>
      {options.map((o) => (
        <label key={o.id} className="teaching-choice">
          <input
            type="radio"
            name={label}
            value={o.id}
            checked={selected === o.id}
            onChange={() => {
              setSelected(o.id);
              onAnswer(o);
            }}
          />
          {o.text || o.code}
        </label>
      ))}
      {selected && (
        <p role="status">
          {options.find((o) => o.id === selected)?.feedback ||
            options.find((o) => o.id === selected)?.why}
        </p>
      )}
    </fieldset>
  );
}
export default function LessonRunner({ lesson, onFinish, onLeave }) {
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [scores, setScores] = useState({}),
    [evidence, setEvidence] = useState({}),
    [order, setOrder] = useState({}),
    [extra, setExtra] = useState({}),
    [self, setSelf] = useState(''),
    [done, setDone] = useState(false);
  const runId = useRef(crypto.randomUUID()),
    heading = useRef(null),
    seg = lesson.segments[index],
    practice = lesson.segments[2],
    spec = codeSpec(lesson);
  useEffect(() => {
    heading.current?.focus();
    setElapsed(0);
  }, [index]);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [paused, index]);
  const record = (key, score, records) => {
    setScores((v) => ({ ...v, [key]: score }));
    setEvidence((v) => ({ ...v, [key]: records }));
  };
  const numeric = lesson.segments[3].checks.filter(
    (c) =>
      typeof c.expected === 'number' ||
      (c.type === 'measurement' && typeof c.expected === 'string'),
  );
  const other = lesson.segments[3].checks.filter((c) => !numeric.includes(c));
  const ready =
    index === 0
      ? scores.hook !== undefined
      : index === 2
        ? scores.practice !== undefined
        : index === 3
          ? scores.verify !== undefined &&
            other.every((c) => extra[c.id] !== undefined)
          : index === 4
            ? scores.transfer !== undefined
            : index === 5
              ? self.trim().length > 0
              : true;
  return (
    <section data-lesson={lesson.kp.id} data-segment={seg.type}>
      <div className="teaching-run-head">
        <button onClick={onLeave}>返回课节列表</button>
        <button aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
          {paused ? '继续课节' : '暂停课节'}
        </button>
      </div>
      <h3 ref={heading} tabIndex={-1}>
        {lesson.kp.name} · {titles[seg.type]}
      </h3>
      <progress aria-label="课节六段进度" max="6" value={index + 1} />
      <p>
        {index + 1} / 6 · 建议 {seg.durationSec} 秒 ·{' '}
        {elapsed >= seg.durationSec ? '可以继续' : elapsed + ' 秒'}
      </p>
      <fieldset disabled={paused || done} className="teaching-segment">
        <legend>{titles[seg.type]}</legend>
        {seg.narration && <p>{seg.narration}</p>}
        {seg.type === 'hook' && (
          <Choice
            label="先做哪个判断？"
            options={seg.choices}
            onAnswer={(o) =>
              record('hook', o.correct ? 1 : 0, [
                {
                  type: 'quiz',
                  score: o.correct ? 1 : 0,
                  context: { answer: o.id },
                },
              ])
            }
          />
        )}
        {seg.type === 'explain' && (
          <div className="teaching-media">
            {seg.media.map((m) =>
              m.status === 'ready' && /\.svg$/i.test(m.src) ? (
                <figure key={m.src} className="teaching-media-asset">
                  <img src={'/' + m.src} alt={m.alt} loading="lazy" />
                  <figcaption>
                    {m.alt}
                    <small>
                      原创资产 ·{' '}
                      {m.kind === 'animation'
                        ? '内嵌动画（静音可用，含字幕文本）'
                        : '教学示意图'}
                    </small>
                  </figcaption>
                </figure>
              ) : (
                <figure key={m.src}>
                  <svg viewBox="0 0 240 64" aria-hidden="true">
                    <path
                      d="M15 32H75L90 15 110 49 130 15 150 49 165 32H225"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <circle cx="15" cy="32" r="5" />
                    <circle cx="225" cy="32" r="5" />
                  </svg>
                  <figcaption>
                    {m.alt}
                    <small>媒体规划说明 · 当前使用文字与内联示意</small>
                  </figcaption>
                </figure>
              ),
            )}
          </div>
        )}
        {seg.type === 'practice' && (
          <>
            <p>{seg.task}</p>
            <p>按课节步骤排列操作计划，再进行测量。这里只做 DOM 教学演练。</p>
            {seg.steps.map((step, i) => (
              <label key={i}>
                第 {i + 1} 步
                <select
                  aria-label={'实践步骤 ' + (i + 1)}
                  value={order[i] ?? ''}
                  onChange={(e) => {
                    setOrder((v) => ({ ...v, [i]: e.target.value }));
                    setScores((v) => ({ ...v, practice: undefined }));
                  }}
                >
                  <option value="">选择操作</option>
                  {[...seg.steps].reverse().map((s, j) => (
                    <option key={j} value={String(seg.steps.length - 1 - j)}>
                      {s.action} · {s.target}
                      {s.hint ? ' · ' + s.hint : ''}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {spec ? (
              <Choice
                label="选择程序结构"
                options={spec.options}
                onAnswer={(o) => {
                  const result = codecheck(spec, o.id);
                  setScores((v) => ({ ...v, practice: undefined }));
                  record('code', result.score, [
                    {
                      type: 'code',
                      score: result.score,
                      context: { answer: o.id },
                    },
                  ]);
                }}
              />
            ) : null}
            <button
              data-practice-submit
              onClick={() => {
                const score =
                  seg.steps.filter((_, i) => order[i] === String(i)).length /
                  seg.steps.length;
                const final = spec ? Math.min(score, scores.code || 0) : score;
                record('practice', final, [
                  { type: 'sim-task', score: final, context: { order } },
                  ...(evidence.code || []),
                ]);
              }}
            >
              校验操作计划
            </button>
            {scores.practice !== undefined && (
              <p role="status">
                {scores.practice === 1
                  ? '操作计划通过。'
                  : '步骤还有偏差，可调整后重试。'}
              </p>
            )}
          </>
        )}
        {seg.type === 'verify' && (
          <>
            <p>{seg.safety}</p>
            <ModeMeterSim
              checks={numeric}
              onComplete={(s, e) => record('verify', s, e)}
            />
            {other.map((c) => (
              <label key={c.id}>
                {c.ask || c.probe || c.id}
                <input
                  aria-label={'判断 ' + c.id}
                  placeholder="输入判断；序列以逗号分隔"
                  value={extra[c.id] ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExtra((v) => ({ ...v, [c.id]: value }));
                    const expected = Array.isArray(c.expected)
                      ? c.expected.join(',')
                      : String(c.expected);
                    setEvidence((v) => ({
                      ...v,
                      [c.id]: [
                        {
                          type: c.type === 'sim-task' ? 'sim-task' : 'quiz',
                          score: value.trim() === expected ? 1 : 0,
                          context: { answer: value },
                        },
                      ],
                    }));
                  }}
                />
              </label>
            ))}
          </>
        )}
        {seg.type === 'transfer' && (
          <>
            <p>{seg.prompt}</p>
            <Choice
              label="迁移判断"
              options={seg.options}
              onAnswer={(o) =>
                record('transfer', o.correct ? 1 : 0, [
                  {
                    type: 'numeric-choice',
                    score: o.correct ? 1 : 0,
                    context: { answer: o.id },
                  },
                ])
              }
            />
            {scores.transfer !== undefined && <p>{seg.solution}</p>}
          </>
        )}
        {seg.type === 'recap' && (
          <>
            <ul>
              {seg.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <label>
              自评：我会什么，还想验证什么？
              <textarea
                aria-label="课节自评"
                value={self}
                onChange={(e) => setSelf(e.target.value)}
              />
            </label>
          </>
        )}
      </fieldset>
      {paused && <p role="status">课节已暂停。</p>}
      {done ? (
        <p role="status">证据已保存。可以在星图查看状态，或重新练习。</p>
      ) : (
        <button
          data-lesson-next
          disabled={paused || !ready}
          onClick={() => {
            if (index < 5) setIndex((i) => i + 1);
            else {
              onFinish(
                lessonResult(
                  lesson,
                  {
                    ...scores,
                    verify:
                      scores.verify *
                      (other.every((c) => evidence[c.id]?.[0]?.score === 1)
                        ? 1
                        : 0),
                  },
                  [
                    ...Object.values(evidence).flat(),
                    { type: 'explain', score: 0, context: { text: self } },
                  ],
                  runId.current,
                ),
              );
              setDone(true);
            }
          }}
        >
          {index === 5 ? '保存学习档案' : '下一段'}
        </button>
      )}
    </section>
  );
}
