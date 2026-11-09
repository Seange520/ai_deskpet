import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import graph from './data/knowledge-graph.v1.json';
import { STATES, recommendations } from './learning.mjs';
import { useLearningProfile } from './learningProfileStore';
import LessonRunner from './LessonRunner';
import LessonRunnerV2 from './LessonRunnerV2';
import DiagnosticPanel from './DiagnosticPanel';
import chapters from './data/chapters.v1.json';
import StarMap from './StarMap';
import {
  DEMO_BANNER,
  demoDisabled,
  demoEnabled,
  demoRequested,
  filterDemoChapters,
  filterDemoIds,
  filterDemoKps,
  isDemoLesson,
  writeDemoFlag,
  DEMO_LESSONS,
} from './demoMode.mjs';
import './teaching.css';
const modules = import.meta.glob('./data/lessons/*.lesson.json', {
  eager: true,
  import: 'default',
});
const lessons = Object.fromEntries(
  Object.values(modules).map((l) => [l.kp.id, l]),
);
const modulesV2 = import.meta.glob('./data/lessons-v2/*.v2.json', {
  eager: true,
  import: 'default',
});
const lessonsV2 = Object.fromEntries(
  Object.values(modulesV2).map((l) => [l.kp.id, l]),
);
export default function TeachingPanel() {
  const [demo] = useState(() =>
      demoEnabled({ search: typeof location === 'undefined' ? '' : location.search }),
    ),
    s = useLearningProfile(),
    [tab, setTab] = useState('课节'),
    [diagOpen, setDiagOpen] = useState(false),
    [current, setCurrent] = useState(null),
    [currentV2, setCurrentV2] = useState(null),
    [minutes, setMinutes] = useState(15),
    [confirm, setConfirm] = useState(false),
    [serial, setSerial] = useState(0);
  useEffect(() => {
    const search = typeof location === 'undefined' ? '' : location.search;
    if (demoRequested(search)) writeDemoFlag(true);
    else if (demoDisabled(search)) writeDemoFlag(false);
  }, []);
  function start(id, v2 = false) {
    if (demo && !isDemoLesson(id)) return;
    if (s.profile.kps[id].status === 'locked') return;
    s.begin(id);
    if (v2) setCurrentV2(id);
    else setCurrent(id);
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
      {demo && (
        <section className="teaching-card" data-demo-banner>
          <h3>{DEMO_BANNER.title}</h3>
          <p>{DEMO_BANNER.body}</p>
        </section>
      )}
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
          (currentV2 ? (
            <LessonRunnerV2
              key={'v2-' + currentV2 + serial}
              lesson={lessonsV2[currentV2]}
              onFinish={(r) => s.finish(currentV2, r)}
              onLeave={() => setCurrentV2(null)}
            />
          ) : current ? (
            <LessonRunner
              key={current + serial}
              lesson={lessons[current]}
              onFinish={(r) => s.finish(current, r)}
              onLeave={() => setCurrent(null)}
            />
          ) : (
            <>
              <section className="teaching-card" data-diagnostic-card>
                <h3>起点诊断</h3>
                {s.profile.diagnostic ? (
                  <p>
                    已诊断：{s.profile.diagnostic.score}/{s.profile.diagnostic.total} 正确 ·
                    路径 {s.profile.diagnostic.path} ·{' '}
                    {new Date(s.profile.diagnostic.at).toLocaleDateString()}
                    <button type="button" onClick={() => setDiagOpen(true)}>
                      重新诊断
                    </button>
                  </p>
                ) : (
                  <p>
                    12 题、约 15 分钟定起点；答对的层会跳过，不浪费你已会的时间。
                    <button type="button" onClick={() => setDiagOpen(true)}>
                      开始诊断
                    </button>
                  </p>
                )}
              </section>
              {diagOpen && <DiagnosticPanel onClose={() => setDiagOpen(false)} />}
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
                {filterDemoIds(
                  recommendations(graph, s.profile, minutes),
                  demo,
                ).map((id) => (
                  <button key={id} onClick={() => start(id, Boolean(lessonsV2[id]))}>
                    {id} · {lessons[id]?.kp.name || lessonsV2[id]?.kp.name || id}
                  </button>
                ))}
              </section>
              <section className="teaching-chapters" data-teaching-chapters>
                <h3>任务链</h3>
                {filterDemoChapters(chapters.chapters, demo).map((ch) => {
                  const total = ch.lessons.length;
                  const done = ch.lessons.filter(
                    (id) => s.profile.kps[id]?.status === 'mastered',
                  ).length;
                  const nextId =
                    ch.lessons.find(
                      (id) => s.profile.kps[id]?.status !== 'mastered',
                    ) || ch.lessons[0];
                  return (
                    <article className="teaching-card" key={ch.id}>
                      <h4>{ch.title}</h4>
                      <p>{ch.oneLine}</p>
                      <small>
                        {done}/{total} 节已完成
                      </small>
                      <button
                        type="button"
                        onClick={() => start(nextId, Boolean(lessonsV2[nextId]))}
                      >
                        继续：{nextId} ·{' '}
                        {lessonsV2[nextId]?.kp.name ||
                          lessons[nextId]?.kp.name ||
                          nextId}
                      </button>
                    </article>
                  );
                })}
              </section>
              <div className="teaching-lessons">
                {filterDemoKps(graph.kps, demo).map((k) => {
                  const v1 = lessons[k.id];
                  const v2 = lessonsV2[k.id];
                  const meta = v1?.meta || v2?.meta;
                  return (
                    <article className="teaching-card" key={k.id}>
                      <h3>
                        {k.id} · {k.name}
                      </h3>
                      <p>{k.oneLiner}</p>
                      <small>
                        {k.layer} · {STATES[s.profile.kps[k.id].status]}
                        {meta ? ` · ${meta.estimatedMinutes} 分钟` : ''}
                      </small>
                      {v1 && (
                        <button
                          data-start-lesson={k.id}
                          disabled={s.profile.kps[k.id].status === 'locked'}
                          onClick={() => start(k.id)}
                        >
                          开始课节
                        </button>
                      )}
                      {v2 && (
                        <button
                          data-start-lesson-v2={k.id}
                          disabled={s.profile.kps[k.id].status === 'locked'}
                          onClick={() => start(k.id, true)}
                        >
                          {v1 ? '重制版 · 任务制' : '开始课节 · 任务制'}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ))}
        {tab === '星图' && (
          <StarMap
            profile={s.profile}
            onStart={start}
            ids={demo ? new Set(DEMO_LESSONS) : null}
          />
        )}
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
