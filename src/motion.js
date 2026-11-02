// 唯一的有限交互时长；持续装饰使用 CSS，眨眼间隔用 repeatDelay 表达。
export const EASE = [0.16, 1, 0.3, 1];
export const MOTION = { type: 'tween', duration: 0.4, ease: EASE };
export const TACTILE = { type: 'spring', duration: 0.4, bounce: 0.22 };
