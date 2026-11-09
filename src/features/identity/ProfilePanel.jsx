import { useEffect, useState } from 'react';
import { Copy, ShieldCheck } from 'lucide-react';
import { useIdentity } from './identityStore.js';
import { ageFlags, exportPayload, OPTIONS } from './profile.mjs';
import { readProgress, resonanceIndex, percentile } from './resonanceIndex.mjs';
import './identity.css';
const labels = {
  knowledge: '学识',
  practice: '实作',
  story: '剧情',
  resonance: '共鸣',
  creation: '创造',
  connection: '维系',
};
const limits = {
  knowledge: 400,
  practice: 200,
  story: 150,
  resonance: 100,
  creation: 100,
  connection: 50,
};
export default function ProfilePanel() {
  const s = useIdentity(),
    p = s.profile;
  const [tab, setTab] = useState('档案'),
    [nickname, setNickname] = useState(p?.nickname || ''),
    [year, setYear] = useState(''),
    [draft, setDraft] = useState(p?.appearance),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  useEffect(() => {
    s.touch();
  }, []);
  useEffect(() => {
    setNickname(p?.nickname || '');
    setDraft(p?.appearance);
  }, [p?.uid]);
  const ri = resonanceIndex(p, readProgress());
  async function download() {
    try {
      const payload = exportPayload(p, readProgress());
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'checksum-archive-' + p.uid + '.json';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      s.recordExport();
    } catch {
      setNotice('导出失败，请重试');
    }
  }
  return (
    <div className="identity-panel" data-identity-panel>
      <h2 id="modal-title">
        <ShieldCheck size={24} />
        维护者档案
      </h2>
      <p>留下一块铭牌，让每一份证据有迹可循。</p>
      <div role="tablist" aria-label="维护者档案分页">
        {['档案', '外观', '数据'].map((t, i) => (
          <button
            key={t}
            role="tab"
            id={'identity-tab-' + i}
            aria-controls="identity-content"
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => {
              setTab(t);
              setNotice('');
            }}
            onKeyDown={(e) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const n =
                  e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? 2
                      : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
                setTab(['档案', '外观', '数据'][n]);
                document.getElementById('identity-tab-' + n)?.focus();
              }
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {!p ? (
        <section className="identity-guide">
          <h3>生成档案</h3>
          <p>本地档案保存在此浏览器，无需邮箱或密码。</p>
          {s.error && <p>{s.error}</p>}
          <label>
            出生年份
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
          <p>仅用于本地年龄保护；未满 18 岁隐藏回响塔百分位。</p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await s.ensureProfile(Number(year));
              setBusy(false);
            }}
          >
            生成档案
          </button>
        </section>
      ) : (
        <section
          role="tabpanel"
          id="identity-content"
          aria-labelledby={'identity-tab-' + ['档案', '外观', '数据'].indexOf(tab)}
        >
          {tab === '档案' && (
            <>
              <div className="identity-card">
                <span>校验编号 · 本地档案</span>
                <div className="identity-uid">
                  <code data-identity-uid>{p.uid}</code>
                  <button
                    aria-label="复制校验编号"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(p.uid);
                        setNotice('校验编号已复制');
                      } catch {
                        setNotice('复制失败，可手动选择校验编号');
                      }
                    }}
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <label>
                  铭牌
                  <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
                </label>
                <button
                  onClick={() => {
                    setNotice('');
                    s.saveNickname(nickname);
                  }}
                >
                  保存铭牌
                </button>
                <p>首设免费；更换铭牌需间隔 30 天。</p>
              </div>
              <div className="identity-card">
                <h3>
                  共鸣指数 <strong data-identity-ri>{ri.total}</strong> / 1000
                </h3>
                <p>本地档案 · 不参与全球榜</p>
                {Object.entries(ri.items).map(([k, v]) => (
                  <div className="identity-score" key={k} data-identity-ri-item={k} data-score={v}>
                    <span>{labels[k]}</span>
                    <progress max={limits[k]} value={v} aria-label={labels[k]} />
                    <span className="identity-score-value">
                      {Number(v.toFixed(2))} / {limits[k]}
                    </span>
                  </div>
                ))}
                <p>所有分数可解释、可复验；不卖数值</p>
              </div>
              <div className="identity-card">
                <h3>回响塔记录</h3>
                {ageFlags(p.birthYear).minor18 ? (
                  <p>年龄保护已开启，百分位展示已隐藏。</p>
                ) : (
                  <p>
                    同阶段维护者前 {percentile(p.uid)}% <small>本地估算</small>
                  </p>
                )}
              </div>
            </>
          )}
          {tab === '外观' && (
            <div data-identity-appearance>
              <p>外观只影响展示，不影响数值</p>
              <div
                className={'identity-zero palette-' + (draft?.palette || p.appearance.palette)}
                style={{
                  '--antenna': { orange: '#fb923c', teal: '#5eead4', amber: '#fcd34d' }[
                    draft?.antenna || p.appearance.antenna
                  ],
                }}
                role="img"
                aria-label="小零外观预览"
              >
                <i />
                <div className="identity-eyes">● ●</div>
                <b>
                  {(draft?.decal || p.appearance.decal) === 'checksum'
                    ? '✓'
                    : (draft?.decal || p.appearance.decal) === 'lamp'
                      ? '☀'
                      : ''}
                </b>
              </div>
              {Object.entries(OPTIONS).map(([k, values]) => (
                <fieldset key={k}>
                  <legend>{{ palette: '三色板', antenna: '天线色', decal: '徽记' }[k]}</legend>
                  {values.map((v) => (
                    <button
                      key={v}
                      aria-pressed={(draft || p.appearance)[k] === v}
                      onClick={() =>
                        setDraft({ ...draft, ...(!draft ? p.appearance : {}), [k]: v })
                      }
                    >
                      {v}
                    </button>
                  ))}
                </fieldset>
              ))}
              <button onClick={() => s.saveAppearance(draft || p.appearance)}>保存外观</button>
            </div>
          )}
          {tab === '数据' && (
            <div data-identity-data>
              <label className="identity-consent">
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.consents.aiMemory}
                  onChange={(e) => s.setConsent('aiMemory', e.target.checked)}
                />
                AI 记忆授权
              </label>
              <p>默认关闭，仅记录本地选择，可随时撤回；本版不生成或上传 AI 记忆。</p>
              <label className="identity-consent">
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.consents.analytics}
                  onChange={(e) => s.setConsent('analytics', e.target.checked)}
                />
                统计授权
              </label>
              <p>默认关闭，本版仅保存授权选择，不发送统计。</p>
              <button onClick={download}>导出档案 JSON</button>
              <div className="identity-card" data-identity-privacy>
                <h3>数据说明</h3>
                <p>
                  本版记录校验编号、铭牌、出生年份、外观、授权选择、打开日期与导出时间，保存在此浏览器
                  localStorage。安装密钥仅用于本机编号派生，不包含邮箱或密码。不收集位置、相机或生物特征，不联网。AI
                  记忆与统计授权默认关闭且可撤回。导出文件包含档案与现有进度；删除仅清除档案和安装密钥，学习及世界进度保留。
                </p>
              </div>
              {!confirm ? (
                <button onClick={() => setConfirm(true)}>删除本地档案</button>
              ) : (
                <div className="identity-card">
                  <p>确认删除档案与本机安装密钥？学习与世界进度保留。</p>
                  <button
                    onClick={() => {
                      s.deleteProfile();
                      setConfirm(false);
                      setNotice('');
                      setTab('档案');
                    }}
                  >
                    确认删除
                  </button>
                  <button onClick={() => setConfirm(false)}>取消删除</button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      <p role="status">{notice || s.message || ''}</p>
    </div>
  );
}
