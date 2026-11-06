import { motion } from 'framer-motion';
import { HUD_EXIT_MS } from './spaceLayout';

const hidden = { opacity: 0, y: 10, scale: 0.98 };
const visible = { opacity: 1, y: 0, scale: 1 };

export default function HudChoreographer({ phase, cinematic, children }) {
  const busy = phase !== 'detail';
  return (
    <motion.div
      className="page-transition space-hud-panel"
      data-space-hud
      data-hud-phase={phase}
      inert={busy ? '' : undefined}
      aria-busy={busy || undefined}
      initial={cinematic ? hidden : false}
      animate={busy ? hidden : visible}
      transition={{ duration: cinematic ? HUD_EXIT_MS / 1000 : 0, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}
