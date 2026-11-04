// In-memory Serial-compatible source. Never opens USB, fetches, or writes a port.
export function createBrowserDemoSerialProvider({
  timers = globalThis,
  visibility = globalThis.document,
} = {}) {
  const encoder = new TextEncoder();
  let light = 300;
  let readable = null;
  let controller = null;
  let startupTimer = null;
  let sampleTimer = null;
  let rejectOpen = null;
  let paused = false;
  let opened = false;
  let closed = false;
  let listening = false;

  function stopSampling() {
    if (sampleTimer !== null) timers.clearTimeout(sampleTimer);
    sampleTimer = null;
  }
  function emit() {
    if (!opened || closed || paused || visibility?.hidden || !controller) return;
    // At most one unread chunk: a stalled reader must not grow the queue.
    if (controller.desiredSize > 0)
      controller.enqueue(encoder.encode(JSON.stringify({ light }) + '\n'));
  }
  function schedule() {
    stopSampling();
    if (!opened || closed || paused || visibility?.hidden) return;
    sampleTimer = timers.setTimeout(() => {
      sampleTimer = null;
      emit();
      schedule();
    }, 1000);
  }
  function onVisibility() {
    stopSampling();
    if (!visibility.hidden) {
      emit();
      schedule();
    }
  }
  function dispose() {
    closed = true;
    opened = false;
    stopSampling();
    if (startupTimer !== null) timers.clearTimeout(startupTimer);
    startupTimer = null;
    if (listening) visibility.removeEventListener('visibilitychange', onVisibility);
    listening = false;
    const reject = rejectOpen;
    rejectOpen = null;
    reject?.(new DOMException('Demo cancelled', 'AbortError'));
    if (controller) {
      try { controller.close(); } catch { /* stream already cancelled */ }
      controller = null;
    }
  }
  const port = {
    get readable() { return readable; },
    open() {
      if (closed || opened || rejectOpen)
        return Promise.reject(new DOMException('Demo unavailable', 'InvalidStateError'));
      return new Promise((resolve, reject) => {
        rejectOpen = reject;
        startupTimer = timers.setTimeout(() => {
          startupTimer = null;
          rejectOpen = null;
          try {
            readable = new ReadableStream({
              start(streamController) { controller = streamController; },
              cancel: dispose,
            });
            opened = true;
            if (visibility) {
              visibility.addEventListener('visibilitychange', onVisibility);
              listening = true;
            }
            emit();
            schedule();
            resolve();
          } catch (error) {
            dispose();
            reject(error);
          }
        }, 300);
      });
    },
    cancelOpen: dispose,
    async close() { dispose(); },
  };
  return {
    requestPort: async () => port,
    setLight(value) {
      if (!opened || closed || ![50, 300].includes(value)) return false;
      light = value;
      emit();
      return true;
    },
    setPaused(value) {
      if (!opened || closed || typeof value !== 'boolean') return false;
      paused = value;
      stopSampling();
      if (!paused) { emit(); schedule(); }
      return true;
    },
    injectInvalidLine() {
      if (!opened || closed || paused || visibility?.hidden || !controller || controller.desiredSize <= 0) return false;
      stopSampling();
      controller.enqueue(encoder.encode('error\n'));
      // The next ordinary sample recovers through the unchanged shared decoder.
      schedule();
      return true;
    },
    dispose,
  };
}
