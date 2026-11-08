import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import graph from './data/knowledge-graph.v1.json';
import { STATES, recommendations } from './learning.mjs';
import { useLearningProfile } from './learningProfileStore';
import LessonRunner from './LessonRunner';
import StarMap from './StarMap';
import './teaching.css';
const modules = import.meta.glob('./data/lessons/*.lesson.json', {
  eager: true,
  import: 'default',
});
const lessons = Object.fromEntries(
  Object.values(modules).map((l) => [l.kp.id, l]),
);
export default function TeachingPanel() {
  const s = useLearningProfile(),
    [tab, setTab] = useState('课节'),
    [current, setCurrent] = useState(null),
    [minutes, setMinutes] = useState(15),
    [confirm, setConfirm] = useState(false),
    [serial, setSerial] = useState(0);
  function start(id) {
    if (s.profile.kps[id].status === 'locked') return;
    s.begin(id);
    setCurrent(id);
    setSerial((n) => n + 1);
    setTab('课节');
  }
  return (
    <div className="teaching-panel" data-teaching-panel>
      <h2 id="modal-title">
        <BookOpen size={24} />
        校验之径
      </h2>
      <p>先观察，留下证据，再走下一步。</p>
      <div role="tablist" aria-label="教学面板">
        {['课节', '星图', '档案'].map((t) => (
          <button
            key={t}
            role="tab"
            id={'teaching-tab-' + t}
            aria-controls="teaching-tabpanel"
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const tabs = ['课节', '星图', '档案'];
                const next =
                  e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? 2
                      : (tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : 2)) %
                        3;
                setTab(tabs[next]);
                document.getElementById('teaching-tab-' + tabs[next])?.focus();
              }
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="teaching-tabpanel"
        aria-labelledby={'teaching-tab-' + tab}
      >
        {tab === '课节' &&
          (current ? (
            <LessonRunner
              key={current + serial}
              lesson={lessons[current]}
              onFinish={(r) => s.finish(current, r)}
              onLeave={() => setCurrent(null)}
            />
          ) : (
            <>
              <section className="teaching-card">
                <h3>今日建议</h3>
                <label>
                  可用时间
                  <select
                    aria-label="今日可用时间"
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                  >
                    {[15, 30, 60].map((n) => (
                      <option key={n} value={n}>
                        {n} 分钟
                      </option>
                    ))}
                  </select>
                </label>
                {recommendations(graph, s.profile, minutes).map((id) => (
                  <button key={id} onClick={() => start(id)}>
                    {id} · {lessons[id].kp.name}
                  </button>
                ))}
              </section>
              <div className="teaching-lessons">
                {graph.kps.map((k) => (
                  <article className="teaching-card" key={k.id}>
                    <h3>
                      {k.id} · {k.name}
                    </h3>
                    <p>{k.oneLiner}</p>
                    <small>
                      {k.layer} · {STATES[s.profile.kps[k.id].status]} ·{' '}
                      {lessons[k.id].meta.estimatedMinutes} 分钟
                    </small>
                    <button
                      data-start-lesson={k.id}
                      disabled={s.profile.kps[k.id].status === 'locked'}
                      onClick={() => start(k.id)}
                    >
                      开始课节
                    </button>
                  </article>
                ))}
              </div>
            </>
          ))}
        {tab === '星图' && <StarMap profile={s.profile} onStart={start} />}
        {tab === '档案' && (
          <section>
            <h3>本机学习档案</h3>
            <p>
              连续学习 {s.profile.schedule.streakDays} 天 · 已记录{' '}
              {s.profile.history.length} 次课节
            </p>
            {graph.kps
              .filter((k) => s.profile.kps[k.id].attempts)
              .map((k) => (
                <p key={k.id}>
                  {k.name} · {STATES[s.profile.kps[k.id].status]} ·{' '}
                  {s.profile.kps[k.id].evidence.length} 条证据
                </p>
              ))}
            <button onClick={() => setConfirm(true)}>重置本档案</button>
            {confirm && (
              <div role="group" aria-label="教学档案重置确认">
                <p>确认清除校验之径的课节证据与复习安排？</p>
                <button
                  onClick={() => {
                    s.reset();
                    setCurrent(null);
                    setConfirm(false);
                  }}
                >
                  确认重置本档案
                </button>
                <button onClick={() => setConfirm(false)}>保留档案</button>
              </div>
            )}
          </section>
        )}
      </div>
      {s.storageError && (
        <p role="alert">存储不可用，本次进度仅保留在当前页面。</p>
      )}
    </div>
  );
}
