import Button from './Button';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Radio, RotateCcw, Check, LockKeyhole, ArrowRight, Sparkles } from 'lucide-react';
import { Pet } from './Visuals';

const themes = [
  { label: '极光青', color: '#00FFD1' },
  { label: '星云紫', color: '#B39AFF' },
  { label: '日落橙', color: '#FFB36B' },
  { label: '樱花粉', color: '#FF8EB7' },
];
export default function CodeLab({ unlocked, completed, onComplete, onHardware }) {
  // 参数作为唯一数据源，同时驱动伪代码文本与右侧 SVG 表情，修改即反馈。
  const [speed, setSpeed] = useState(2400),
    [color, setColor] = useState('#00FFD1'),
    [expression, setExpression] = useState('happy'),
    [modified, setModified] = useState(false);
  function change(fn, value) {
    fn(value);
    setModified(true);
  }
  const lines = [
    ['comment', '// SparkMate 表情实验 · Arduino 风格伪代码'],
    ['comment', '// 参数通过下方控件修改，右侧立即预览'],
    ['keyword', '#include <SparkMateDemo.h>'],
    ['plain', ''],
    ['keyword', 'void setup() {'],
    ['plain', '  pet.begin();'],
    ['value', `  pet.setTheme("${color}");`],
    ['plain', '}'],
    ['plain', ''],
    ['keyword', 'void loop() {'],
    ['value', `  pet.setExpression("${expression}");`],
    ['value', `  pet.blinkEvery(${speed}); // 毫秒`],
    ['plain', '  pet.update(); // 持续刷新'],
    ['plain', '}'],
  ];
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
                  setColor('#00FFD1');
                  setExpression('happy');
                  setModified(false);
                }}
              >
                <RotateCcw size={16} />
              </Button>
            </div>
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
          </div>
        </section>
        <section className="panel preview-panel">
          <div className="panel-heading">
            <span className="eyebrow">YOUR LITTLE COMPANION</span>
            <span className="live-dot">实时渲染</span>
          </div>
          <div className="preview-world">
            <div className="preview-orbit" />
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            >
              <Pet color={color} speed={speed} expression={expression} />
            </motion.div>
            <div className="pet-shadow" />
          </div>
          <div className="preview-caption">
            <span>SPARKMATE / 001</span>
            <h2>
              {expression === 'sleepy'
                ? '嘘，它在做一个好梦。'
                : expression === 'curious'
                  ? '世界好大，一起探索吧。'
                  : '你好呀，我的小小创造者。'}
            </h2>
            <p>你的每一次调整，都会在这里发生。</p>
          </div>
          <div className="telemetry">
            <div>
              <span>眨眼间隔</span>
              <b>
                {speed} <small>ms</small>
              </b>
            </div>
            <div>
              <span>主题颜色</span>
              <b style={{ color }}>{color}</b>
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
              ? '伙伴已唤醒 · 成就已领取'
              : !unlocked
                ? '完成接线后解锁成就'
                : !modified
                  ? '先调整一个参数，唤醒你的伙伴'
                  : '唤醒伙伴 · 领取 150 XP'}
          </Button>
        </section>
      </div>
      <div className="learning-tip">
        <Code2 size={20} />
        <div>
          <b>代码小课堂 · 1000 ms = 1 秒</b>
          <p>
            眨眼间隔越小，眨眼越频繁。这里的 SparkMateDemo.h 与 pet API
            是帮助理解参数的教学伪代码，不能直接编译烧录。此关模拟表情控制；真实 AI
            对话还需要麦克风音频链路、语音识别和模型服务。
          </p>
        </div>
      </div>
    </div>
  );
}
