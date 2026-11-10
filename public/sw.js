/* 第七校验 · 单机壳缓存（v1.0）
 * 目标：Web 版首次打开后，同一浏览器可离线进入游戏与档案阅读。
 * 策略：导航请求 cache-first（后台更新），静态资源 cache-first + 运行时写入。
 * 不做任何网络同步；缓存只存本机。
 */
const VERSION = 'v1.0.2';
const CORE = `seventh-checksum-core-${VERSION}`;
const RUNTIME = `seventh-checksum-runtime-${VERSION}`;
const PRECACHE = [
  './',
  './index.html',
  './favicon.svg',
  './site/index.html',
  './novel/index.html',
  './assets/novel/v1.md',
];

async function manifestUrls() {
  try {
    const res = await fetch('./sw-manifest.json', { cache: 'reload' });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.files)) return [];
    return data.files.map((f) => './' + String(f.path).replace(/^\.?\//, ''));
  } catch {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE);
      const urls = [...new Set([...PRECACHE, ...(await manifestUrls())])];
      await Promise.all(
        urls.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            /* 单个资源失败不阻断安装；运行时再补 */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('seventh-checksum-') && !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cached =
    (await caches.match(request, { ignoreSearch: false, ignoreVary: true })) ||
    (await caches.match(request.url, { ignoreVary: true }));
  if (cached) {
    if (request.method === 'GET' && request.mode === 'navigate') {
      // 后台静默更新，下一次生效
      fetch(request)
        .then((res) => {
          if (res.ok) caches.open(CORE).then((c) => c.put(request, res.clone()));
        })
        .catch(() => {});
    }
    return cached;
  }
  const res = await fetch(request);
  if (res.ok && request.method === 'GET' && new URL(request.url).origin === self.location.origin) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, res.clone()).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // 本地开发/预览服务器路径不缓存
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/node_modules/')) return;
  event.respondWith(
    cacheFirst(request).catch(async () => {
      if (request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      return new Response('离线且未缓存该资源。', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }),
  );
});
