import { useRef, useState } from 'react';
import { Database, Download, HardDrive, RefreshCw } from 'lucide-react';
import {
  formatBytes,
  isPackReady,
  pickMissingPacks,
  totalDownloadSize,
} from '../../platform/assetPacks.mjs';
import {
  downloadPack,
  fetchPackIndex,
  installedFromStorage,
  isNativeRuntime,
  markInstalled,
  saveInstalled,
} from '../../platform/nativeAssets.mjs';
import './asset-packs.css';

export default function AssetPackEntry() {
  const details = useRef(null);
  const [index, setIndex] = useState(null);
  const [installed, setInstalled] = useState(() => installedFromStorage());
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const native = isNativeRuntime();

  async function load() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const next = await fetchPackIndex();
      setIndex(next);
      setInstalled(installedFromStorage());
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function onToggle(event) {
    if (event.currentTarget.open && !index && !loading) load();
  }

  async function startDownload(pack) {
    setDownloading(pack.id);
    setProgress({ downloaded: 0, total: pack.totalSize, ratio: 0 });
    setError('');
    setMessage('');
    try {
      await downloadPack(pack, { onProgress: setProgress });
      const next = markInstalled(installed, pack.id, pack.version);
      setInstalled(next);
      saveInstalled(next);
      setMessage(`${pack.title} 已下载并校验完成`);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setDownloading(null);
      setProgress(null);
    }
  }

  const missing = index ? pickMissingPacks(index, installed) : [];
  return (
    <details className="asset-pack-entry" ref={details} onToggle={onToggle}>
      <summary className="asset-pack-summary" aria-label="资源包管理">
        <Database size={16} aria-hidden="true" /> 资源包
      </summary>
      <section className="asset-pack-panel" aria-label="资源包管理">
        <header>
          <p className="asset-pack-eyebrow">ASSET PACKS · 本地资源</p>
          <h3>
            <HardDrive size={18} aria-hidden="true" /> 资源包管理
          </h3>
          <p className="asset-pack-note">
            {native
              ? 'App 端按章节预下载资源包，校验 SHA-256 后离线可用。'
              : 'Web 端按需加载，无需下载；App 端可预下载章节资源包。'}
          </p>
        </header>
        {loading && <p className="asset-pack-status">正在读取资源索引…</p>}
        {error && (
          <p className="asset-pack-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="asset-pack-status" role="status">
            {message}
          </p>
        )}
        {!index && !loading && !error && (
          <button type="button" className="asset-pack-button" onClick={load}>
            <RefreshCw size={14} /> 读取资源索引
          </button>
        )}
        {index && (
          <>
            <p className="asset-pack-status">
              共 {index.packs.length} 个包 · 待下载 {missing.length} 个（合计{' '}
              {formatBytes(totalDownloadSize(missing))}）
            </p>
            <ul className="asset-pack-list">
              {index.packs.map((pack) => {
                const ready = isPackReady(pack, installed);
                return (
                  <li key={pack.id} className={ready ? 'is-ready' : ''}>
                    <div>
                      <strong>{pack.title}</strong>
                      <small>
                        {formatBytes(pack.totalSize)} · v{pack.version}
                      </small>
                    </div>
                    {ready ? (
                      <span className="asset-pack-badge">已就绪</span>
                    ) : native ? (
                      <button
                        type="button"
                        className="asset-pack-button"
                        disabled={Boolean(downloading)}
                        onClick={() => startDownload(pack)}
                      >
                        <Download size={14} />
                        {downloading === pack.id ? '下载中…' : '下载'}
                      </button>
                    ) : (
                      <span className="asset-pack-badge muted">Web 自动加载</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {progress && (
          <div className="asset-pack-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.ratio * 100)}>
            <span style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
            <small>
              {Math.round(progress.ratio * 100)}% · {formatBytes(progress.downloaded)} /{' '}
              {formatBytes(progress.total)}
            </small>
          </div>
        )}
      </section>
    </details>
  );
}
