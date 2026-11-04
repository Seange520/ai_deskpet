import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';

// Html projects this head-local anchor through the active camera on each rendered frame.
export default function PetAffection({ burst, reducedMotion }) {
  return (
    <Html position={[0, 1.95, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[1, 0]}>
      <span className="pet-affection" key={burst} aria-hidden="true" data-testid="pet-affection">
        {['❤️', '✨', '❤️'].map((symbol, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, x: (index - 1) * 18, y: 0 }}
            animate={
              reducedMotion
                ? { opacity: [0, 1, 0] }
                : { opacity: [0, 1, 0], x: (index - 1) * 55, y: -70 - index * 12 }
            }
            transition={{ duration: reducedMotion ? 0.7 : 1.05, delay: index * 0.06 }}
          >
            {symbol}
          </motion.span>
        ))}
      </span>
    </Html>
  );
}
