import { create } from 'zustand';
import { useHardwareTelemetry } from '../../store/useHardwareTelemetry';
import { createSerialConnection } from './serialConnection';
import { createVirtualSerialProvider } from './virtualSerial';
import { createBrowserDemoSerialProvider } from './browserDemoSerial';

// Session-only telemetry; no learning fields, persistence, XP or runtime actions.
export const useHardwareStore = create(() => ({
  status: 'idle',
  source: null,
  hardwareData: null,
  receivedCount: 0,
  invalidLineCount: 0,
  notice: '',
  message: '尚未连接硬件。',
}));

const callbacks = {
  onState(patch) {
    useHardwareTelemetry.getState().setConnection(patch.status === 'connected');
    useHardwareStore.setState(patch);
  },
  onData({ sound, ...hardwareData }) {
    useHardwareTelemetry.getState().ingest({ light: hardwareData.light, sound });
    // The existing readings and demo history only display light/temperature packets.
    if (!Number.isFinite(hardwareData.light)) return;
    useHardwareStore.setState((state) => ({
      hardwareData,
      receivedCount: state.receivedCount + 1,
      notice: '',
      message: state.source === 'demo' ? '正在接收浏览器模拟数据。' : '正在接收设备数据。',
    }));
  },
  onInvalid: (notice) =>
    useHardwareStore.setState((state) => ({
      notice,
      invalidLineCount: state.invalidLineCount + 1,
    })),
};

const serial = createSerialConnection(callbacks);
let virtual = null;
let demo = null;
let demoProvider = null;
const busy = () =>
  ['requesting', 'connecting', 'connected', 'disconnecting'].includes(
    useHardwareStore.getState().status,
  );
export const hardwareConnection = {
  connect(options) {
    if (busy()) return Promise.resolve(false);
    useHardwareStore.setState({ source: 'serial' });
    return serial.connect(options);
  },
  connectVirtual(port = 8765) {
    if (busy()) return Promise.resolve(false);
    useHardwareStore.setState({ source: 'virtual' });
    virtual = createSerialConnection({
      ...callbacks,
      getSerial: () => createVirtualSerialProvider(port),
      onState: (patch) => {
        const message =
          patch.status === 'connected'
            ? '虚拟光感已连接，正在接收本地模拟数据。'
            : ['requesting', 'connecting'].includes(patch.status)
              ? '正在连接本地虚拟光感…'
              : patch.status === 'error'
                ? '本地虚拟光感不可用，请检查模拟器是否启动、端口及浏览器连接权限。'
                : patch.message;
        callbacks.onState({ ...patch, message });
      },
    });
    return virtual.connect();
  },
  connectDemo() {
    if (busy()) return Promise.resolve(false);
    useHardwareStore.setState({ source: 'demo' });
    const provider = createBrowserDemoSerialProvider();
    demoProvider = provider;
    demo = createSerialConnection({
      ...callbacks,
      getSerial: () => provider,
      onState: (patch) => {
        const messages = {
          requesting: '正在初始化浏览器模拟数据流…',
          connecting: '正在初始化浏览器模拟数据流…',
          connected: '浏览器模拟数据流已连接，等待首包…',
          disconnecting: '正在结束浏览器演示…',
          idle: '浏览器演示已结束，模拟读数已清空。',
          error: '浏览器模拟数据流不可用，请重新开启演示。',
        };
        callbacks.onState({ ...patch, message: messages[patch.status] ?? patch.message });
      },
    });
    return demo.connect();
  },
  setDemoLight(light) {
    const state = useHardwareStore.getState();
    if (state.source !== 'demo' || state.status !== 'connected') return false;
    return demoProvider?.setLight(light) ?? false;
  },
  pauseDemo(paused) {
    const state = useHardwareStore.getState();
    if (state.source !== 'demo' || state.status !== 'connected') return false;
    return demoProvider?.setPaused(paused) ?? false;
  },
  injectDemoInvalid() {
    const state = useHardwareStore.getState();
    if (state.source !== 'demo' || state.status !== 'connected') return false;
    return demoProvider?.injectInvalidLine() ?? false;
  },
  async disconnect() {
    const connection = demo;
    const provider = demoProvider;
    await Promise.all([serial.disconnect(), virtual?.disconnect(), connection?.disconnect()]);
    provider?.dispose();
    if (demo === connection) {
      demo = null;
      demoProvider = null;
    }
  },
};
