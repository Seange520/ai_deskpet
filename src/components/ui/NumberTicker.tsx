import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

const numberFormat = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0,
  useGrouping: false,
});

type NumberTickerProps = {
  value: number;
  className?: string;
};

// Only mounted after first entry and when the user allows motion.
function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 170, damping: 30 });
  const [displayedValue, setDisplayedValue] = useState(0);

  useEffect(() => springValue.on('change', setDisplayedValue), [springValue]);
  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return <>{numberFormat.format(displayedValue)}</>;
}

export default function NumberTicker({ value, className }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reducedMotion = useReducedMotion();

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {isInView && reducedMotion === false ? (
        <AnimatedNumber value={value} />
      ) : (
        numberFormat.format(value)
      )}
    </span>
  );
}
