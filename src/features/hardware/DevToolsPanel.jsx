import { useState } from 'react';
import Button from '../../components/Button';
import { hardwareConnection, useHardwareStore } from './useHardwareStore';
import './dev-tools.css';

// 未来所有与底层调试、Mock 测试相关的功能（如自定义数据注入、跳过任务、真实固件烧录等）统一接入此面板。
// This is a session-only discovery gate, not authorization for privileged operations.
export default function DevToolsPanel({ onClose }) {
  const { status, source, notice, message } = useHardwareStore();
  const [virtualPort, setVirtualPort] = useState(8765);
  const active = source === 'virtual';
  const connected = status === 'connected';
  const busy = ['requesting', 'connecting', 'disconnecting'].includes(status);
  return (
    <section className="dev-tools" aria-labelledby="dev-tools-title">
      <div className="dev-tools-heading">
        <div>
          <span className="eyebrow">DEVELOPER · 仅当前页面</span>
          <h3 id="dev-tools-title">开发者调试</h3>
        </div>
        <Button className="btn" onClick={onClose}>
          关闭开发者调试
        </Button>
      </div>
      <p className="hardware-connection-help">
        Node 桥接仅供本机调试。先手动运行 <code>node scripts/virtual-esp32.mjs</code>，
        再连接对应端口；本面板不会启动服务或发送设备控制命令。
      </p>
      <div className="hardware-connection-actions">
        <label>
          虚拟端口
          <input
            aria-label="虚拟光感端口"
            type="number"
            min="1024"
            max="65535"
            value={virtualPort}
            disabled={busy || connected}
            onChange={(event) => setVirtualPort(Number(event.target.value))}
          />
        </label>
        <Button
          className="btn"
          disabled={busy || connected}
          onClick={() => {
            void hardwareConnection.connectVirtual(virtualPort);
          }}
        >
          连接虚拟光感
        </Button>
        {active && (connected || busy) && (
          <Button
            className="btn"
            disabled={status === 'disconnecting'}
            onClick={() => {
              void hardwareConnection.disconnect();
            }}
          >
            {connected ? '断开硬件连接' : '取消硬件连接'}
          </Button>
        )}
      </div>
      <p
        className={
          'hardware-connection-status ' + (active && status === 'error' ? 'has-error' : '')
        }
        aria-live="polite"
        data-testid="dev-tools-status"
      >
        {active ? message : 'Node 桥接尚未连接；与真实 USB、浏览器演示互斥。'}
      </p>
      {active && notice && (
        <p className="hardware-connection-notice" aria-live="polite">
          {notice}
        </p>
      )}
    </section>
  );
}
