export function createGestureEngine({ modelURL, signal, frameTimeoutMs = 5000 }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./gesture.worker.js', import.meta.url), { type: 'module' });
    let closed = false,
      pending = null;
    const error = () => new Error('MediaPipe unavailable');
    const timeout = setTimeout(() => fail(), 25000);
    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker.terminate();
      if (pending) {
        clearTimeout(pending.timer);
        pending.reject(error());
        pending = null;
      }
    }
    function fail() {
      close();
      reject(error());
    }
    function abort() {
      fail();
    }
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = (event) => {
      event.preventDefault();
      fail();
    };
    worker.onmessageerror = fail;
    worker.onmessage = ({ data }) => {
      if (closed) return;
      if (data.type === 'ready') {
        clearTimeout(timeout);
        resolve({
          recognize(bitmap, timestamp) {
            if (closed || pending) {
              bitmap.close();
              return Promise.reject(error());
            }
            return new Promise((resolve, reject) => {
              pending = { resolve, reject, timer: setTimeout(fail, frameTimeoutMs) };
              try {
                worker.postMessage({ type: 'frame', bitmap, timestamp }, [bitmap]);
              } catch {
                bitmap.close();
                clearTimeout(pending.timer);
                pending = null;
                reject(error());
              }
            });
          },
          close,
        });
      } else if (data.type === 'result' && pending) {
        const request = pending;
        clearTimeout(request.timer);
        pending = null;
        request.resolve(data);
      } else if (data.type === 'error') fail();
    };
    if (signal.aborted) abort();
    else worker.postMessage({ type: 'init', modelURL });
  });
}
