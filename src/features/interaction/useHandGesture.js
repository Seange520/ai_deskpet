import { useCallback, useEffect, useRef, useState } from 'react';
import { requestGestureCamera } from './gestureCamera';
import { createGestureGate } from './gestureGate';
import { usePetActions } from './usePetActions';

export function cameraSupported() {
  try {
    return Boolean(
      globalThis.isSecureContext &&
      navigator.mediaDevices?.getUserMedia &&
      globalThis.Worker &&
      globalThis.WebAssembly &&
      globalThis.createImageBitmap,
    );
  } catch {
    return false;
  }
}

const EMPTY_ENGINE = { delegate: null, webgpuAvailable: false, category: '', fallback: false };

export function useHandGesture() {
  const videoRef = useRef(null);
  const session = useRef(null);
  const [state, setState] = useState({
    ...EMPTY_ENGINE,
    status: 'idle',
    message: '摄像头未开启。',
    disabled: false,
  });
  const stop = useCallback((notify = true) => {
    const current = session.current;
    session.current = null;
    if (current) {
      current.abort.abort();
      clearTimeout(current.timer);
      current.engine?.close();
      for (const track of current.stream?.getTracks?.() || []) {
        track.onended = null;
        track.stop();
      }
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (notify)
      setState((old) => ({ ...old, ...EMPTY_ENGINE, status: 'idle', message: '摄像头已关闭。' }));
  }, []);
  const start = useCallback(async () => {
    if (session.current) return;
    if (!cameraSupported()) {
      setState({
        ...EMPTY_ENGINE,
        status: 'unavailable',
        disabled: true,
        message: '当前环境不支持摄像头手势控制。',
      });
      return;
    }
    const current = { abort: new AbortController(), stream: null, engine: null, timer: null };
    session.current = current;
    const live = () => session.current === current;
    const fail = (error) => {
      if (!live()) return;
      stop(false);
      const denied = ['NotAllowedError', 'SecurityError'].includes(error?.name);
      setState({
        ...EMPTY_ENGINE,
        status: 'unavailable',
        disabled: true,
        message: denied
          ? '未获摄像头授权，手势控制已禁用；可调整权限后刷新。'
          : '手势控制暂不可用，摄像头已关闭；请刷新后重试。',
      });
    };
    setState({
      ...EMPTY_ENGINE,
      status: 'starting',
      disabled: false,
      message: '正在申请摄像头权限…',
    });
    try {
      const stream = await requestGestureCamera(navigator.mediaDevices, live);
      if (!live()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (typeof stream?.getTracks !== 'function') throw new Error('Invalid camera stream');
      current.stream = stream;
      for (const track of stream.getTracks()) track.onended = () => fail(new Error('camera ended'));
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (!live()) return;
      setState({
        ...EMPTY_ENGINE,
        status: 'starting',
        disabled: false,
        message: '正在加载本地手势模型，可随时关闭摄像头…',
      });
      const { createGestureEngine } = await import('./gestureEngine');
      if (!live()) return;
      const engine = await createGestureEngine({
        modelURL: new URL('models/gesture_recognizer.task', document.baseURI).href,
        signal: current.abort.signal,
      });
      if (!live()) {
        engine.close();
        return;
      }
      current.engine = engine;
      const gate = createGestureGate();
      setState({
        ...EMPTY_ENGINE,
        delegate: engine.delegate,
        webgpuAvailable: engine.webgpuAvailable,
        fallback: engine.fallback,
        status: 'running',
        disabled: false,
        message: '识别中：张开手掌跳跃，握拳休眠。',
      });
      let previous = -1;
      const tick = async () => {
        if (!live()) return;
        let nextFrameAt = performance.now() + 100;
        try {
          const video = videoRef.current;
          if (video.readyState >= 2 && video.currentTime !== previous) {
            previous = video.currentTime;
            const bitmap = await createImageBitmap(video, { resizeWidth: 320, resizeHeight: 240 });
            if (!live()) {
              bitmap.close();
              return;
            }
            const timestamp = performance.now();
            nextFrameAt = timestamp + 100;
            const result = await engine.recognize(bitmap, timestamp);
            if (!live()) return;
            const action = gate.update(result.category, result.score, performance.now());
            if (action) usePetActions.getState().trigger(action, 'gesture');
            const category = result.category || '';
            setState((old) => {
              if (!action && old.category === category) return old;
              return {
                ...old,
                category,
                message: action
                  ? action === 'jump'
                    ? '已识别张开手掌：跳跃。'
                    : '已识别握拳：休眠。'
                  : old.message,
              };
            });
          }
          if (live())
            current.timer = setTimeout(
              tick,
              Math.max(0, Math.ceil(nextFrameAt - performance.now())),
            );
        } catch (error) {
          fail(error);
        }
      };
      void tick();
    } catch (error) {
      fail(error);
    }
  }, [stop]);
  useEffect(() => {
    const leave = () => stop();
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', hidden);
      stop(false);
    };
  }, [stop]);
  return { ...state, supported: cameraSupported(), videoRef, start, stop: () => stop() };
}
