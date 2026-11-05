import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

export default function WorldLabel({ title, code, color, position }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#110e1de8';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 8);
    ctx.lineTo(490, 8);
    ctx.lineTo(507, 24);
    ctx.lineTo(507, 104);
    ctx.lineTo(23, 104);
    ctx.lineTo(5, 88);
    ctx.lineTo(5, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(23, 27, 5, 51);
    ctx.font = '600 37px "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillText(title, 47, 56);
    ctx.font = '20px monospace';
    ctx.fillText(code, 48, 87);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [title, code, color]);

  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite name="space-world-label" position={position} scale={[3.55, 0.78, 1]}>
      <spriteMaterial map={texture} depthWrite={false} transparent toneMapped={false} />
    </sprite>
  );
}
