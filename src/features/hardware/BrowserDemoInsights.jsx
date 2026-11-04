import { useMemo } from 'react';
import './browser-demo-insights.css';

const kinds = { simulator: '模拟器事件', telemetry: '已解析遥测', warning: '异常提示' };
const timeFormat = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export default function BrowserDemoInsights({ samples, events }) {
  const chart = useMemo(() => {
    const ceiling = Math.max(350, ...samples.map((sample) => Math.ceil(sample.light / 50) * 50));
    const points = samples.map((sample, index) => ({
      ...sample,
      x: 38 + (index / Math.max(1, samples.length - 1)) * 420,
      y: 130 - (sample.light / ceiling) * 110,
    }));
    return { ceiling, points, line: points.map((point) => `${point.x},${point.y}`).join(' ') };
  }, [samples]);
  const latest = samples.at(-1);
  const lastPoint = chart.points.at(-1);
  return (
    <div className="demo-insights">
      <section className="demo-wave" aria-labelledby="demo-wave-title" data-sample-count={samples.length}>
        <h4 id="demo-wave-title">光照波形 · 原始读数</h4>
        <p className="demo-insight-caption">最近 {samples.length} / 60 个样本 · 按采样顺序排列</p>
        <svg className="demo-wave-svg" viewBox="0 0 480 160" role="img"
          aria-label={`光照原始读数波形，${samples.length} 个样本，最新 ${latest?.light ?? '暂无'}`}>
          <title>浏览器模拟光照原始读数</title>
          {[20, 75, 130].map((y) => <line key={y} x1="38" x2="458" y1={y} y2={y} className="demo-wave-grid" />)}
          <text x="4" y="24">{chart.ceiling}</text><text x="4" y="134">0</text>
          <text x="38" y="153">最早样本</text><text x="458" y="153" textAnchor="end">最新样本</text>
          {samples.length > 1 && <polyline className="demo-wave-line" points={chart.line} />}
          {lastPoint && <circle className="demo-wave-dot" cx={lastPoint.x} cy={lastPoint.y} r="3" />}
        </svg>
        <p className="demo-wave-latest">最新原始读数 <span className="demo-wave-value">{latest?.light ?? '—'}</span></p>
      </section>
      <section className="demo-events" aria-labelledby="demo-events-title" data-event-count={events.length}>
        <h4 id="demo-events-title">演示事件日志</h4>
        <p className="demo-insight-caption">模拟器事件 / 已解析遥测 / 异常提示 · 最新在前 · 最多 40 行</p>
        <ol className="demo-event-list" aria-label="演示会话事件" aria-live="off">
          {[...events].reverse().map((entry) => (
            <li key={entry.id} className="demo-event-row" data-kind={entry.kind} data-event-id={entry.id}>
              <span className="demo-event-kind">{kinds[entry.kind]}</span>
              <time dateTime={new Date(entry.at).toISOString()}>{timeFormat.format(entry.at)}</time>
              <code>{entry.message}</code>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
