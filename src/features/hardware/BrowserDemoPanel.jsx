import Button from '../../components/Button';
import { hardwareConnection, useHardwareStore } from './useHardwareStore';
import './browser-demo.css';
import { useSerialDemoSession } from './useSerialDemoSession';
import BrowserDemoInsights from './BrowserDemoInsights';
import BrowserDemoScenarios from './BrowserDemoScenarios';

export default function BrowserDemoPanel() {
  const { source, status, hardwareData, receivedCount } = useHardwareStore();
  const supported = typeof ReadableStream === 'function' && typeof TextEncoder === 'function';
  const active = source === 'demo';
  const running = active && status === 'connected';
  const starting = active && ['requesting', 'connecting'].includes(status);
  const blocked = ['requesting', 'connecting', 'connected', 'disconnecting'].includes(status);
  const receiving = running && Boolean(hardwareData);
  const showInsights = active && ['requesting', 'connecting', 'connected', 'error'].includes(status);
  const session = useSerialDemoSession(showInsights);
  const feedback = !supported
    ? '当前环境不支持浏览器演示。'
    : starting
      ? '正在初始化浏览器模拟数据流…'
      : receiving && session.paused
        ? '浏览器模拟数据：数据暂未更新（暂停上报，连接保持）。'
        : receiving
        ? '浏览器模拟数据：正在接收。'
        : running
          ? '浏览器模拟数据流已就绪，等待首包…'
          : active && status === 'disconnecting'
            ? '正在结束浏览器演示…'
            : active && status === 'error'
              ? '浏览器演示暂不可用，请重新开启。'
              : blocked
                ? '其他硬件连接正在使用中，请先断开后再开启演示。'
                : active && session.unplugged
                  ? '模拟设备已拔出，读数与历史已清空，请重新连接。'
                  : active
                  ? '演示已结束，浏览器模拟读数已清空。'
                  : '尚未开启演示，不会申请 USB 或摄像头权限。';

  return (
    <section className="browser-demo" aria-labelledby="browser-demo-title">
      <div className="browser-demo-heading">
        <div>
          <span className="browser-demo-label">浏览器模拟数据 · 无需硬件</span>
          <h3 id="browser-demo-title">浏览器光感演示</h3>
        </div>
        <div className="browser-demo-actions">
          <Button className="btn" disabled={!supported || blocked}
            onClick={() => { void session.connect(); }}>
            {active && session.unplugged ? '重新连接浏览器演示' : '开启浏览器演示'}
          </Button>
          {active && blocked && (
            <Button className="btn" disabled={status === 'disconnecting'}
              onClick={() => { void hardwareConnection.disconnect(); }}>
              {starting ? '取消浏览器演示' : '结束浏览器演示'}
            </Button>
          )}
        </div>
      </div>
      <p className="browser-demo-help">无需启动本地模拟器。遮住光感，观察读数与桌宠的暗光休眠联动。</p>
      <div className="browser-demo-controls">
        <div>
          <Button className="btn" disabled={!receiving || session.paused} aria-pressed={receiving && hardwareData.light === 50}
            onClick={() => session.sendLight(50)}>遮住光感</Button>
          <code>模拟发送 {'{"light":50}'}</code>
        </div>
        <div>
          <Button className="btn" disabled={!receiving || session.paused} aria-pressed={receiving && hardwareData.light === 300}
            onClick={() => session.sendLight(300)}>恢复光照</Button>
          <code>模拟发送 {'{"light":300}'}</code>
        </div>
      </div>
      <p className="browser-demo-feedback">
        <span key={active ? receivedCount : 0} aria-hidden="true"
          className={`browser-demo-indicator ${receiving ? 'is-receiving' : ''}`} />
        <span role="status">{feedback}</span>
      </p>
      {running && <BrowserDemoScenarios session={session} />}
      {showInsights && <BrowserDemoInsights samples={session.samples} events={session.events} />}
    </section>
  );
}
