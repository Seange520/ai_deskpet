import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

export function rendererTier(model) {
  if (
    /swiftshader|llvmpipe|softpipe|microsoft basic render|software rasterizer|intel.*(?:hd|uhd) graphics/i.test(
      model,
    )
  )
    return 1;
  if (/nvidia|geforce|radeon|apple m\d|intel.*(?:iris|arc)|adreno|mali|powervr/i.test(model))
    return 2;
  return null;
}

function webglRenderer(gl) {
  try {
    const context = gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    return debug ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL) || '') : '';
  } catch {
    return '';
  }
}

// Probe the existing Stage context. The optional adapter is identification only.
export function useDeviceDetect({ paused, onRenderer, onSample }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const [fallback, setFallback] = useState(false);
  const frames = useRef({ count: 0, start: 0, done: false });

  useEffect(() => {
    let active = true;
    const renderer = rendererTier(webglRenderer(gl));
    if (renderer !== null) onRenderer(renderer);
    let timer;
    const adapter = async () => {
      try {
        const device = await navigator.gpu?.requestAdapter();
        const info = device?.info;
        return info
          ? rendererTier([info.vendor, info.architecture, info.device, info.description].join(' '))
          : null;
      } catch {
        return null;
      }
    };
    const limit = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), 500);
    });
    Promise.race([adapter(), limit]).then((tier) => {
      clearTimeout(timer);
      if (!active || renderer !== null) return;
      if (tier === null) setFallback(true);
      else onRenderer(tier);
    });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [gl, onRenderer]);

  useEffect(() => {
    if (frames.current.done) return;
    frames.current.count = 0;
    if (!paused) invalidate();
  }, [paused, invalidate]);

  useFrame(() => {
    const sample = frames.current;
    if (paused || sample.done) return;
    const now = performance.now();
    if (sample.count === 0) sample.start = now;
    sample.count += 1;
    if (sample.count === 120) {
      sample.done = true;
      onSample(119_000 / Math.max(1, now - sample.start));
    } else invalidate();
  });

  return fallback;
}
