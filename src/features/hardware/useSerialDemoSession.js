import { useCallback, useEffect, useRef, useState } from 'react';
import { hardwareConnection, useHardwareStore } from './useHardwareStore';
import { createSerialDemoSession } from './serialDemoSession';

export function useSerialDemoSession(enabled) {
  const [session, setSession] = useState({ samples: [], events: [] });
  const observer = useRef(null);
  const [paused, setPaused] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [unplugged, setUnplugged] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setSession({ samples: [], events: [] });
      setPaused(false);
      setRecovery(null);
      return;
    }
    let invalidCount = 0, receivedCount = 0;
    const current = createSerialDemoSession(useHardwareStore, (next) => {
      setSession(next);
      const state = useHardwareStore.getState();
      if (state.notice && state.invalidLineCount > invalidCount) {
        invalidCount = state.invalidLineCount;
        setRecovery('invalid');
      } else if (invalidCount > 0 && state.receivedCount > receivedCount && !state.notice) {
        setRecovery('recovered');
      }
      receivedCount = state.receivedCount;
    });
    observer.current = current;
    return () => {
      observer.current = null;
      current.dispose();
    };
  }, [enabled]);
  const sendLight = useCallback((light) => {
    const accepted = hardwareConnection.setDemoLight(light);
    observer.current?.recordCommand(light, accepted);
    return accepted;
  }, []);
  const pauseReporting = useCallback((value) => {
    const accepted = hardwareConnection.pauseDemo(value);
    if (accepted) {
      setPaused(value);
      observer.current?.recordEvent(value ? '已暂停上报，连接与最后读数保留。' : '已恢复上报。');
    }
    return accepted;
  }, []);
  const injectInvalid = useCallback(() => {
    const accepted = hardwareConnection.injectDemoInvalid();
    observer.current?.recordEvent(accepted ? '已注入非法数据行，等待解码器校验。' : '非法数据注入未执行，请先恢复上报。', accepted ? 'simulator' : 'warning');
    return accepted;
  }, []);
  const unplug = useCallback(async () => {
    const state = useHardwareStore.getState();
    if (state.source !== 'demo' || state.status !== 'connected') return false;
    setUnplugged(true);
    await hardwareConnection.disconnect();
    return true;
  }, []);
  const connect = useCallback(() => {
    setUnplugged(false);
    return hardwareConnection.connectDemo();
  }, []);
  return { ...session, sendLight, paused, recovery, unplugged, pauseReporting, injectInvalid, unplug, connect };
}
