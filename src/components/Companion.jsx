import { useEffect, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import Button from './Button';

// 常驻伙伴用 CSS 绘制，避免与实验室的 SVG 教学图产生语义定位冲突。
export default function Companion({ celebrations, hidden }) {
  const [curious, setCurious] = useState(false),
    [small, setSmall] = useState(false);
  const controls = useAnimationControls(),
    reduced = useReducedMotion();
  useEffect(() => {
    if (celebrations > 0 && !reduced)
      controls.start({
        y: [0, -26, 0, -10, 0],
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
      });
  }, [celebrations, controls, reduced]);
  return (
    <div className={`companion ${small ? 'is-small' : ''}`} hidden={hidden}>
      {!small && (
        <span className="companion-bubble" aria-live="polite">
          {curious
            ? '在看什么？带上我呀。'
            : celebrations
              ? '又学会一点，我为你开心！'
              : '慢慢来，我陪着你。'}
        </span>
      )}
      <motion.div
        animate={controls}
        onHoverStart={() => setCurious(true)}
        onHoverEnd={() => setCurious(false)}
      >
        <Button
          className={`companion-body ${curious ? 'is-curious' : ''}`}
          aria-label={small ? '展开桌宠伙伴' : '收起桌宠伙伴'}
          onFocus={() => setCurious(true)}
          onBlur={() => setCurious(false)}
          onClick={() => setSmall(!small)}
        >
          <span className="companion-antenna" />
          <span className="companion-face">
            <i />
            <i />
            <b />
          </span>
          <span className="companion-feet" />
        </Button>
      </motion.div>
    </div>
  );
}
