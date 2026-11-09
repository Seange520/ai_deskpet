import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import diagnostic from './data/diagnostic.v1.json';
import { DIAGNOSTIC_PATHS } from './learning.mjs';
import { useLearningProfile } from './learningProfileStore';

export default function DiagnosticPanel({ onClose }) {
  const s = useLearningProfile();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const answered = Object.keys(answers).length;
  const submit = () => {
    const all = {};
    for (const q of diagnostic.questions) all[q.id] = answers[q.id];
    s.diagnose(all);
    setResult(useLearningProfile.getState().profile.diagnostic || null);
  };
  const pathInfo = result ? DIAGNOSTIC_PATHS[result.path] : null;
  return (
    <section className="teaching-diagnostic" data-diagnostic-panel>
      <h3>
        <ClipboardCheck size={18} /> 起点诊断 · 约 {diagnostic.estimatedMinutes}{' '}
        分钟
      </h3>
      <p>
        {diagnostic.note} 共 {diagnostic.questions.length} 题，答完给出路径建议。
      </p>
      {result ? (
        <div data-diagnostic-result={result.path}>
          <p className="diagnostic-path">
            建议路径：<strong>{pathInfo?.label}</strong>（{result.score}/
            {result.total} 正确）
          </p>
          <p>{pathInfo?.oneLine}</p>
          <p className="diagnostic-skipped">
            已按路径标记可跳过的知识点（答对项），其余从缺的层补。
          </p>
          <button type="button" onClick={onClose}>
            知道了，开始学习
          </button>
        </div>
      ) : (
        <>
          <ol className="diagnostic-questions">
            {diagnostic.questions.map((q) => (
              <li key={q.id}>
                <p>
                  <span className="diagnostic-layer">{q.layer}</span>
                  {q.prompt}
                </p>
                <div role="radiogroup" aria-label={q.id}>
                  {q.options.map((opt, i) => (
                    <label key={opt}>
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === i}
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [q.id]: i }))
                        }
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="diagnostic-actions">
            <button
              type="button"
              onClick={submit}
              disabled={answered < diagnostic.questions.length}
            >
              提交诊断（{answered}/{diagnostic.questions.length}）
            </button>
            <button type="button" onClick={onClose}>
              以后再说
            </button>
          </div>
        </>
      )}
    </section>
  );
}
