import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Package,
  Cable,
  Sparkles,
  Award,
  LockKeyhole,
  Zap,
  Clock3,
} from 'lucide-react';
import { Board, Pet } from './Visuals';

// MotionValue 更新绕过 React 重渲染，弹簧让倾斜效果平滑回正。
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const reduced = useReducedMotion();
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [7, -7]), { stiffness: 180, damping: 22 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-7, 7]), { stiffness: 180, damping: 22 });
  return (
    <motion.article
      ref={ref}
      className={`level-card ${className}`}
      style={{
        rotateX: reduced ? 0 : rx,
        rotateY: reduced ? 0 : ry,
        transformStyle: 'preserve-3d',
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.article>
  );
}

export default function Dashboard({ progress, onNavigate, onMaterials }) {
  // 关卡完成状态由 App 统一管理：经验和徽章都从状态派生，重复练习不会重复加分。
  const steps = [
    {
      title: '准备物料',
      en: 'MEET THE HARDWARE',
      icon: Package,
      number: '01',
      time: '约 5 分钟',
      text: '认识每个小零件，组建你的创客工具箱。',
      done: progress.materials,
      action: onMaterials,
    },
    {
      title: '动手实操',
      en: 'MAKE THE CONNECTION',
      icon: Cable,
      number: '02',
      time: '约 10 分钟',
      text: '从第一根杜邦线开始，让电路连接想象。',
      done: progress.wiring,
      action: () => onNavigate('hardware'),
    },
    {
      title: 'AI 觉醒',
      en: 'BRING IT TO LIFE',
      icon: Sparkles,
      number: '03',
      time: '约 8 分钟',
      text: '修改第一行参数，赋予桌宠独特的性格。',
      done: progress.code,
      action: () => onNavigate('code'),
    },
  ];
  return (
    <div className="page dashboard">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> YOUR MAKER JOURNEY
          </div>
          <h1>
            每个伟大的创造，
            <br />
            都始于一点<span className="text-neon">火花。</span>
          </h1>
          <p>你好，未来的工程师。今天，让想象在你的桌面上醒来。</p>
        </div>
        <div className="chapter-tag">
          LEARNING PATH{' '}
          <span>
            {String(Math.min(3, Object.values(progress).filter(Boolean).length + 1)).padStart(
              2,
              '0',
            )}{' '}
            / 03
          </span>
        </div>
      </div>
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="mini-label">
            <span>新手创造计划</span>
            <span>ESP32-S3</span>
          </div>
          <h2>
            你的第一个 AI 伙伴，
            <br />
            由你亲手创造。
          </h2>
          <p>
            从认识芯片到点亮表情，零基础也能完成。
            <br />
            不止学会电路，更要把想法变成现实。
          </p>
          <button
            className="btn primary"
            onClick={() => onNavigate(progress.wiring ? 'code' : 'hardware')}
          >
            {progress.wiring ? '进入代码工坊' : '进入硬件实验室'}
            <ArrowRight size={17} />
          </button>
          <div className="hero-meta">
            <span>
              <Zap size={14} /> 三个关卡 · 一次创造
            </span>
            <span>
              <Clock3 size={14} /> 约 25 分钟
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-coordinate">COMPANION_001</span>
          <div className="hero-pet">
            <Pet />
          </div>
          <div className="float-label label-one">
            <span className="status-dot" /> 等待与你相遇
          </div>
          <div className="float-label label-two">
            <Zap size={14} /> POWERED BY YOUR IDEAS
          </div>
          <span className="art-plus">+</span>
        </div>
      </section>
      <div className="section-title">
        <h2>
          你的创造路线 <span>THE PLAYBOOK</span>
        </h2>
        <span>
          循序渐进，每一步都算数 <ArrowUpRight size={15} />
        </span>
      </div>
      <div className="level-grid">
        {steps.map((s, i) => (
          <TiltCard key={s.number} className={`level-${i}`}>
            <div className="level-top">
              <span className="level-number">LEVEL {s.number}</span>
              <span className={`level-status ${s.done ? 'complete' : ''}`}>
                {s.done ? (
                  <>
                    <Check size={12} /> 已完成
                  </>
                ) : i === 0 ? (
                  '从这里开始'
                ) : (
                  '探索关卡'
                )}
              </span>
            </div>
            <div className={`level-illustration illustration-${i}`}>
              {i === 0 ? (
                <Board />
              ) : i === 1 ? (
                <div className="circuit-art">
                  <i />
                  <i />
                  <span />
                  <span />
                  <Cable size={46} />
                </div>
              ) : (
                <div className="code-art">
                  <span>&lt;</span>
                  <Sparkles size={42} />
                  <span>/&gt;</span>
                </div>
              )}
            </div>
            <span className="level-en">{s.en}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <button className="card-action" onClick={s.action}>
              {s.done ? '再次探索' : i === 0 ? '查看物料清单' : '开始探索'}
              <ArrowUpRight size={17} />
            </button>
            <span className="level-time">
              {s.time} · +{[100, 250, 150][i]} XP
            </span>
          </TiltCard>
        ))}
      </div>
      <section className="achievement-panel">
        <div>
          <div className="eyebrow">SMALL WINS, BIG SPARKS</div>
          <h2>每一步，都值得被记住</h2>
          <p>把好奇心变成你的第一枚勋章。</p>
        </div>
        <div className="badges">
          {[
            { name: '初入江湖', icon: Award, on: true },
            { name: '物料侦探', icon: Package, on: progress.materials },
            { name: '电路新星', icon: Cable, on: progress.wiring },
            { name: '唤醒伙伴', icon: Sparkles, on: progress.code },
          ].map((b) => (
            <div className={`badge ${b.on ? 'unlocked' : ''}`} key={b.name}>
              <div>{b.on ? <b.icon size={25} /> : <LockKeyhole size={21} />}</div>
              <span>{b.name}</span>
              <small>{b.on ? '已解锁' : '待解锁'}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="bottom-note">
        <span className="status-dot" /> MAKE SOMETHING THAT MAKES YOU SMILE.
        <span>专为第一次创造而设计</span>
      </div>
    </div>
  );
}
