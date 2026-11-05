import { motion } from 'framer-motion';
import { HUD_EXIT_MS, ISLAND_HUD } from './spaceLayout';

const spring = { type: 'spring', stiffness: 150, damping: 22 };
const enter = { x: 0, scale: 1, opacity: 1 };

export default function HudChoreographer({ focus, phase, cinematic, children }) {
  const side = ISLAND_HUD[focus].side;
  const x = side === 'left' ? -46 : 46;
  const busy = cinematic && (phase === 'departing' || phase === 'traveling');

  return (
    <motion.div
      className={cinematic ? 'space-hud-panel' : 'page-transition'}
      data-space-hud
      data-hud-side={side}
      data-hud-phase={phase}
      inert={busy ? '' : undefined}
      aria-busy={busy || undefined}
      initial={cinematic && phase === 'arriving' ? { x, scale: 0.97, opacity: 0 } : false}
      animate={cinematic ? (busy ? 'exit' : 'enter') : enter}
      transition={cinematic ? undefined : { duration: 0 }}
      variants={{
        exit: {
          x,
          scale: 0.94,
          opacity: 0,
          transition: { duration: HUD_EXIT_MS / 1000, ease: 'easeOut' },
        },
        enter: { ...enter, transition: { x: spring, scale: spring, opacity: { duration: 0.18 } } },
      }}
    >
      {children}
    </motion.div>
  );
}
