import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, ClipboardList, Trophy } from 'lucide-react';
import { bestMissionRecord, readMissionProgress } from '../features/mission/missionProgress.mjs';
import { levelFor, MAX_XP } from '../stores/useLearningStore';

const MISSIONS = [
  { id: 'A', title: '熄灯的晚餐', note: '表箱保险 OL · 先测再换' },
  { id: 'B', title: '发烫的接头', note: '0.4Ω / 4.8Ω · 接触电阻' },
  { id: 'C', title: '不能熄灭的灯', note: '24V SELV 带电 · 保护更换' },
];

function readMastered() {
  try {
    const raw = localStorage.getItem('sparkmate.checksum.profile.v1');
    if (!raw) return 0;
    const profile = JSON.parse(raw);
    return Object.values(profile?.kps ?? {}).filter((k) => k && k.status === 'mastered').length;
  } catch {
    return 0;
  }
}

export default function CommissionBoard({ xp = 0, badges = [], routes = {} }) {
  const [progress, setProgress] = useState(() => readMissionProgress());
  const [mastered, setMastered] = useState(() => readMastered());

  useEffect(() => {
    setProgress(readMissionProgress());
    setMastered(readMastered());
  }, []);

  const done = progress.completed ?? [];
  const level = levelFor(xp);
  const routeDone = useMemo(
    () =>
      Object.values(routes).filter(
        (route) => route?.materials && route?.wiring && route?.code,
      ).length,
    [routes],
  );

  return (
    <div className="page ranking-page min-w-0">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> COMMISSION BOARD · 委托板
          </div>
          <h1>
            街上等人的事，
            <br />
            写了单<span className="text-neon">才算数。</span>
          </h1>
          <p>读数是凭据。先接一单，把灯修亮，名字才留在册上。</p>
        </div>
        <div className="chapter-tag">
          OPEN ORDERS <span>0{done.length} / 03</span>
        </div>
      </div>

      <section className="panel rank-board" aria-label="街坊委托单">
        <div className="rank-board-heading">
          <h2>晴光街 · 抢修三单</h2>
          <span className="pill">BETA · 本地记录</span>
        </div>
        <ul className="commission-list">
          {MISSIONS.map((mission, index) => {
            const finished = done.includes(mission.id);
            const best = bestMissionRecord(progress, mission.id);
            return (
              <li key={mission.id} className={finished ? 'is-you' : ''}>
                <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
                <div className="rank-person">
                  <b>{mission.title}</b>
                  <span>{mission.note}</span>
                </div>
                <strong>
                  {finished ? `已修${best ? ` · ${best.score} 分` : ''}` : '待接'}
                </strong>
              </li>
            );
          })}
        </ul>
        <a className="btn primary commission-cta" href="/?mission=r1&quality=3">
          <ClipboardList size={16} /> {done.length ? '再走一趟晴光街' : '揭下第一张单'}
          <ArrowRight size={16} />
        </a>
        <p className="rank-note">
          后续委托（换册核账 / 查册 / 城南旧秤行）会按章节进度陆续贴出；委托记录只保存在本机。
        </p>
      </section>

      <section className="panel rank-board" aria-label="钟楼回望">
        <div className="rank-board-heading">
          <h2>
            <CalendarDays size={16} /> 钟楼回望
          </h2>
          <span className="pill">只记路，不排名</span>
        </div>
        <div className="tower-stats">
          <div>
            <small>等级</small>
            <b>LV.{level}</b>
            <span>{xp} / {MAX_XP} XP</span>
          </div>
          <div>
            <small>已掌握课节</small>
            <b>{mastered}</b>
            <span>课节 · 本地档案</span>
          </div>
          <div>
            <small>走通的路线</small>
            <b>{routeDone} / 3</b>
            <span>物料 · 接线 · 代码</span>
          </div>
          <div>
            <small>修亮的灯</small>
            <b>{done.length} / 3</b>
            <span>晴光街</span>
          </div>
        </div>
        <div className="tower-badges">
          {badges.length ? (
            badges.map((badge) => (
              <span className="pill" key={badge.id ?? badge.name ?? badge}>
                <Trophy size={13} /> {badge.name ?? badge}
              </span>
            ))
          ) : (
            <p className="rank-note">
              <BookOpen size={14} /> 还没有旧记录。先走进校验册，或者接一张街坊的委托。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
