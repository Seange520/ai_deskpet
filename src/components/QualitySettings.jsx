import { useRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useQualityTier } from '../lib/qualityTier';
import { useQualityStore } from '../stores/useQualityStore';

const presets = [
  ['cinematic', '极致', '完整后期与电影特效'],
  ['balanced', '均衡', '保留泛光，降低渲染成本'],
  ['smooth', '流畅', '基础 3D 与夜谷轮廓'],
  ['custom', '自定义', '指定渲染档位与像素密度'],
];

export default function QualitySettings() {
  const settings = useQualityStore();
  const { tier, override } = useQualityTier();
  const details = useRef(null);
  const trigger = useRef(null);
  return (
    <details
      className="quality-settings"
      ref={details}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !details.current.open) return;
        details.current.open = false;
        trigger.current.focus();
      }}
    >
      <summary className="icon-btn" ref={trigger} aria-label="画质设置" title="画质设置">
        <SlidersHorizontal size={18} aria-hidden="true" />
      </summary>
      <section className="quality-menu" aria-label="全局画质设置">
        <header>
          <span className="eyebrow">SEVENTH CHECKSUM · RENDERING</span>
          <h2>全局画质</h2>
          <p aria-live="polite">
            {override !== null ? 'URL 调试覆盖' : settings.manual ? '手动模式' : '自动模式'} · 当前
            Tier {tier}
          </p>
        </header>
        <fieldset>
          <legend className="sr-only">画质预设</legend>
          {presets.map(([id, label, help]) => (
            <label className="quality-option" key={id}>
              <input
                type="radio"
                name="sparkmate-quality"
                checked={settings.manual && settings.preset === id}
                onChange={() => settings.selectPreset(id)}
              />
              <span>
                {label}
                <small>{help}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {settings.manual && settings.preset === 'custom' && (
          <div className="quality-custom">
            <label>
              渲染档位
              <select
                value={settings.customTier}
                onChange={(event) => settings.setCustomTier(Number(event.target.value))}
              >
                <option value={1}>Tier 1</option>
                <option value={2}>Tier 2</option>
                <option value={3}>Tier 3</option>
              </select>
            </label>
            <label>
              像素密度上限
              <select
                value={settings.customDpr}
                onChange={(event) => settings.setCustomDpr(Number(event.target.value))}
              >
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
              </select>
            </label>
          </div>
        )}
        <button
          className="btn"
          type="button"
          disabled={!settings.manual}
          onClick={settings.restoreAuto}
        >
          恢复自动
        </button>
      </section>
    </details>
  );
}
