// 资源包（Asset Pack）纯逻辑：校验清单、挑选缺失包、下载进度换算。
// Web 端不执行下载；Android/Tauri 端在原生容器内复用同一套逻辑与清单。

export const PACK_INDEX_URL = './assets/packs/index.json';
export const PACK_STORAGE_KEY = 'sparkmate.checksum.packs.v1';
export const MANIFEST_VERSION = 1;

const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/i;

export function isValidPackId(value) {
  return typeof value === 'string' && PACK_ID_RE.test(value);
}

export function validateIndex(index) {
  const errors = [];
  if (!index || typeof index !== 'object') return { ok: false, errors: ['index 不是对象'] };
  if (index.manifestVersion !== MANIFEST_VERSION) {
    errors.push(`manifestVersion 应为 ${MANIFEST_VERSION}`);
  }
  if (typeof index.generatedAt !== 'string' || !index.generatedAt) {
    errors.push('缺少 generatedAt');
  }
  if (!Array.isArray(index.packs) || index.packs.length === 0) {
    errors.push('packs 必须为非空数组');
    return { ok: false, errors };
  }
  const seen = new Set();
  for (const pack of index.packs) {
    const where = pack && pack.id ? pack.id : '(未命名包)';
    if (!isValidPackId(pack?.id)) errors.push(`${where}: id 不合法`);
    if (seen.has(pack?.id)) errors.push(`${where}: 重复 id`);
    seen.add(pack?.id);
    if (typeof pack?.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(pack.version)) {
      errors.push(`${where}: version 需为 x.y.z`);
    }
    if (typeof pack?.title !== 'string' || !pack.title) errors.push(`${where}: 缺少 title`);
    if (typeof pack?.totalSize !== 'number' || pack.totalSize <= 0) {
      errors.push(`${where}: totalSize 必须为正数`);
    }
    if (!Array.isArray(pack?.files) || pack.files.length === 0) {
      errors.push(`${where}: files 必须为非空数组`);
      continue;
    }
    let sum = 0;
    for (const file of pack.files) {
      if (typeof file?.path !== 'string' || !file.path) errors.push(`${where}: 文件缺少 path`);
      if (typeof file?.url !== 'string' || !file.url) errors.push(`${where}: 文件缺少 url`);
      if (typeof file?.size !== 'number' || file.size <= 0) errors.push(`${where}: 文件 size 非法`);
      else sum += file.size;
      if (!SHA256_RE.test(file?.sha256 || '')) errors.push(`${where}: 文件 sha256 非法`);
    }
    if (sum !== pack.totalSize) errors.push(`${where}: totalSize 与文件总和不一致`);
  }
  return { ok: errors.length === 0, errors };
}

export function installedVersion(installed, packId) {
  if (!installed || typeof installed !== 'object') return null;
  const record = installed[packId];
  return record && typeof record.version === 'string' ? record.version : null;
}

/** 返回「未安装或版本落后」的包；版本按 x.y.z 数字比较，不依赖字符串排序。 */
export function pickMissingPacks(index, installed) {
  if (!index || !Array.isArray(index.packs)) return [];
  return index.packs.filter((pack) => {
    const local = installedVersion(installed, pack.id);
    return local !== pack.version;
  });
}

export function totalDownloadSize(packs) {
  return (packs || []).reduce((sum, pack) => sum + (Number(pack?.totalSize) || 0), 0);
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function parseInstalled(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const safe = {};
    for (const [packId, record] of Object.entries(parsed)) {
      if (!isValidPackId(packId)) continue;
      if (!record || typeof record !== 'object') continue;
      if (typeof record.version !== 'string') continue;
      if (record.downloadedAt && typeof record.downloadedAt !== 'string') continue;
      safe[packId] = { version: record.version, downloadedAt: record.downloadedAt || null };
    }
    return safe;
  } catch {
    return {};
  }
}

export function serializeInstalled(installed) {
  const entries = Object.entries(installed || {})
    .filter(([packId, record]) => isValidPackId(packId) && typeof record?.version === 'string')
    .map(([packId, record]) => [
      packId,
      { version: record.version, downloadedAt: record.downloadedAt || null },
    ])
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(Object.fromEntries(entries));
}

export function packProgress(downloaded, total) {
  const t = Number(total) || 0;
  const d = Number(downloaded) || 0;
  if (t <= 0) return 0;
  return Math.min(1, Math.max(0, d / t));
}

/** 按 index 顺序找下一个待下载包；全部就绪返回 null。 */
export function nextPackToDownload(index, installed) {
  return pickMissingPacks(index, installed)[0] || null;
}

export function isPackReady(pack, installed) {
  return Boolean(pack) && installedVersion(installed, pack.id) === pack.version;
}
