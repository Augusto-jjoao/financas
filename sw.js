// Service worker: permite instalar o site como aplicativo e abri-lo mesmo sem internet.
// Estratégia:
//  - arquivos do próprio site → "rede primeiro" (você sempre recebe a versão mais nova; sem internet, usa a cópia guardada)
//  - SDK do Firebase e fontes do Google → "cache primeiro" (os endereços têm versão, então não mudam)
// Os DADOS não passam por aqui: o Firebase cuida do próprio cache offline.
const CACHE = 'financas-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (sameOrigin) event.respondWith(networkFirst(req));
  else if (isSdk || isFont) event.respondWith(cacheFirst(req));
});

async function networkFirst(req){
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') return (await cache.match('./')) || (await cache.match('index.html')) || Response.error();
    throw e;
  }
}
async function cacheFirst(req){
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
