import Button from './Button';
import SpotlightCard from './ui/SpotlightCard';
import ShineBorder from './ui/ShineBorder';
import { motion } from 'framer-motion';
import { TiltSurface, Depth, HeroGlass, useFineMotion } from './MicroEffects';
import { TACTILE } from '../motion';
import RouteGallery from './RouteGallery';
import GrowthOverview from './GrowthOverview';
import RouteTaskMatrix from './RouteTaskMatrix';
import AchievementSummary from './AchievementSummary';
import { getHardwareRoute } from '../data/hardwareRoutes';
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

// 外层负责倾斜，article 保留原有语义与布局，内部图文按深度分别视差。
function TiltCard({ children, className = '', current = false }) {
  const card = <SpotlightCard className={`level-card ${className}`}>{children}</SpotlightCard>;
  return (
    <TiltSurface lightEffect={false}>
      {current ? <ShineBorder>{card}</ShineBorder> : card}
    </TiltSurface>
  );
}

export default function Dashboard({
  progress,
  badges,
  onNavigate,
  onMaterials,
  routeId = 'classic',
  onChooseRoute,
}) {
  const route = getHardwareRoute(routeId);
  const fine = useFineMotion();
  // 当前路线关卡与全局徽章均来自 Zustand；重复练习不重复奖励。
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
  // Follow the learning order even when earlier steps were completed out of order.
  const currentStep = steps.findIndex((step) => !step.done);
  return (
    <div className="page dashboard min-w-0">
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
      <motion.section
        className="hero-panel"
        whileHover={fine ? { scale: 1.003 } : undefined}
        whileTap={fine ? { scale: 0.997 } : undefined}
        transition={TACTILE}
      >
        <HeroGlass />
        <div className="hero-copy">
          <div className="mini-label">
            <span>新手创造计划</span>
            <span>{route.name}</span>
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
          <Button
            className="btn primary"
            onClick={() => onNavigate(progress.wiring ? 'code' : 'hardware')}
          >
            {progress.wiring ? '进入代码工坊' : '进入硬件实验室'}
            <ArrowRight size={17} />
          </Button>
          <div className="guest-entry">
            <span>不注册，不用准备硬件。先玩一下。</span>
            <div>
              <Button className="btn guest-button" onClick={() => onNavigate('hardware')}>
                零门槛体验 · 虚拟连线
              </Button>
              <Button className="text-button" onClick={() => onNavigate('code')}>
                直接体验代码调参 <ArrowUpRight size={15} />
              </Button>
            </div>
          </div>
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
      </motion.section>
      <GrowthOverview />
      <RouteTaskMatrix />
      <section className="achievement-panel achievement-milestones" aria-labelledby="achievement-milestones-title">
        <div>
          <div className="eyebrow">SMALL WINS, BIG SPARKS</div>
          <h2 id="achievement-milestones-title">每一步，都值得被记住</h2>
          <p>全局成就墙 · 任一路线首次完成即可点亮勋章。</p>
          <AchievementSummary badges={badges} />
        </div>
        <div className="badges">
          {[
            { name: '初入江湖', icon: Award, on: true },
            { name: '物料侦探', icon: Package, on: badges.materials },
            { name: '电路新星', icon: Cable, on: badges.wiring },
            { name: '唤醒伙伴', icon: Sparkles, on: badges.code },
          ].map((b) => (
            <div className={`badge ${b.on ? 'unlocked' : ''}`} key={b.name}>
              <div>{b.on ? <b.icon size={25} /> : <LockKeyhole size={21} />}</div>
              <span>{b.name}</span>
              <small>{b.on ? '已解锁' : '待解锁'}</small>
            </div>
          ))}
        </div>
      </section>
      <RouteGallery routeId={routeId} onChoose={onChooseRoute} />
      <div className="section-title">
        <h2>
          你的创造路线 <span>THE PLAYBOOK</span>
        </h2>
        <span>
          循序渐进，每一步都算数 <ArrowUpRight size={15} />
        </span>
      </div>
      <div className="level-grid !gap-4 lg:!gap-6">
        {steps.map((s, i) => (
          <TiltCard key={s.number} className={`level-${i}`} current={i === currentStep}>
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
            <Depth as="div" depth={1.2} className={`level-illustration illustration-${i}`}>
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
            </Depth>
            <span className="level-en">{s.en}</span>
            <Depth as="h3" depth={0.5}>
              {s.title}
            </Depth>
            <Depth as="p" depth={0.25}>
              {s.text}
            </Depth>
            <Button className="card-action" onClick={s.action}>
              {s.done ? '再次探索' : i === 0 ? '查看物料清单' : '开始探索'}
              <ArrowUpRight size={17} />
            </Button>
            <span className="level-time">
              {s.time} · +{[100, 250, 150][i]} XP
            </span>
          </TiltCard>
        ))}
      </div>
      <div className="bottom-note">
        <span className="status-dot" /> MAKE SOMETHING THAT MAKES YOU SMILE.
        <span>专为第一次创造而设计</span>
      </div>
    </div>
  );
}
