import { useHandGesture } from './useHandGesture';
import { usePetActions } from './usePetActions';
import Button from '../../components/Button';
import './interaction.css';

export default function GestureControlPanel() {
  const gesture = useHandGesture();
  const trigger = usePetActions((state) => state.trigger);
  const dark = usePetActions((state) => state.dark);
  const active = ['starting', 'running'].includes(gesture.status);
  return (
    <section className="panel pet-interaction" aria-label="桌宠动作与手势控制">
      <div className="pet-interaction-header">
        <div>
          <span className="eyebrow">PLAY · SENSE · GESTURE</span>
          <h2>和 3D 小伙伴互动</h2>
        </div>
        <Button
          className="btn"
          onClick={active ? gesture.stop : gesture.start}
          disabled={!active && (!gesture.supported || gesture.disabled)}
        >
          {active ? '关闭摄像头' : '开启手势摄像头'}
        </Button>
      </div>
      <div className="gesture-engine-status" aria-live="polite">
        <span data-testid="gesture-engine-mode" data-engine={gesture.delegate || 'idle'}>
          <i className={gesture.status === 'running' ? 'is-running' : ''} aria-hidden="true" />
          引擎：{gesture.delegate || (gesture.status === 'starting' ? '加载中' : '未启动')}
          {gesture.delegate === 'GPU' && ' · GPU 加速'}
        </span>
        <span data-testid="gesture-current-name">手势：{gesture.category || 'None'}</span>
        {gesture.webgpuAvailable && <small>WebGPU API 可用</small>}
        {gesture.fallback && <small>GPU 初始化失败，已切换 CPU</small>}
      </div>
      <div className="pet-action-buttons grid !grid-cols-2 sm:!flex">
        {[
          ['jump', '跳跃'],
          ['spin', '旋转一圈'],
          ['sleep', '休眠'],
          ['wake', '唤醒'],
        ].map(([type, label]) => (
          <Button
            className="btn"
            key={type}
            onClick={() => trigger(type)}
            disabled={dark && type !== 'sleep'}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="pet-interaction-message" aria-live="polite">
        {gesture.supported ? gesture.message : '当前环境不支持摄像头手势控制。'}
      </p>
      <p className="pet-interaction-hint">
        张开手掌 → 跳跃；握拳 → 休眠。光照低于 100
        时优先休眠，恢复光照自动醒来。视频仅在本机推理，不录制、不上传；关闭、离页或切到后台会停止摄像头。
      </p>
      <video
        ref={gesture.videoRef}
        className="gesture-preview"
        hidden={!active}
        muted
        playsInline
        aria-label="本地手势摄像头预览"
      />
    </section>
  );
}
