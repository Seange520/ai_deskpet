import Button from '../../components/Button';
import './browser-demo-scenarios.css';

export default function BrowserDemoScenarios({ session }) {
  return (
    <details className="demo-scenarios">
      <summary>演示场景</summary>
      <p>仅作用于浏览器模拟数据，不操作真实 USB 或 Node 桥接。</p>
      <div className="demo-scenario-actions">
        <Button className="btn" onClick={() => session.pauseReporting(!session.paused)}>
          {session.paused ? '恢复上报' : '暂停上报'}
        </Button>
        <Button className="btn" onClick={() => { void session.unplug(); }}>模拟拔线</Button>
        <Button className="btn" disabled={session.paused} onClick={session.injectInvalid}>非法数据后恢复</Button>
      </div>
      <p className="demo-scenario-result" aria-live="polite">
        {session.paused ? '数据暂未更新：已暂停上报，连接与最后读数保留。'
          : session.recovery === 'invalid' ? '已忽略非法数据，等待下一条合法数据。'
            : session.recovery === 'recovered' ? '已恢复正常：收到下一条合法数据。'
              : '暂停保留读数；拔线清空会话；非法行由原解码器拦截后恢复。'}
      </p>
    </details>
  );
}
