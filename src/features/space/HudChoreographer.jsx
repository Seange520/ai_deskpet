import { motion } from 'framer-motion';
import { ISLAND_HUD } from './spaceLayout';

const spring = { type: 'spring', stiffness: 245, damping: 28, mass: 0.75 };

export default function HudChoreographer({ focus, phase, cinematic, children }) {
  const side = ISLAND_HUD[focus].side;
  const x = side === 'left' ? -46 : 46;
  const traveling = cinematic && phase === 'traveling';
  return (
    <motion.div
      className={cinematic ? 'space-hud-panel' : 'page-transition'}
      data-hud-side={side}
      inert={traveling ? '' : undefined}
      aria-hidden={traveling || undefined}
      initial={cinematic && phase === 'arriving' ? { x, opacity: 0 } : false}
      animate={cinematic ? (traveling ? { x, opacity: 0 } : { x: 0, opacity: 1 }) : undefined}
      transition={{ x: spring, opacity: { duration: 0.19 } }}
    >
      {children}
    </motion.div>
  );
}
