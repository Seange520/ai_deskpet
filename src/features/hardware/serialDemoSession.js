// Each observer is owned by one hook instance; no module-level session state.
export function createSerialDemoSession(store, onChange) {
  let samples = [], events = [], sequence = 0, disposed = false;
  const event = (kind, message, at = Date.now()) => ({ id: ++sequence, kind, message, at });
  const publish = () => onChange({ samples, events });
  function observe(state, previous = {}) {
    if (state.source !== 'demo' || ['idle', 'disconnecting'].includes(state.status)) {
      if (samples.length || events.length) { samples = []; events = []; publish(); }
      return;
    }
    if (state.status === 'requesting' && previous.status !== 'requesting') {
      samples = []; events = []; sequence = 0;
    }
    const incoming = [];
    if (state.status !== previous.status) {
      if (['requesting', 'connecting'].includes(state.status)) incoming.push(event('simulator', '正在初始化浏览器演示数据流。'));
      if (state.status === 'connected') incoming.push(event('simulator', '演示数据流已连接。'));
      if (state.status === 'error') incoming.push(event('warning', state.message || '演示连接发生异常。'));
    }
    if (state.status === 'connected' && state.hardwareData &&
        (state.hardwareData !== previous.hardwareData || state.receivedCount !== previous.receivedCount)) {
      const { light, receivedAt } = state.hardwareData;
      samples = [...samples, { id: ++sequence, light, receivedAt }].slice(-60);
      incoming.push(event('telemetry', `收到 light: ${light}`, receivedAt));
    }
    if (state.notice && state.invalidLineCount !== previous.invalidLineCount)
      incoming.push(event('warning', state.notice));
    if (incoming.length) {
      events = [...events, ...incoming].slice(-40);
      publish();
    }
  }
  const unsubscribe = store.subscribe(observe);
  observe(store.getState());
  return {
    recordCommand(light, accepted) {
      if (disposed) return;
      const state = store.getState();
      if (state.source !== 'demo' || state.status !== 'connected') return;
      events = [...events, event(accepted ? 'simulator' : 'warning', accepted
        ? `${light === 50 ? '遮住光感' : '恢复光照'}：模拟发送 ${JSON.stringify({ light })}`
        : '模拟发送未执行，请检查演示连接。')].slice(-40);
      publish();
    },
    recordEvent(message, kind = 'simulator') {
      if (disposed) return;
      const state = store.getState();
      if (state.source !== 'demo' || state.status !== 'connected') return;
      events = [...events, event(kind, message)].slice(-40);
      publish();
    },
    dispose() {
      disposed = true;
      unsubscribe();
      samples = []; events = [];
    },
  };
}
