import { create } from 'zustand';
import { createSerialConnection } from './serialConnection';

// Session-only telemetry; no learning fields, persistence, XP or runtime actions.
export const useHardwareStore = create(() => ({
  status: 'idle',
  hardwareData: null,
  receivedCount: 0,
  invalidLineCount: 0,
  notice: '',
  message: '尚未连接硬件。',
}));

export const hardwareConnection = createSerialConnection({
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
});
