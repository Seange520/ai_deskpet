import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Canvas-local refs and visual transitions. No store writes, persistence or sound.
export function usePetAnimation({ runtime, reducedMotion, paused, interaction }) {
  const body = useRef(null);
  const eyes = useRef([]);
  const eyeMeshes = useRef([]);
  const head = useRef(null);
  const invalidate = useThree((state) => state.invalidate);
  const animation = useRef({ type: 'idle', elapsed: 0, start: 0 });
  const asleep = interaction.dark || interaction.sleeping;
  useEffect(() => {
    if (body.current)
      body.current.rotation.y = ((body.current.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
    animation.current = {
      type: ['jump', 'spin'].includes(interaction.event.type) ? interaction.event.type : 'idle',
      elapsed: 0,
      start: body.current?.rotation.y || 0,
    };
    invalidate();
  }, [interaction.event.id, invalidate]);
  const phase = useRef(0);
  const active = runtime.status === 'success';
  const direction = active ? { forward: 1, backward: -1 }[runtime.action] || 0 : 0;
  const brightness = asleep ? 0.02 : active && runtime.led ? 2.2 : 0.15;

  useEffect(() => {
    phase.current = 0;
    invalidate();
  }, [runtime, reducedMotion, paused, asleep, invalidate]);

  useFrame((_, delta) => {
    if (!body.current || paused) return;
    const dt = Math.min(delta, 0.05);
    phase.current += dt;
    const motion = animation.current;
    if (asleep) motion.type = 'idle';
    motion.elapsed += dt;
    const jump = motion.type === 'jump' && motion.elapsed < 0.9 && !reducedMotion;
    const spin = motion.type === 'spin' && !reducedMotion;
    const moving = !asleep && direction !== 0 && !reducedMotion;
    const targetZ = asleep ? 0 : direction * 0.38;
    const targetY = asleep
      ? reducedMotion
        ? 0.02
        : 0.02 + (1 + Math.sin(phase.current * 1.8)) * 0.01
      : jump
        ? Math.sin((Math.PI * motion.elapsed) / 0.9) ** 2 * 0.65
        : moving
          ? (1 - Math.cos(phase.current * 5)) * 0.035
          : 0;
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-10 * dt);
    let settling = false;
    for (const [axis, target] of [
      ['y', targetY],
      ['z', targetZ],
    ]) {
      const difference = target - body.current.position[axis];
      body.current.position[axis] += difference * alpha;
      if (Math.abs(difference) < 0.0001) body.current.position[axis] = target;
      else settling = true;
    }
    const t = Math.min(motion.elapsed / 1.3, 1);
    const targetRotation = spin ? motion.start + Math.PI * 2 * (t * t * (3 - 2 * t)) : 0;
    const turn = targetRotation - body.current.rotation.y;
    body.current.rotation.y += turn * alpha;
    if (spin && t >= 1 && Math.abs(turn) < 0.0001) {
      body.current.rotation.y = 0;
      motion.type = 'idle';
    } else if (Math.abs(turn) > 0.0001) settling = true;
    if (head.current) {
      const tilt = (asleep ? 0.32 : 0) - head.current.rotation.x;
      head.current.rotation.x += tilt * alpha;
      if (Math.abs(tilt) > 0.0001) settling = true;
    }
    for (const mesh of eyeMeshes.current) {
      if (!mesh) continue;
      const difference = (asleep ? 0.08 : 1.6) - mesh.scale.y;
      mesh.scale.y += difference * alpha;
      if (Math.abs(difference) > 0.0001) settling = true;
    }
    for (const material of eyes.current) {
      if (!material) continue;
      const difference = brightness - material.emissiveIntensity;
      material.emissiveIntensity += difference * alpha;
      if (Math.abs(difference) < 0.0001) material.emissiveIntensity = brightness;
      else settling = true;
    }
    // Demand rendering sleeps once stop/reset and the light transition have settled.
    if (moving || jump || (asleep && !reducedMotion) || (spin && t < 1) || settling) invalidate();
  });

  return { body, head, eyes, eyeMeshes };
}
