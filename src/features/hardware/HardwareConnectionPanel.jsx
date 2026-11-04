import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { getBrowserSerial } from './serialConnection';
import { hardwareConnection, useHardwareStore } from './useHardwareStore';
import './hardware.css';

export default function HardwareConnectionPanel() {
  const supported = Boolean(getBrowserSerial());
  const { status, source, hardwareData, receivedCount, notice, message } = useHardwareStore();
  const [baudRate, setBaudRate] = useState(115200);
  const [virtualPort, setVirtualPort] = useState(8765);
  const connected = status === 'connected';
  const busy = ['requesting', 'connecting', 'disconnecting'].includes(status);
  useEffect(() => {
    const close = () => {
      void hardwareConnection.disconnect();
    };
    window.addEventListener('pagehide', close);
    return () => {
      window.removeEventListener('pagehide', close);
      close();
    };
  }, []);
  return (
    <section className="panel hardware-connection" aria-label="真实硬件连接">
      <div className="hardware-connection-heading">
        <div>
          <span className="eyebrow">USB SERIAL · 只读数据</span>
          <h2>连接真实 ESP32</h2>
        </div>
        <div className="hardware-connection-actions">
          <label>
            波特率
            <select
              aria-label="串口波特率"
              value={baudRate}
              disabled={!supported || busy || connected}
              onChange={(event) => setBaudRate(Number(event.target.value))}
            >
              <option value={115200}>115200</option>
              <option value={9600}>9600</option>
            </select>
          </label>
          <Button
            className="btn primary"
            disabled={!supported || busy || connected}
            onClick={() => {
              void hardwareConnection.connect({ baudRate });
            }}
          >
            连接真实 ESP32
          </Button>
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
          {(connected || busy) && (
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
      </div>
      <p className="hardware-connection-help">
        USB 接收真实读数；虚拟光感接收本机 Node 模拟器数据并驱动暗光休眠。支持 {'{"light":300}'} 或{' '}
        {'{"temp":25,"light":300}'}。 虚拟模拟器：node
        scripts/virtual-esp32.mjs。离开代码工坊后断开连接。
      </p>
      <p
        className={'hardware-connection-status ' + (status === 'error' ? 'has-error' : '')}
        aria-live="polite"
        data-testid="hardware-connection-status"
      >
        {supported || source === 'virtual'
          ? message
          : '当前浏览器或环境不支持硬件连接（USB 串口），可使用本地虚拟光感。'}
      </p>
      {notice && (
        <p className="hardware-connection-notice" aria-live="polite">
          {notice}
        </p>
      )}
      <dl className="hardware-readings">
        <div>
          <dt>温度（℃）</dt>
          <dd data-testid="hardware-temp">{hardwareData?.temp ?? '—'}</dd>
        </div>
        <div>
          <dt>光照读数</dt>
          <dd data-testid="hardware-light">{hardwareData ? hardwareData.light : '—'}</dd>
        </div>
        <div>
          <dt>本次接收</dt>
          <dd data-testid="hardware-received">{receivedCount} 条</dd>
        </div>
      </dl>
    </section>
  );
}
