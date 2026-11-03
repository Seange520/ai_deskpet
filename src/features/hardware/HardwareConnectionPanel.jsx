import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { getBrowserSerial } from './serialConnection';
import { hardwareConnection, useHardwareStore } from './useHardwareStore';
import './hardware.css';

export default function HardwareConnectionPanel() {
  const supported = Boolean(getBrowserSerial());
  const { status, hardwareData, receivedCount, notice, message } = useHardwareStore();
  const [baudRate, setBaudRate] = useState(115200);
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
        通过 USB 选择串口后读取温度和光照。设备需发送 UTF-8 JSON 行，例如{' '}
        {'{"temp":25,"light":300}'}。 仅读取数据，不烧录或下发控制指令；离开代码工坊后断开连接。
      </p>
      <p
        className={'hardware-connection-status ' + (status === 'error' ? 'has-error' : '')}
        aria-live="polite"
        data-testid="hardware-connection-status"
      >
        {supported
          ? message
          : '当前浏览器或环境不支持硬件连接，请使用支持 Web Serial 的桌面浏览器，并通过 HTTPS 或本地开发地址打开。'}
      </p>
      {notice && (
        <p className="hardware-connection-notice" aria-live="polite">
          {notice}
        </p>
      )}
      <dl className="hardware-readings">
        <div>
          <dt>温度（℃）</dt>
          <dd data-testid="hardware-temp">{hardwareData ? hardwareData.temp : '—'}</dd>
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
