import { useEffect, useRef, useState } from 'react';
import Button from '../../components/Button';
import { getBrowserSerial } from './serialConnection';
import { hardwareConnection, useHardwareStore } from './useHardwareStore';
import './hardware.css';
import BrowserDemoPanel from './BrowserDemoPanel';
import DevToolsPanel from './DevToolsPanel';

export default function HardwareConnectionPanel() {
  const supported = Boolean(getBrowserSerial());
  const { status, source, hardwareData, receivedCount, notice, message } = useHardwareStore();
  const [baudRate, setBaudRate] = useState(115200);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const titleClicks = useRef({ count: 0, lastAt: 0 });
  const titleRef = useRef(null);
  const connected = status === 'connected';
  const busy = ['requesting', 'connecting', 'disconnecting'].includes(status);
  const virtual = source === 'virtual';
  const ordinaryMessage = supported
    ? '尚未连接硬件。'
    : '当前设备不支持 USB 连接，请在电脑端体验。当前环境不支持硬件连接（USB 串口），可直接体验浏览器光感演示。';
  function revealFromTitle() {
    const now = performance.now();
    const previous = titleClicks.current;
    const count = now - previous.lastAt <= 1500 ? previous.count + 1 : 1;
    titleClicks.current = { count, lastAt: now };
    if (count === 5) {
      titleClicks.current.count = 0;
      setDevToolsOpen(true);
    }
  }
  function closeDevTools() {
    // Do not leave an invisible Node session running after its controls are hidden.
    if (virtual) void hardwareConnection.disconnect();
    titleClicks.current = { count: 0, lastAt: 0 };
    setDevToolsOpen(false);
    titleRef.current?.focus();
  }
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
    <section
      className="panel hardware-connection"
      aria-label="真实硬件连接"
      onKeyDown={(event) => {
        if (
          event.ctrlKey &&
          event.shiftKey &&
          !event.altKey &&
          !event.metaKey &&
          event.key.toLowerCase() === 'd' &&
          !event.repeat
        ) {
          event.preventDefault();
          setDevToolsOpen(true);
        }
      }}
    >
      <div className="hardware-connection-heading">
        <div>
          <span className="eyebrow">USB SERIAL · 只读数据</span>
          <h2 aria-label="连接真实 ESP32">
            <button
              ref={titleRef}
              type="button"
              aria-label="硬件面板标题"
              className="hardware-title-trigger"
              onClick={revealFromTitle}
            >
              连接真实 ESP32
            </button>
          </h2>
        </div>
        <div className="hardware-connection-actions !grid !w-full !grid-cols-1 sm:!grid-cols-2 lg:!flex lg:!w-auto">
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
          {!virtual && (connected || busy) && (
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
      <BrowserDemoPanel />
      <p className="hardware-connection-help">
        USB 接收真实 ESP32 读数；没有硬件也可直接开启上方的浏览器光感演示。离开誊写房后断开连接。
      </p>
      <p
        className={
          'hardware-connection-status ' + (!virtual && status === 'error' ? 'has-error' : '')
        }
        aria-live="polite"
        data-testid="hardware-connection-status"
      >
        {virtual ? ordinaryMessage : supported || source === 'demo' ? message : ordinaryMessage}
      </p>
      {!virtual && notice && (
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
      {devToolsOpen && <DevToolsPanel onClose={closeDevTools} />}
    </section>
  );
}
