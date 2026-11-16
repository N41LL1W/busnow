// Service worker do BusNow.
//
// O app depende de dados ao vivo, então NÃO guardamos posições nem previsões:
// informação velha enganaria o passageiro. Guardamos só o que é seguro:
//   - arquivos estáticos do Next (têm hash no nome: nunca mudam)
//   - uma página simples de "sem conexão"

const VERSION = "v1";
const STATIC_CACHE = `busnow-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

// Instalação: guarda a página de "sem conexão"
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

// Ativação: apaga caches de versões antigas e assume o controle das abas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== STATIC_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Outros sites (como os mapas do OpenStreetMap): o navegador cuida sozinho
  if (url.origin !== self.location.origin) return;

  // APIs: nunca guardar. Posição e previsão têm que ser sempre as de agora.
  if (url.pathname.startsWith("/api/")) return;

  // Abrir uma página: tenta a rede; se não houver conexão, mostra o aviso
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match(OFFLINE_URL)) ?? Response.error()
      )
    );
    return;
  }

  // Arquivos do Next: primeiro o cache (carrega mais rápido na próxima vez)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}