import { useLearningStore } from '../stores/useLearningStore';
export { ROUTE_STORAGE } from '../stores/useLearningStore';

// 兼容原有入口，Zustand 是唯一学习状态来源。
export default function useHardwareProgress() {
  const state = useLearningStore();
  return { ...state, progress: state.routes[state.routeId], allProgress: state.routes };
}
