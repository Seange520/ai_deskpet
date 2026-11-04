import { Moon, Sun, Clock3 } from 'lucide-react';
import Button from '../../components/Button';
import { useEnvironmentStore } from './useEnvironmentStore';

export default function EnvironmentControls() {
  const { night, mode, idleSleeping, setMode } = useEnvironmentStore();
  return (
    <>
      <span className="pet-environment-status" role="status" data-testid="environment-status">
        {night ? '夜晚' : '白天'} · {mode === 'auto' ? '跟随本地时间' : '手动演示'}
        {idleSleeping ? ' · 闲置休眠' : ''}
      </span>
      <Button
        className="btn"
        data-testid="environment-toggle"
        onClick={() => setMode(night ? 'day' : 'night')}
      >
        {night ? <Sun size={16} /> : <Moon size={16} />}
        {night ? '切换为白天' : '切换为黑夜'}
      </Button>
      <Button
        className="btn"
        disabled={mode === 'auto'}
        onClick={() => {
          useEnvironmentStore.getState().syncClock();
          setMode('auto');
        }}
      >
        <Clock3 size={16} />
        跟随本地时间
      </Button>
    </>
  );
}
