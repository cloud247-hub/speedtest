// Nettfart – Cloudflare Worker for speedtesten. Ingen database, ingen innlogging, ingen eksterne API-er.
// Routes (all under /api, everything else is served from ./public):
//   GET  /api/ping                 -> tomt svar, brukes til å måle ping og jitter
//   GET  /api/down?bytes=N         -> N bytes (maks 32 MB) strømmet ut, måler nedlasting
//   POST /api/up                   -> {bytes}  leser hele kroppen og teller, måler opplasting
//   GET  /api/info                 -> {colo,country,isp,asn,http,tls,rtt}  hvor testen går (fra request.cf)
//   GET  /api/version              -> {version}  (fra package.json)

import pkg from "../package.json" with { type: "json" };

const VERSION = pkg.version;
const MAX_DOWN = 32 * 1024 * 1024;
const CHUNK = 128 * 1024;
// no-transform: ingen mellomledd skal komprimere eller cache testdataene
const NO_STORE = { "cache-control": "no-store, no-transform" };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);

    try {
      if (url.pathname === "/api/ping" && req.method === "GET") return new Response("", { headers: NO_STORE });
      if (url.pathname === "/api/down" && req.method === "GET") return down(url);
      if (url.pathname === "/api/up" && req.method === "POST") return await up(req);
      if (url.pathname === "/api/info" && req.method === "GET") return info(req);
      if (url.pathname === "/api/version") return json({ version: VERSION });
      return json({ error: "Finnes ikke" }, 404);
    } catch (e) {
      return json({ error: e.message || "Noe gikk galt" }, 500);
    }
  },
};

// Nuller strømmet i biter: nesten ingen CPU, og hele svaret ligger aldri i minnet samtidig.
function down(url) {
  let left = Math.min(Math.max(parseInt(url.searchParams.get("bytes"), 10) || 0, 0), MAX_DOWN);
  const body = new ReadableStream({
    pull(c) {
      if (left <= 0) return c.close();
      const n = Math.min(CHUNK, left);
      left -= n;
      c.enqueue(new Uint8Array(n));
    },
  });
  return new Response(body, { headers: { ...NO_STORE, "content-type": "application/octet-stream" } });
}

async function up(req) {
  let bytes = 0;
  if (req.body) {
    const rd = req.body.getReader();
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      bytes += value.byteLength;
    }
  }
  return json({ bytes });
}

function info(req) {
  const cf = req.cf || {};
  return json({
    colo: cf.colo || null,
    country: cf.country || null,
    isp: cf.asOrganization || null,
    asn: cf.asn || null,
    http: cf.httpProtocol || null,
    tls: cf.tlsVersion || null,
    rtt: cf.clientTcpRtt || null,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...NO_STORE, "content-type": "application/json; charset=utf-8" } });
}
