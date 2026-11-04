import { useRef, useState } from 'react';
import { ChevronDown, Code2, Copy } from 'lucide-react';
import Button from '../../components/Button';
import { ESP32_FIRMWARE } from './esp32Firmware';
import './firmware.css';

export default function FirmwareGeneratorPanel() {
  const code = useRef(null);
  const [copyStatus, setCopyStatus] = useState('idle');
  async function copyFirmware() {
    setCopyStatus('copying');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(ESP32_FIRMWARE);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
      code.current?.focus();
      const selection = window.getSelection();
      if (selection && code.current) {
        const range = document.createRange();
        range.selectNodeContents(code.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
  return (
    <details className="panel firmware-generator" data-testid="firmware-generator">
      <summary>
        <Code2 size={18} aria-hidden="true" />
        <span>获取 ESP32 固件代码</span>
        <ChevronDown size={18} className="firmware-chevron" aria-hidden="true" />
      </summary>
      <div className="firmware-content">
        <p className="firmware-guide">
          1. 复制代码到 Arduino IDE；2. 烧录到 ESP32；3. 连接 USB；4. 在上方点击连接。
        </p>
        <p className="firmware-note">
          在 Arduino IDE 中选择对应的 ESP32 开发板和端口。示例无需传感器，每秒发送模拟光照 300、温度
          25℃， 上方串口波特率请选择 115200。连接网页前先关闭 IDE 串口监视器，释放端口。
        </p>
        <div className="firmware-toolbar">
          <span>sparkmate_telemetry.ino · 模拟数据</span>
          <Button className="btn" disabled={copyStatus === 'copying'} onClick={copyFirmware}>
            <Copy size={15} aria-hidden="true" />
            {copyStatus === 'copying' ? '复制中…' : '一键复制固件代码'}
          </Button>
        </div>
        <pre ref={code} className="firmware-code" tabIndex={0} aria-label="ESP32 Arduino 固件代码">
          <code>{ESP32_FIRMWARE}</code>
        </pre>
        <p className="firmware-status" role="status">
          {copyStatus === 'copied'
            ? '固件代码已复制，可粘贴到 Arduino IDE。'
            : copyStatus === 'failed'
              ? '自动复制不可用，已选中代码，请按 Ctrl+C / ⌘C，或长按复制。'
              : '仅生成代码文本；烧录请在 Arduino IDE 中完成。'}
        </p>
      </div>
    </details>
  );
}
