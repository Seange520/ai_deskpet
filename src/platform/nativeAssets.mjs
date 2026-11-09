// 原生端资源包下载器：Android/Tauri 的 Capacitor Filesystem 落盘 + SHA-256 校验。
// Web 端不进入下载流程（资源按 chunk 懒加载），调用方需用 isNativeRuntime() 判断。

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import {
  PACK_INDEX_URL,
  packProgress,
  parseInstalled,
  PACK_STORAGE_KEY,
  serializeInstalled,
  validateIndex,
} from './assetPacks.mjs';

export const PACK_ROOT = 'seventh-checksum/packs';

export function isNativeRuntime() {
  try {
    return Boolean(Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function installedFromStorage() {
  try {
    return parseInstalled(window.localStorage.getItem(PACK_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function saveInstalled(installed) {
  try {
    window.localStorage.setItem(PACK_STORAGE_KEY, serializeInstalled(installed));
    return true;
  } catch {
    return false;
  }
}

export async function fetchPackIndex(fetcher = globalThis.fetch) {
  const response = await fetcher(PACK_INDEX_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`资源索引下载失败（HTTP ${response.status}）`);
  const index = await response.json();
  const validation = validateIndex(index);
  if (!validation.ok) throw new Error(`资源索引格式错误：${validation.errors[0] || '未知'}`);
  return index;
}

export async function sha256Hex(buffer) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function ensureDirectory(path) {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
  } catch (error) {
    const message = String(error?.message || error);
    if (!/exist/i.test(message)) throw error;
  }
}

/**
 * 下载单个资源包：逐文件 fetch → SHA-256 校验 → 写入应用数据目录。
 * @returns {Promise<{packId:string, version:string, totalBytes:number}>}
 */
export async function downloadPack(pack, { onProgress, fetcher = globalThis.fetch } = {}) {
  let downloaded = 0;
  const total = pack.totalSize || pack.files.reduce((sum, f) => sum + f.size, 0);
  onProgress?.({ downloaded: 0, total, ratio: 0, file: null });
  await ensureDirectory(`${PACK_ROOT}/${pack.id}`);
  for (const file of pack.files) {
    const response = await fetcher(file.url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${pack.id}: ${file.path} 下载失败（HTTP ${response.status}）`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength !== file.size) {
      throw new Error(`${pack.id}: ${file.path} 大小不符（期望 ${file.size}，实际 ${buffer.byteLength}）`);
    }
    const digest = await sha256Hex(buffer);
    if (digest.toLowerCase() !== file.sha256.toLowerCase()) {
      throw new Error(`${pack.id}: ${file.path} 校验失败（SHA-256 不匹配）`);
    }
    const relative = file.path.replace(/^assets\//, '');
    const target = `${PACK_ROOT}/${pack.id}/${relative}`;
    const slash = target.lastIndexOf('/');
    if (slash > 0) await ensureDirectory(target.slice(0, slash));
    await Filesystem.writeFile({
      path: target,
      directory: Directory.Data,
      data: toBase64(buffer),
      recursive: true,
    });
    downloaded += buffer.byteLength;
    onProgress?.({
      downloaded,
      total,
      ratio: packProgress(downloaded, total),
      file: file.path,
    });
  }
  return { packId: pack.id, version: pack.version, totalBytes: downloaded };
}

export async function installedPacksOnDisk() {
  try {
    const result = await Filesystem.readdir({ path: PACK_ROOT, directory: Directory.Data });
    return new Set((result.files || []).map((file) => file.name));
  } catch {
    return new Set();
  }
}

export function markInstalled(installed, packId, version) {
  return {
    ...installed,
    [packId]: { version, downloadedAt: new Date().toISOString() },
  };
}
