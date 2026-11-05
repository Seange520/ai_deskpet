import { useEffect, useRef } from 'react';
import { vertexShader, fragmentShader } from './auroraShader';

// A decorative WebGL2 context, independent of the companion's existing renderer.
export default function AuroraField({ active, reducedMotion }) {
  const ref = useRef(null),
    controls = useRef(null);
  const mode = useRef({ active, reducedMotion });
  mode.current = { active, reducedMotion };
  useEffect(() => {
    const canvas = ref.current;
    let gl,
      program,
      observer,
      frame = 0,
      elapsed = 0,
      last = 0,
      previous = 0;
    let failed = false,
      staticDrawn = false;
    const shaders = [];
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      previous = 0;
    };
    const fallback = () => {
      stop();
      failed = true;
      canvas.dataset.state = 'fallback';
      canvas.hidden = true;
    };
    const lost = (event) => {
      event.preventDefault();
      fallback();
    };
    canvas.addEventListener('webglcontextlost', lost);
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });
      if (!gl) throw new Error('WebGL2 unavailable');
      program = gl.createProgram();
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertexShader],
        [gl.FRAGMENT_SHADER, fragmentShader],
      ]) {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error('Aurora shader unavailable');
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error('Aurora program unavailable');
      const time = gl.getUniformLocation(program, 'time');
      const resolution = gl.getUniformLocation(program, 'resolution');
      const draw = () => {
        if (failed || !mode.current.active) return;
        gl.useProgram(program);
        gl.uniform1f(time, elapsed);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      const tick = (now) => {
        frame = 0;
        if (failed || !mode.current.active || mode.current.reducedMotion) return;
        const interval = 1000 / 45;
        if (!last || now - last >= interval) {
          elapsed += previous ? Math.min((now - previous) / 1000, 0.1) : 0;
          previous = now;
          last = now - ((now - last) % interval);
          draw();
        }
        frame = requestAnimationFrame(tick);
      };
      const sync = () => {
        stop();
        if (failed) return;
        if (!mode.current.active) {
          canvas.dataset.state = 'paused';
          return;
        }
        if (mode.current.reducedMotion) {
          if (!staticDrawn) {
            draw();
            staticDrawn = true;
          }
          canvas.dataset.state = 'static';
        } else {
          staticDrawn = false;
          canvas.dataset.state = 'running';
          frame = requestAnimationFrame(tick);
        }
      };
      const resize = () => {
        const rect = canvas.getBoundingClientRect(),
          dpr = Math.min(devicePixelRatio || 1, 1.5);
        const width = Math.max(1, Math.round(rect.width * dpr)),
          height = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width === width && canvas.height === height) return;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        staticDrawn = false;
        if (mode.current.reducedMotion) sync();
      };
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
      controls.current = { sync };
      sync();
    } catch {
      fallback();
    }
    return () => {
      controls.current = null;
      stop();
      observer?.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      if (gl) {
        if (program) gl.deleteProgram(program);
        shaders.forEach((shader) => gl.deleteShader(shader));
        // StrictMode replays effects on a connected canvas; only release after real removal.
        queueMicrotask(() => {
          if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
        });
      }
    };
  }, []);
  useEffect(() => {
    controls.current?.sync();
  }, [active, reducedMotion]);
  return <canvas ref={ref} className="aurora-field" aria-hidden="true" />;
}
