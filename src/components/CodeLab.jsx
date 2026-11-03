import CodeRunner from './CodeRunner';
import HardwareConnectionPanel from '../features/hardware/HardwareConnectionPanel';
import Button from './Button';
import { useState } from 'react';
import {
  Code2,
  Radio,
  RotateCcw,
  Check,
  LockKeyhole,
  ArrowRight,
  Sparkles,
  Upload,
} from 'lucide-react';
import { routeLessons, getLessonCode } from '../data/routeLessons';
import ExperimentPreview from './ExperimentPreview';
import { Pet } from './Visuals';
import { getHardwareRoute } from '../data/hardwareRoutes';

const themes = [
  { label: '薄荷绿', color: '#6EE7B7' },
  { label: '星云紫', color: '#B39AFF' },
  { label: '日落橙', color: '#FFB36B' },
  { label: '樱花粉', color: '#FF8EB7' },
];
export default function CodeLab({
  routeId = 'classic',
  unlocked,
  completed,
  onComplete,
  onHardware,
}) {
  const route = getHardwareRoute(routeId),
    lesson = routeLessons[route.id];
  const [angle, setAngle] = useState(90),
    [direction, setDirection] = useState('forward'),
    [tilt, setTilt] = useState(0);
  const [verified, setVerified] = useState(false),
    [ideStatus, setIdeStatus] = useState('浏览器教学预览 · 未连接真实设备');
  // 参数作为唯一数据源，同时驱动伪代码文本与右侧 SVG 表情，修改即反馈。
  const [speed, setSpeed] = useState(2400),
    [color, setColor] = useState('#6EE7B7'),
    [expression, setExpression] = useState('happy');
  const modified =
    routeId === 'classic'
      ? speed !== 2400 || color !== '#6EE7B7' || expression !== 'happy'
      : routeId === 'quadruped'
        ? angle !== 90
        : routeId === 'tracked'
          ? direction !== 'forward'
          : tilt !== 0;
  function change(fn, value) {
    fn(value);
    setVerified(false);
    setIdeStatus('参数已变化，请重新模拟验证');
  }
  const lines = getLessonCode(route.id, { speed, color, expression, angle, direction, tilt });
  return (
    <div className="page">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">LEVEL 03 / CREATIVE CODE LAB</div>
          <h1>
            一点代码，<span className="text-neon">无限个性。</span>
          </h1>
          <p>你改变的不只是数字，还有桌面上那个小家伙的性格。</p>
        </div>
        <span className="pill">
          <Radio size={13} className="text-neon" /> LIVE PREVIEW
        </span>
      </div>
      <p className="route-context code-route-context">
        当前路线：{route.name} · {lesson.title}
        。课程预览仍为浏览器模拟；下方硬件入口仅读取设备数据。
      </p>
      <HardwareConnectionPanel />
      <CodeRunner />
      <h2 className="route-experiment-heading">路线参数实验</h2>
      {!unlocked && (
        <div className="unlock-note">
          <LockKeyhole size={18} />
          <span>可以先体验实时预览。完成正确接线后，即可领取本关成就。</span>
          <Button onClick={onHardware}>
            去接线 <ArrowRight size={14} />
          </Button>
        </div>
      )}
      <div className="code-grid">
        <section className="panel editor-panel">
          <div className="editor-tab">
            <span>
              <Code2 size={16} /> sparkmate.ino <i />
            </span>
            <span>Arduino 风格 · 教学伪代码</span>
          </div>
          <div className="ide-toolbar" role="toolbar" aria-label="Arduino 教学工具栏">
            <Button
              className="ide-tool"
              onClick={() => {
                setVerified(true);
                setIdeStatus('模拟验证通过：仅检查本课程参数状态，不进行 C++ 编译。');
              }}
            >
              <Check size={17} />
              验证（模拟）
            </Button>
            <Button
              className="ide-tool"
              disabled={!verified}
              onClick={() =>
                setIdeStatus('模拟上传完成：仅更新当前预览，没有连接串口或烧录开发板。')
              }
            >
              <Upload size={17} />
              上传（模拟）
            </Button>
            <span>{lesson.title}</span>
          </div>
          <p className="ide-feedback" aria-live="polite">
            {ideStatus}
          </p>
          <div className="editor" role="region" aria-label="随参数实时更新的教学伪代码">
            {lines.map(([type, line], i) => (
              <div className="code-line" key={i}>
                <span className="line-number">{i + 1}</span>
                <code className={`syntax-${type}`}>{line || ' '}</code>
              </div>
            ))}
          </div>
          <div className="editor-status">
            <span>● 参数已同步</span>
            <span>UTF-8　 C++ DEMO</span>
          </div>
          <div className="controls">
            <div className="control-heading">
              <h3>试着改变一点什么</h3>
              <Button
                className="icon-btn"
                aria-label="重置桌宠参数"
                onClick={() => {
                  setSpeed(2400);
                  setColor('#6EE7B7');
                  setExpression('happy');
                  setAngle(90);
                  setDirection('forward');
                  setTilt(0);
                  setVerified(false);
                  setIdeStatus('参数已重置 · 未连接真实设备');
                }}
              >
                <RotateCcw size={16} />
              </Button>
            </div>
            {routeId === 'classic' ? (
              <>
                <label className="slider-label" htmlFor="blink-speed">
                  眨眼间隔{' '}
                  <output>
                    {(speed / 1000).toFixed(1)} <small>秒</small>
                  </output>
                </label>
                <input
                  id="blink-speed"
                  type="range"
                  min="600"
                  max="5000"
                  step="100"
                  value={speed}
                  onChange={(e) => change(setSpeed, Number(e.target.value))}
                />
                <div className="range-scale">
                  <span>活力满满</span>
                  <span>悠然自在</span>
                </div>
                <div className="control-row">
                  <fieldset>
                    <legend>屏幕主题</legend>
                    <div className="swatches">
                      {themes.map((t) => (
                        <Button
                          key={t.color}
                          title={t.label}
                          aria-label={t.label}
                          aria-pressed={color === t.color}
                          style={{ '--swatch': t.color }}
                          className={color === t.color ? 'selected' : ''}
                          onClick={() => change(setColor, t.color)}
                        >
                          {color === t.color && <Check size={14} />}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                  <label htmlFor="expression">
                    表情模式
                    <select
                      id="expression"
                      value={expression}
                      onChange={(e) => change(setExpression, e.target.value)}
                    >
                      <option value="happy">开心 · Happy</option>
                      <option value="curious">好奇 · Curious</option>
                      <option value="sleepy">困困 · Sleepy</option>
                    </select>
                  </label>
                </div>
              </>
            ) : routeId === 'quadruped' ? (
              <>
                <label className="slider-label" htmlFor="servo-angle">
                  关节角度 <output>{angle}°</output>
                </label>
                <input
                  id="servo-angle"
                  type="range"
                  min="45"
                  max="135"
                  step="1"
                  value={angle}
                  onChange={(e) => change(setAngle, Number(e.target.value))}
                />
                <div className="range-scale">
                  <span>45° · 模拟下限</span>
                  <span>135° · 模拟上限</span>
                </div>
                <p className="experiment-control-note">
                  8 个 SG90 中的 1 个关节。实物调试前先断电、拆连杆并标定机械限位。
                </p>
              </>
            ) : routeId === 'tracked' ? (
              <>
                <label className="slider-label" htmlFor="motor-direction">
                  电机方向
                </label>
                <select
                  id="motor-direction"
                  value={direction}
                  onChange={(e) => change(setDirection, e.target.value)}
                >
                  <option value="forward">正转 · Forward</option>
                  <option value="reverse">反转 · Reverse</option>
                  <option value="stop">停止 · Coast</option>
                </select>
                <p className="experiment-control-note">
                  L298N 的一个 H 桥演示。先停机再改向；未实现完整车辆转向或速度控制。
                </p>
              </>
            ) : (
              <>
                <label className="slider-label" htmlFor="imu-tilt">
                  模拟俯仰角 <output>{tilt}°</output>
                </label>
                <input
                  id="imu-tilt"
                  type="range"
                  min="-40"
                  max="40"
                  step="1"
                  value={tilt}
                  onChange={(e) => change(setTilt, Number(e.target.value))}
                />
                <div className="range-scale">
                  <span>向后倾斜</span>
                  <span>向前倾斜</span>
                </div>
                <p className="experiment-control-note">
                  用静止重力模型生成模拟 Ax/Az；MPU6050 的角速度和加速度不是直接测得的姿态角。
                </p>
              </>
            )}
          </div>
        </section>
        <section className="panel preview-panel">
          <div className="panel-heading">
            <span className="eyebrow">YOUR LITTLE COMPANION</span>
            <span className="live-dot">实时渲染</span>
          </div>
          <div className="preview-world">
            {routeId === 'classic' ? (
              <>
                <div className="preview-orbit" />
                <div className="pet-idle">
                  <Pet color={color} speed={speed} expression={expression} />
                </div>
                <div className="pet-shadow" />
              </>
            ) : (
              <ExperimentPreview
                routeId={routeId}
                angle={angle}
                direction={direction}
                tilt={tilt}
              />
            )}
          </div>
          <div className="preview-caption">
            <span>SPARKMATE / 001</span>
            <h2>
              {routeId !== 'classic'
                ? lesson.title
                : expression === 'sleepy'
                  ? '嘘，它在做一个好梦。'
                  : expression === 'curious'
                    ? '世界好大，一起探索吧。'
                    : '你好呀，我的小小创造者。'}
            </h2>
            <p>实时预览 · 改变默认参数并主动领取后，本路线首次奖励 150 XP。</p>
          </div>
          <div className="telemetry">
            <div>
              <span>{lesson.control}</span>
              <b>
                {routeId === 'classic'
                  ? speed
                  : routeId === 'quadruped'
                    ? angle
                    : routeId === 'tracked'
                      ? direction === 'forward'
                        ? '正转'
                        : direction === 'reverse'
                          ? '反转'
                          : '停止'
                      : tilt}{' '}
                <small>{routeId === 'classic' ? 'ms' : routeId === 'tracked' ? '' : '°'}</small>
              </b>
            </div>
            <div>
              <span>{routeId === 'classic' ? '主题颜色' : '实验硬件'}</span>
              <b style={routeId === 'classic' ? { color } : undefined}>
                {routeId === 'classic'
                  ? color
                  : routeId === 'quadruped'
                    ? 'SG90 × 8'
                    : routeId === 'tracked'
                      ? 'L298N'
                      : 'MPU6050'}
              </b>
            </div>
            <div>
              <span>运行环境</span>
              <b>浏览器模拟</b>
            </div>
          </div>
          <Button
            className="btn primary full"
            disabled={!unlocked || !modified || completed}
            onClick={onComplete}
          >
            <Sparkles size={17} />
            {completed
              ? routeId === 'classic'
                ? '伙伴已唤醒 · 成就已领取'
                : '本路线实验已完成 · 成就已领取'
              : !unlocked
                ? '完成接线后解锁成就'
                : !modified
                  ? routeId === 'classic'
                    ? '先调整一个参数，唤醒你的伙伴'
                    : '先调整一个实验参数'
                  : routeId === 'classic'
                    ? '唤醒伙伴 · 领取 150 XP'
                    : '完成本路线实验 · 领取 150 XP'}
          </Button>
        </section>
      </div>
      <div className="learning-tip">
        <Code2 size={20} />
        <div>
          <b>代码小课堂 · {lesson.title}</b>
          <p>{lesson.tip}</p>
        </div>
      </div>
    </div>
  );
}
