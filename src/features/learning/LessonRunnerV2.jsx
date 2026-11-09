import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import SimEmbed from './sims/SimEmbed.jsx';
import ModeMeterSim from './ModeMeterSim.jsx';
import { createNarrator } from './teachingVoice.mjs';

const ORDER = ['mission', 'observe', 'learn', 'do', 'prove', 'transfer', 'recap'];
const LABELS = {
  mission: '任务简报',
  observe: '看见现象',
  learn: '原理',
  do: '动手演练',
  prove: '测量证明',
  transfer: '迁移',
  recap: '复盘',
};

function Narration({ lines }) {
  const narrator = useMemo(() => createNarrator(window), []);
  const [speaking, setSpeaking] = useState(false);
  const [current, setCurrent] = useState(-1);
  useEffect(
    () => () => {
      narrator.stop();
    },
    [narrator],
  );
  if (!lines?.length) return null;
  return (
    <div className="teaching-narration">
      <div className="teaching-narration-head">
        <button
          type="button"
          aria-pressed={speaking}
          onClick={() => {
            if (speaking) {
              narrator.stop();
              setSpeaking(false);
              setCurrent(-1);
              return;
            }
            setSpeaking(true);
            narrator.speak(lines, {
              onLine: (i) => setCurrent(i),
              onEnd: () => {
                setSpeaking(false);
                setCurrent(-1);
              },
            });
          }}
        >
          {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          {speaking ? '停止朗读' : '朗读本段'}
        </button>
        <span className="teaching-narration-meta">
          {narrator.supported ? '旁白 · 可关' : '当前浏览器不支持语音朗读'}
        </span>
      </div>
      <ol>
        {lines.map((line, i) => (
          <li key={i} className={i === current ? 'is-current' : undefined}>
            {line}
          </li>
        ))}
      </ol>
    </div>
  );
}

function TextCheck({ check, value, onChange }) {
  if (!check) return null;
  const done = value?.correct === true;
  return (
    <section className="teaching-card">
      <h4>{check.task}</h4>
      <fieldset className="teaching-segment">
        <legend>选择一个答案</legend>
        {check.options.map((label, i) => (
          <label key={label} className="teaching-choice">
            <input
              type="radio"
              name={check.id}
              checked={value?.index === i}
              onChange={() => onChange({ index: i, correct: i === check.answerIndex })}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p role="status">
        {done
          ? '判断正确，记入证据。'
          : value
            ? '再想想：先看现象和读数，再下结论。'
            : '先选一个判断，再进入下一步。'}
      </p>
    </section>
  );
}

export default function LessonRunnerV2({ lesson, onFinish, onLeave }) {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState({});
  const [simEvidence, setSimEvidence] = useState(null);
  const [simSkipped, setSimSkipped] = useState(false);
  const [prove, setProve] = useState({ score: 0, records: [] });
  const [finish, setFinish] = useState(null);
  const startRef = useRef(Date.now());
  const seg = lesson.segments[step];
  const node = ORDER[step];
  const canNext = (() => {
    if (node === 'observe' || node === 'learn' || node === 'transfer')
      return choices[node]?.correct === true;
    if (node === 'do') return Boolean(simEvidence) || simSkipped;
    if (node === 'prove') return prove.score === 1;
    return true;
  })();

  function next() {
    if (!canNext) return;
    if (step < ORDER.length - 1) setStep((s) => s + 1);
  }

  function submit() {
    const checkScore =
      [choices.observe?.correct, choices.learn?.correct, simEvidence ? 1 : 0, prove.score]
        .filter((v) => typeof v === 'boolean' || typeof v === 'number')
        .reduce((a, b) => a + (b ? 1 : 0), 0) / 4;
    const transferScore = choices.transfer?.correct ? 1 : 0;
    const evidence = [
      ...(['observe', 'learn'].includes(node) ? [] : []),
      ...(choices.observe
        ? [
            {
              type: 'quiz',
              score: choices.observe.correct ? 1 : 0,
              context: { lesson: lesson.lessonId, segment: 'observe' },
            },
          ]
        : []),
      ...(choices.learn
        ? [
            {
              type: 'quiz',
              score: choices.learn.correct ? 1 : 0,
              context: { lesson: lesson.lessonId, segment: 'learn' },
            },
          ]
        : []),
      ...(simEvidence || []),
      ...(prove.records || []),
      ...(choices.transfer
        ? [
            {
              type: 'quiz',
              score: choices.transfer.correct ? 1 : 0,
              context: { lesson: lesson.lessonId, segment: 'transfer' },
            },
          ]
        : []),
    ];
    const result = {
      runId: `v2-${lesson.lessonId}-${startRef.current}-${Date.now()}`,
      checkScore,
      transferScore,
      evidence,
    };
    setFinish({ checkScore, transferScore, evidenceCount: evidence.length });
    onFinish?.(result);
  }

  if (finish)
    return (
      <div className="teaching-run" data-lesson-v2={lesson.kp.id} data-v2-complete="true">
        <h3>{lesson.kp.name} · 任务完成</h3>
        <p>
          校验分数 {Math.round(finish.checkScore * 100)} · 迁移分数{' '}
          {Math.round(finish.transferScore * 100)} · 证据 {finish.evidenceCount} 条
        </p>
        <p>你已经用测量和判断证明了这节课的结论，证据已写入档案。</p>
        <button type="button" data-v2-leave onClick={onLeave}>
          返回课节列表
        </button>
      </div>
    );

  return (
    <div className="teaching-run" data-lesson-v2={lesson.kp.id} data-v2-segment={node}>
      <header className="teaching-run-head">
        <h3>
          {lesson.kp.name} · {LABELS[node]}
        </h3>
        <p>
          第 {step + 1} / {ORDER.length} 段 · 建议 {seg.seconds} 秒 · {lesson.meta.gameMount}
        </p>
      </header>

      {node === 'mission' && (
        <section className="teaching-card">
          <p>{lesson.story.setup}</p>
          <Narration lines={seg.narration} />
          <p>{seg.task}</p>
        </section>
      )}

      {node === 'observe' && (
        <section className="teaching-card">
          <Narration lines={seg.narration} />
          {seg.media?.map((m) => (
            <figure key={m.src} className="teaching-media-asset">
              <img src={'/' + m.src.replace(/^assets\//, 'assets/')} alt={m.alt || '现象示意图'} loading="lazy" />
            </figure>
          ))}
          <TextCheck
            check={seg.check}
            value={choices.observe}
            onChange={(v) => setChoices((c) => ({ ...c, observe: v }))}
          />
        </section>
      )}

      {node === 'learn' && (
        <section className="teaching-card">
          <Narration lines={seg.narration} />
          {seg.media?.map((m) => (
            <figure key={m.src} className="teaching-media-asset">
              <img src={'/' + m.src.replace(/^assets\//, 'assets/')} alt={m.alt || '原理示意图'} loading="lazy" />
            </figure>
          ))}
          {seg.term && (
            <p>
              <strong>{seg.term.text}</strong>
              <small> · {seg.term.oneLine}</small>
            </p>
          )}
          <TextCheck
            check={seg.check}
            value={choices.learn}
            onChange={(v) => setChoices((c) => ({ ...c, learn: v }))}
          />
        </section>
      )}

      {node === 'do' && (
        <section className="teaching-card">
          <Narration lines={seg.narration} />
          <p>{seg.sim.task}</p>
          <ul>
            {seg.sim.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <SimEmbed
            simId={seg.sim.id}
            onComplete={(evidence) => {
              const records = evidence.map((e) => ({
                type: 'sim-task',
                score: e.attempts.at(-1).passed ? 1 : 0,
                context: { lesson: lesson.lessonId, segment: 'do', check: e.id },
              }));
              setSimEvidence(records);
            }}
          />
          {!simEvidence && (
            <button type="button" data-v2-skip-do onClick={() => setSimSkipped(true)}>
              暂时跳过演练（课后可补）
            </button>
          )}
        </section>
      )}

      {node === 'prove' && (
        <section className="teaching-card">
          <Narration lines={seg.narration} />
          <ModeMeterSim
            checks={seg.checks}
            onComplete={(score, records) => {
              if (score === undefined) return;
              setProve({ score, records });
            }}
          />
        </section>
      )}

      {node === 'transfer' && (
        <section className="teaching-card">
          <Narration lines={seg.narration} />
          <TextCheck
            check={{ ...seg, id: 'transfer' }}
            value={choices.transfer}
            onChange={(v) => setChoices((c) => ({ ...c, transfer: v }))}
          />
        </section>
      )}

      {node === 'recap' && (
        <section className="teaching-card">
          <Narration lines={seg.narration} />
          <ul>
            {seg.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p>{lesson.safety.note}</p>
          <button type="button" data-v2-submit onClick={submit}>
            完成课节 · 写入档案
          </button>
        </section>
      )}

      <footer className="teaching-run-footer">
        <button type="button" onClick={onLeave}>
          返回课节列表
        </button>
        {step < ORDER.length - 1 ? (
          <button
            type="button"
            data-v2-next
            disabled={!canNext}
            onClick={next}
          >
            下一段
          </button>
        ) : null}
      </footer>
    </div>
  );
}
