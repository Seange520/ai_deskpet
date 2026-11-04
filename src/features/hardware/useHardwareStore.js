import { create } from 'zustand';
import { createSerialConnection } from './serialConnection';
import { createVirtualSerialProvider } from './virtualSerial';

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
  onState: (patch) => useHardwareStore.setState(patch),
  onData: (hardwareData) =>
    useHardwareStore.setState((state) => ({
      hardwareData,
      receivedCount: state.receivedCount + 1,
      notice: '',
      message: '正在接收设备数据。',
    })),
  onInvalid: (notice) =>
    useHardwareStore.setState((state) => ({
      notice,
      invalidLineCount: state.invalidLineCount + 1,
    })),
};

const serial = createSerialConnection(callbacks);
let virtual = null;
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
  async disconnect() {
    await Promise.all([serial.disconnect(), virtual?.disconnect()]);
  },
};
