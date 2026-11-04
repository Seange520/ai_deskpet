import { useEffect, useRef } from 'react';

const COUNT = 12;
const COLORS = ['#FFD9A0', '#C0ADD8', '#FFC98B'];

export default function HeroParticles({ active }) {
  const ref = useRef(null);
  const particles = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    let frame = 0,
      previous = 0,
      width = 0,
      height = 0;
    particles.current ??= Array.from({ length: COUNT }, (_, i) => ({
      x: 0.48 + Math.random() * 0.48,
      y: 0.12 + Math.random() * 0.74,
      vx: (Math.random() - 0.5) * 0.006,
      vy: (Math.random() - 0.5) * 0.006,
      radius: 0.8 + Math.random() * 0.9,
      color: COLORS[i % COLORS.length],
    }));
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      if (previous && now - previous < 1000 / 30) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.08) : 0;
      previous = now;
      context.clearRect(0, 0, width, height);
      for (const point of particles.current) {
        // Small random accelerations with drag: quiet, bounded Brownian drift.
        point.vx = Math.max(
          -0.006,
          Math.min(0.006, point.vx * (1 - dt) + (Math.random() - 0.5) * 0.025 * dt),
        );
        point.vy = Math.max(
          -0.006,
          Math.min(0.006, point.vy * (1 - dt) + (Math.random() - 0.5) * 0.025 * dt),
        );
        point.x = (point.x + point.vx * dt + 1) % 1;
        point.y = (point.y + point.vy * dt + 1) % 1;
        const x = point.x * width,
          y = point.y * height;
        context.fillStyle = point.color;
        context.globalAlpha = 0.035;
        context.beginPath();
        context.arc(x, y, point.radius * 5, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 0.28;
        context.beginPath();
        context.arc(x, y, point.radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active]);
  return <canvas ref={ref} className="hero-particles" aria-hidden="true" />;
}
