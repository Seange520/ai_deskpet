import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// 所有按钮共享同一套触感反馈；保留原生 button 的语义、焦点与禁用行为。
const Button = forwardRef(function Button({ disabled, children, ...props }, ref) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      whileTap={
        disabled || reduced
          ? undefined
          : { scale: 0.95, y: 2, boxShadow: '0 1px 0 rgba(0,0,0,0.15)' }
      }
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      {...props}
    >
      {children}
    </motion.button>
  );
});
export default Button;
