import { useEffect, useRef } from 'react';
import { DESTINATIONS } from './navigationStore';
// Canvas2D terrain atlas: no second WebGL renderer, physics dependency or frame loop.
export default function TexturedMinimap() {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current,
      c = canvas.getContext('2d'),
      image = new Image();
    function draw() {
      const n = 384;
      c.clearRect(0, 0, n, n);
      const sky = c.createRadialGradient(170, 150, 10, 192, 192, 250);
      sky.addColorStop(0, '#254963');
      sky.addColorStop(1, '#081426');
      c.fillStyle = sky;
      c.fillRect(0, 0, n, n);
      for (let i = 0; i < 100; i++) {
        c.fillStyle = '#a0d0d55a';
        c.fillRect((i * 137.51) % 384, (i * 97.31) % 384, 1, 1);
      }
      c.save();
      c.translate(192, 192);
      c.scale(8, 8);
      c.shadowColor = '#000';
      c.shadowBlur = 10;
      c.shadowOffsetY = 4;
      c.strokeStyle = '#26364b';
      c.lineWidth = 2.3;
      c.beginPath();
      c.arc(0, 0, 16, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = '#78909e';
      c.lineWidth = 1.6;
      c.stroke();
      for (const a of DESTINATIONS.slice(1)) {
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(a.position[0], a.position[2]);
        c.stroke();
      }
      for (const a of DESTINATIONS) {
        c.save();
        c.translate(a.position[0], a.position[2]);
        const r = a.id === 'hub' ? 3.98 : 4.78;
        c.beginPath();
        for (let i = 0; i < 48; i++) {
          const t = (i / 48) * Math.PI * 2,
            rad = r * (0.96 + 0.04 * Math.sin(i * 11.7));
          const x = Math.cos(t) * rad,
            y = Math.sin(t) * rad;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
        c.fillStyle = '#202f46';
        c.fill();
        c.shadowBlur = 0;
        c.shadowOffsetY = 0;
        c.clip();
        if (image.complete && image.naturalWidth) c.drawImage(image, -r, -r, r * 2, r * 2);
        else {
          c.fillStyle = '#657a83';
          c.fillRect(-r, -r, r * 2, r * 2);
        }
        const lit = c.createLinearGradient(-r, -r, r, r);
        lit.addColorStop(0, '#fcdfab55');
        lit.addColorStop(1, '#0a1539bb');
        c.fillStyle = lit;
        c.fillRect(-r, -r, r * 2, r * 2);
        c.strokeStyle = a.color;
        c.lineWidth = 0.12;
        c.beginPath();
        c.arc(0, 0, r * 0.9, 0, Math.PI * 2);
        c.stroke();
        for (let i = 0; i < 16; i++) {
          const t = i * 2.399,
            x = Math.cos(t) * r * 0.78,
            y = Math.sin(t) * r * 0.78;
          c.fillStyle = i % 3 ? a.color : '#7ae9cd';
          c.beginPath();
          c.moveTo(x, y - 0.3);
          c.lineTo(x + 0.16, y + 0.2);
          c.lineTo(x - 0.16, y + 0.2);
          c.fill();
        }
        c.shadowColor = '#000';
        c.shadowBlur = 2;
        c.shadowOffsetY = 0.3;
        c.fillStyle = '#b7c6cc';
        c.fillRect(-0.9, -0.75, 1.8, 1.5);
        c.fillStyle = '#5ee2e3';
        c.fillRect(-0.72, -0.6, 0.2, 1.2);
        c.restore();
      }
      c.restore();
    }
    draw();
    image.onload = draw;
    image.src = '/assets/skins/rock_albedo.png';
    return () => {
      image.onload = null;
    };
  }, []);
  return <canvas ref={ref} width={384} height={384} aria-hidden="true" data-textured-minimap />;
}
