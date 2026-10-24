// Nettfart – statisk side (GitHub Pages). Måler ping, jitter, nedlasting, opplasting og ping under last mot
// Cloudflares offentlige speedtest-endepunkter (de samme som speed.cloudflare.com og biblioteket @cloudflare/speedtest
// bruker), og lager forslag til fiks ut fra resultatet og hvordan brukeren er koblet til. Tekst kommer fra i18n.js (NO/EN).
const { t } = Cloud247I18n;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sleep = (ms, signal) => new Promise(r => {
  const timer = setTimeout(r, ms);
  signal?.addEventListener("abort", () => { clearTimeout(timer); r(); }, { once: true });
});
const rnd = () => Math.random().toString(36).slice(2);
// percentile with linear interpolation (same as Cloudflare's speedtest)
const percentile = (vals, p) => {
  const s = [...vals].sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i);
  return s.length ? s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo) : null;
};
// Jitter: the mean change between consecutive pings, leaving out the largest fifth of the changes, so a single
// spike (a phone waking its Wi‑Fi radio from power saving) doesn't make a steady line look shaky; jitter that's
// really there still shows.
const jitterOf = ps => {
  if (ps.length < 2) return null;
  const d = ps.slice(1).map((v, i) => Math.abs(v - ps[i])).sort((a, b) => a - b);
  const keep = d.slice(0, Math.max(1, Math.ceil(d.length * .8)));
  return keep.reduce((a, v) => a + v, 0) / keep.length;
};
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const mbit = (bytes, ms) => ms > 0 ? bytes * 8 / (ms / 1000) / 1e6 : 0;
const locale = () => Cloud247I18n.getLanguage() === "en" ? "en-GB" : "nb-NO";
const fmtSpeed = v => v == null ? "–" : v.toLocaleString(locale(), { maximumFractionDigits: v < 10 ? 1 : 0 });
const fmtMs = v => v == null ? "–" : Math.round(v).toLocaleString(locale());
const fmtMB = b => b >= 1e9 ? (b / 1e9).toLocaleString(locale(), { maximumFractionDigits: 1 }) + " GB" : Math.round(b / 1e6).toLocaleString(locale()) + " MB";
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// Each direction runs 4 parallel streams for 8 s; the first 1.5 s (TCP warm-up) is left out of the result.
// Chunks start small and double while they finish quickly. With «Spar data» on, the caps stop a very fast
// line early so a test on mobile data doesn't eat the quota; off (the default), the full 8 s always run.
const STREAMS = 4, PHASE_MS = 8000, WARMUP_MS = 1500, PINGS = 16;
const CAP = { down: 250e6, up: 100e6 };
const START = { down: 1e6, up: 128e3 }, MAX = { down: 24e6, up: 16e6 }, GROW_MS = { down: 1500, up: 600 };
const TICKS = [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000];
// Every request here must stay a CORS "simple request" (GET, or POST of a type-less Blob, no custom headers),
// so the browser never needs a preflight that the endpoints might not answer.
const SPEED = "https://speed.cloudflare.com";
const CONN_KEY = { wifi: "connWifi", cable: "connCable", mobile: "connMobile" };

let conn = store.get("nf_conn", null) || ({ wifi: "wifi", ethernet: "cable", cellular: "mobile" })[navigator.connection?.type] || "wifi";
let plan = store.get("nf_plan", null);
let saver = store.get("nf_saver", false);
let view = ["graph", "cover"].includes(store.get("nf_view", "gauge")) ? store.get("nf_view", "gauge") : "gauge";
// What the graph draws: seconds since the test started → Mbit/s per direction, every ping with its phase,
// and when each phase ran. Saved with the result (rounded), so a past test can be drawn again.
let series = null;
let running = null, last = null, history = store.get("nf_hist", []);
try { performance.setResourceTimingBufferSize(500); } catch {}

// ---------- gauge ----------
// Log-like scale: the ticks are spread evenly and the value is interpolated between them, so 5 and 500 Mbit/s are both readable.
const CX = 150, CY = 146, R = 118, A0 = 225, SWEEP = 270;
const pt = (deg, r) => [CX + r * Math.cos(deg * Math.PI / 180), CY - r * Math.sin(deg * Math.PI / 180)];
function scale(v) {
  if (!(v > 0)) return 0;
  for (let i = 0; i < TICKS.length - 1; i++)
    if (v <= TICKS[i + 1]) return (i + (v - TICKS[i]) / (TICKS[i + 1] - TICKS[i])) / (TICKS.length - 1);
  return 1;
}
(function drawTicks() {
  let s = "";
  TICKS.forEach((tick, i) => {
    const a = A0 - SWEEP * i / (TICKS.length - 1), [x1, y1] = pt(a, 100), [x2, y2] = pt(a, 105), [lx, ly] = pt(a, 88);
    s += `<line class="tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    s += `<text class="tlbl" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${tick}</text>`;
  });
  $("ticks").innerHTML = s;
})();
// The state is kept as raw numbers + a message key, so a language switch can redraw it in the new language and number format.
let gaugeState = {};
function gauge(state) {
  gaugeState = state;
  const { num = null, ms = false, speed = null, phase = "phReady", dir = "down" } = state;
  const value = num == null ? "–" : typeof num === "string" ? num : ms ? fmtMs(num) : fmtSpeed(num);
  const unit = ms ? "ms" : "Mbit/s";
  $("meter").classList.toggle("up", dir === "up");
  const p = scale(speed) * 100;
  $("gVal").setAttribute("stroke-dasharray", `${p.toFixed(2)} 200`);
  $("gVal").setAttribute("opacity", p > 0 ? 1 : 0);
  const [x, y] = pt(A0 - SWEEP * p / 100, R);
  $("gKnob").setAttribute("cx", x.toFixed(1)); $("gKnob").setAttribute("cy", y.toFixed(1));
  $("gKnob").setAttribute("opacity", speed == null ? 0 : 1);
  $("gNum").textContent = value;
  $("gNum").style.fontSize = value.length > 3 ? "46px" : ""; // «1 075» must clear the 5 and 250 ticks
  $("gUnit").textContent = unit;
  $("gPhase").textContent = t(phase);
  $("gaugeTxt").textContent = `${t(phase)}: ${value} ${unit}`;
  $("chartPhase").textContent = t(phase);
  $("chartNow").textContent = num == null ? "–" : `${value} ${unit}`;
}
const progress = f => { $("runBar").style.width = (Math.min(1, f) * 100).toFixed(1) + "%"; };

// ---------- measuring ----------
// Cloudflare reports its own processing time in Server-Timing; subtracting it leaves the network round trip.
// Read from the header when it's exposed to us (same parsing as Cloudflare's @cloudflare/speedtest), otherwise
// from Resource Timing's serverTiming, which only needs Timing-Allow-Origin.
function serverTime(res, entry) {
  const h = res.headers.get("server-timing") || "";
  const m = h.match(/(?:^|,\s*)cfReq(?:uest)?Dur(?:ation)?;\s*dur=([0-9.]+)/i);
  if (m) return +m[1];
  let sum = 0;
  for (const x of h.matchAll(/(?:^|,\s*)cfSpeed[a-zA-Z]*;\s*dur=([0-9.]+)/gi)) sum += +x[1];
  if (sum) return sum;
  const st = entry?.serverTiming || [];
  const req = st.find(x => /^cfReq(uest)?Dur(ation)?$/i.test(x.name));
  return req ? req.duration : st.filter(x => /^cfSpeed/i.test(x.name)).reduce((a, x) => a + x.duration, 0);
}
const HTTP = { "http/1.1": "HTTP/1.1", h2: "HTTP/2", h3: "HTTP/3" };
let server = {};  // where the test runs: Cloudflare data centre from the cf-meta-* headers, HTTP version from Resource Timing

// Ping is an empty download: time to first byte from Resource Timing (leaves out the browser's own overhead),
// minus the server's processing time. Falls back to wall-clock time if the timings aren't exposed.
async function ping(signal) {
  const url = `${SPEED}/__down?bytes=0&r=${rnd()}`;
  const t0 = performance.now();
  const res = await fetch(url, { cache: "no-store", signal });
  await res.arrayBuffer();
  const wall = performance.now() - t0;
  const e = performance.getEntriesByName(url).pop();
  performance.clearResourceTimings();
  const first = e && (e.finalResponseHeadersStart || e.responseStart);
  const ttfb = e && e.requestStart > 0 && first > e.requestStart ? first - e.requestStart : wall;
  if (res.headers.get("cf-meta-colo")) server = { colo: res.headers.get("cf-meta-colo"), city: res.headers.get("cf-meta-city"), country: res.headers.get("cf-meta-country") };
  if (e?.nextHopProtocol) server.http = HTTP[e.nextHopProtocol] || e.nextHopProtocol.toUpperCase();
  return Math.max(0, ttfb - serverTime(res, e));
}

// carries the HTTP status, so a 429 (Cloudflare rate-limiting the test) can be told apart from a network problem
const httpError = res => Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });

async function fetchDown(size, add, signal) {
  const res = await fetch(`${SPEED}/__down?bytes=${size}&r=${rnd()}`, { cache: "no-store", signal });
  if (!res.ok) throw httpError(res);
  const rd = res.body.getReader();
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    add(value.byteLength);
  }
}

// Upload counts each chunk when the server has received it. (Upload progress events would be smoother, but a
// listener on xhr.upload makes the request non-simple and triggers a CORS preflight.)
const blobs = {};
async function fetchUp(size, add, signal) {
  const started = performance.now();
  const res = await fetch(`${SPEED}/__up?r=${rnd()}`, { method: "POST", body: blobs[size] ||= new Blob([new Uint8Array(size)]), cache: "no-store", signal });
  await res.arrayBuffer();
  if (!res.ok) throw httpError(res);
  add(size, started);
}

// One direction: parallel streams that keep asking for bigger chunks until the time (or data cap) is up
// (upload chunks stay shorter, since they only count once they're done), plus a ping every 300 ms to catch
// bufferbloat (latency that rises when the line is busy).
async function throughput(dir, signal, { capped, onTick, onPing }) {
  const ctrl = new AbortController(), stop = () => ctrl.abort();
  signal.addEventListener("abort", stop);
  let total = 0, errors = 0, limited = 0, closing = false, drainTimer;
  const kinds = {};  // what the failures were (HTTP status or error name), kept with the result to find the cause
  // Download counts bytes as they arrive, so it can stop at once. Upload chunks only count when done, so
  // aborting them would drop bytes already sent: let the ones in flight finish (up to 4 s) instead.
  const finish = () => {
    if (closing) return;
    closing = true;
    if (dir === "down") stop(); else drainTimer = setTimeout(stop, 4000);
  };
  const t0 = performance.now(), samples = [[0, 0]], loaded = [], chunks = [];
  const add = (n, started) => {
    total += n;
    if (started) chunks.push({ s: started - t0, e: performance.now() - t0, n });
    if (capped && total >= CAP[dir]) finish();
  };

  // A failed request never ends the phase: the stream backs off (0.25 → 2 s), starts over with small chunks
  // and keeps going until the time is up. Rate-limiting (429) is counted apart from real errors.
  const stream = async () => {
    let size = START[dir], fails = 0;
    while (!ctrl.signal.aborted && !closing) {
      const started = performance.now();
      try { await (dir === "down" ? fetchDown : fetchUp)(size, add, ctrl.signal); }
      catch (e) {
        if (ctrl.signal.aborted) break;
        if (e.status === 429) limited++; else errors++;
        const kind = e.status ? `HTTP ${e.status}` : `${dir === "down" ? "↓" : "↑"} ${e.name || "Error"}`;
        kinds[kind] = (kinds[kind] || 0) + 1;
        size = START[dir];
        await sleep(Math.min(2000, 250 * 2 ** fails++), ctrl.signal);
        continue;
      }
      fails = 0;
      if (performance.now() - started < GROW_MS[dir]) size = Math.min(size * 2, MAX[dir]);
    }
  };
  const pinger = async () => {
    await sleep(1000, ctrl.signal);
    while (!ctrl.signal.aborted && !closing) {
      try { const ms = await ping(ctrl.signal); loaded.push(ms); onPing(ms); } catch { break; }
      await sleep(300, ctrl.signal);
    }
  };
  const ticker = setInterval(() => {
    const now = performance.now() - t0;
    samples.push([now, total]);
    // live reading over the last second (two for upload, whose chunks land in bursts)
    let ref = samples[0];
    for (const s of samples) { if (now - s[0] >= (dir === "up" ? 2000 : 1000)) ref = s; else break; }
    onTick(mbit(total - ref[1], now - ref[0]), now / PHASE_MS);
    if (now >= PHASE_MS) finish();
  }, 100);

  await Promise.all([...Array.from({ length: STREAMS }, stream), pinger()]);
  clearInterval(ticker);
  clearTimeout(drainTimer);
  signal.removeEventListener("abort", stop);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  const end = performance.now() - t0;
  if (!total) throw Object.assign(new Error(t(dir === "down" ? "errNoDown" : "errNoUp")), { status: limited ? 429 : undefined });
  samples.push([end, total]);
  // Bytes moved between two moments. Download: interpolated from the 100 ms samples. Upload: each finished chunk
  // is spread evenly over the time it took (it only counts once it's done).
  const at = time => {
    const i = samples.findIndex(s => s[0] >= time);
    if (i <= 0) return i < 0 ? total : samples[0][1];
    const [t1, b1] = samples[i - 1], [t2, b2] = samples[i];
    return b1 + (b2 - b1) * (time - t1) / Math.max(1, t2 - t1);
  };
  const between = dir === "up"
    ? (a, b) => chunks.reduce((sum, c) => sum + c.n * Math.max(0, Math.min(c.e, b) - Math.max(c.s, a)) / Math.max(1, c.e - c.s), 0)
    : (a, b) => at(b) - at(a);
  // Result: 90th percentile of the one-second rates after the warm-up, like Cloudflare's 90th percentile per
  // request. Wi‑Fi dips and the pauses between requests don't drag it down, and no single burst decides it.
  // A run that hit the data cap (or errors) before the warm-up was over counts as a whole.
  const w = end > WARMUP_MS * 2 ? WARMUP_MS : 0, rates = [];
  for (let time = w + 1000; time <= end; time += 100) rates.push(mbit(between(time - 1000, time), 1000));
  const mbps = rates.length >= 5 ? percentile(rates, .9) : mbit(between(w, end), end - w);
  return { mbps, bytes: total, loaded: median(loaded), errors, limited, kinds };
}

async function runTest() {
  stopCov();
  const ctrl = new AbortController();
  running = ctrl;
  setRunning(true);
  setBanner("");
  for (const id of ["sDown", "sUp", "sPing", "sJitter", "sLoaded", "sData"]) $(id).textContent = "–";
  $("grade").hidden = true;
  const r = { at: Date.now(), conn, plan, saver, bytes: 0, errors: 0, limited: 0, errKinds: {} };
  const T0 = performance.now(), sec = () => (performance.now() - T0) / 1000;
  series = { phases: {}, down: [], up: [], ping: [] };
  drawChart();

  try {
    // 1. ping and jitter on an idle line (first request warms up the connection and isn't counted)
    gauge({ num: "…", ms: true, phase: "phPing" });
    progress(0);
    await ping(ctrl.signal);
    const pings = [];
    for (let i = 0; i < PINGS; i++) {
      pings.push(await ping(ctrl.signal));
      series.ping.push([sec(), pings.at(-1), "idle"]);
      const m = median(pings);
      gauge({ num: m, ms: true, phase: "phPing" });
      $("sPing").textContent = fmtMs(m);
      progress(.1 * (i + 1) / PINGS);
    }
    r.ping = median(pings);
    r.jitter = jitterOf(pings);
    $("sJitter").textContent = fmtMs(r.jitter);
    Object.assign(r, server);
    showWhere(r);

    // 2. download, 3. upload
    for (const [dir, phase, base] of [["down", "phDown", .1], ["up", "phUp", .55]]) {
      series.phases[dir] = [sec(), null];
      const out = await throughput(dir, ctrl.signal, {
        capped: r.saver,
        onTick: (live, f) => {
          series[dir].push([sec(), live]);
          series.phases[dir][1] = sec();
          gauge({ num: live, speed: live, phase, dir });
          $(dir === "down" ? "sDown" : "sUp").textContent = fmtSpeed(live);
          progress(base + .45 * Math.min(1, f));
          drawChart();
        },
        onPing: ms => series.ping.push([sec(), ms, dir]),
      });
      series.phases[dir][1] = sec();
      r[dir] = out.mbps;
      r[dir === "down" ? "loadedDown" : "loadedUp"] = out.loaded;
      r.bytes += out.bytes;
      r.errors += out.errors;
      r.limited += out.limited;
      for (const [k, n] of Object.entries(out.kinds)) r.errKinds[k] = (r.errKinds[k] || 0) + n;
      $(dir === "down" ? "sDown" : "sUp").textContent = fmtSpeed(out.mbps);
      $("sData").textContent = fmtMB(r.bytes);
    }

    progress(1);
    series.end = sec();
    series.result = { down: r1(r.down), up: r1(r.up) };
    r.series = packSeries(series);
    last = r;
    history = [r, ...history].slice(0, 20);
    store.set("nf_hist", history);
    showResult(r);
  } catch (e) {
    if (e.name === "AbortError") { gauge({ phase: "phAborted" }); progress(0); }
    else {
      // fetch() rejects with a TypeError when the server can't be reached at all (offline, blocked, CORS)
      gauge({ phase: "phFailed" });
      setBanner(e.status === 429 ? t("errLimited") : t("errBanner", { msg: e instanceof TypeError ? t("errReach") : e.message || t("errUnknown") }));
    }
    if (last) showResult(last, true);
  } finally {
    running = null;
    setRunning(false);
    if (series && series.end == null) series.end = sec();
    drawChart();
  }
}

// The big button runs the speed test, or (in the coverage view) starts and stops the coverage walk.
function setRunning() {
  const busy = !!running || (view === "cover" && !!cov);
  $("startBtn").classList.toggle("stop", busy);
  $("startTxt").textContent = t(running ? "cancel" : view === "cover" ? (cov ? "covStop" : "covStart") : last ? "testAgain" : "startTest");
  $("startBtn").querySelector("svg").toggleAttribute("hidden", busy);
  $("saverIn").disabled = !!running || !!cov;
  $("shareBtn").hidden = !!running || !last;
}
const setBanner = text => { $("banner").textContent = text; $("banner").hidden = !text; };

function showWhere(r) {
  // the data centre is only known when Cloudflare exposes its cf-meta headers; the test always runs against Cloudflare
  const bits = [r.colo ? `Cloudflare ${r.colo}` : r.http && "Cloudflare", r.city, r.isp, r.http].filter(Boolean);
  $("where").textContent = bits.length ? bits.join(" · ") : "–";
}

// ---------- graph view ----------
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const packSeries = sr => ({
  end: r2(sr.end), result: sr.result, phases: Object.fromEntries(Object.entries(sr.phases).map(([k, [a, b]]) => [k, [r2(a), r2(b)]])),
  down: sr.down.map(([x, v]) => [r2(x), r1(v)]), up: sr.up.map(([x, v]) => [r2(x), r1(v)]),
  ping: sr.ping.map(([x, v, p]) => [r2(x), r1(v), p]),
});
const niceMax = v => {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= v);
};
const fmtSec = v => v.toLocaleString(locale(), { maximumFractionDigits: 1 });
// layout in viewBox units: speed plot on top, ping plot below, same time axis
const CW = 340, PL = 34, PR = 38, AT = 16, AH = 120, BT = 166, BH = 44;
const COLOR = { down: "var(--yellow)", up: "var(--sky)", idle: "#8fa7bb" };
let chartScale = null;  // what the hover layer needs to map a pointer position back to the data

function drawChart() {
  if (view !== "graph") return;
  $("chartEmpty").hidden = !!series;
  $("chartSvg").toggleAttribute("hidden", !series);
  hideTip();
  if (!series) return;
  const sr = series, live = sr.end == null;
  const lastT = Math.max(0, ...[...sr.down, ...sr.up, ...sr.ping].map(p => p[0]));
  // while running, leave room for the rest of the test so the lines don't keep rescaling
  const tMax = live ? Math.max(lastT + 1, (sr.phases.down ? sr.phases.down[0] : lastT) + 17.5) : Math.max(1, sr.end);
  const x = v => PL + (CW - PL - PR) * v / tMax;
  const result = sr.result;  // the final numbers, once the test is done
  const peak = Math.max(...sr.down.map(p => p[1]), ...sr.up.map(p => p[1]), result?.down || 0, result?.up || 0);
  const vMax = niceMax(peak), pMax = niceMax(Math.max(...sr.ping.map(p => p[1])));
  const ya = v => AT + AH - AH * Math.min(v, vMax) / vMax, yb = v => BT + BH - BH * Math.min(v, pMax) / pMax;
  let g = "";
  // phase bands
  for (const dir of ["down", "up"]) {
    const ph = sr.phases[dir];
    if (!ph) continue;
    const a = x(ph[0]), b = x(ph[1] ?? lastT);
    g += `<rect class="band" x="${a.toFixed(1)}" y="${AT}" width="${Math.max(0, b - a).toFixed(1)}" height="${BT + BH - AT}"/>`;
    g += `<text class="bandlbl" x="${(a + 4).toFixed(1)}" y="${AT - 5}">${esc(t(dir))}</text>`;
  }
  // speed grid + axis
  g += `<text class="ttl" x="0" y="${AT - 9}">${esc(t("chartSpeed").split(" · ")[1])}</text>`;
  for (const v of [0, vMax / 2, vMax]) {
    g += `<line class="grid" x1="${PL}" x2="${CW - PR}" y1="${ya(v).toFixed(1)}" y2="${ya(v).toFixed(1)}"/>`;
    g += `<text class="axis" x="${PL - 9}" y="${(ya(v) + 3).toFixed(1)}" text-anchor="end">${esc(fmtSpeed(v))}</text>`;
  }
  // speed lines, each ending in a dot with its value (the final result once the test is done)
  for (const dir of ["down", "up"]) {
    const pts = sr[dir];
    if (!pts.length) continue;
    g += `<path class="line ${dir}" d="${pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${ya(p[1]).toFixed(1)}`).join("")}"/>`;
    const [lx, lv] = pts.at(-1), val = result ? result[dir] : lv;
    const ex = x(lx), ey = ya(lv);
    // the label sits above the highest point of the line under it (it spans ~30 units left of the end dot)
    const top = ya(Math.max(...pts.filter(p => x(p[0]) >= ex - 30).map(p => p[1])));
    g += `<circle class="end" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4" fill="${COLOR[dir]}"/>`;
    g += `<text class="endlbl" x="${(ex - 6).toFixed(1)}" y="${(top < AT + 14 ? ey + 16 : top - 8).toFixed(1)}" text-anchor="end">${esc(fmtSpeed(val))}</text>`;
  }
  // ping plot: every ping as a dot, coloured by the phase it was taken in
  for (const v of [0, pMax]) {
    g += `<line class="grid" x1="${PL}" x2="${CW - PR}" y1="${yb(v).toFixed(1)}" y2="${yb(v).toFixed(1)}"/>`;
    g += `<text class="axis" x="${PL - 9}" y="${(yb(v) + 3).toFixed(1)}" text-anchor="end">${esc(fmtMs(v))}</text>`;
  }
  g += `<text class="ttl" x="0" y="${BT - 10}">${esc(t("chartPing"))}</text>`;
  for (const [px, pv, ph] of sr.ping) g += `<circle class="dot" cx="${x(px).toFixed(1)}" cy="${yb(pv).toFixed(1)}" r="2.6" fill="${COLOR[ph]}"/>`;
  // time axis
  const step = tMax > 30 ? 8 : tMax > 14 ? 4 : 2;
  for (let v = 0; v <= tMax + .01; v += step) g += `<text class="axis" x="${x(v).toFixed(1)}" y="${BT + BH + 14}" text-anchor="middle">${v} ${esc(t("sec"))}</text>`;
  g += `<line class="cross" id="chartCross" x1="0" x2="0" y1="${AT}" y2="${BT + BH}" visibility="hidden"/>`;
  g += `<rect id="chartHit" x="${PL}" y="${AT - 10}" width="${CW - PL - PR}" height="${BT + BH - AT + 24}" fill="transparent"/>`;
  $("chartSvg").innerHTML = g;
  chartScale = { tMax, x };
  const maxLoaded = Math.max(0, ...sr.ping.filter(p => p[2] !== "idle").map(p => p[1]));
  const idle = median(sr.ping.filter(p => p[2] === "idle").map(p => p[1]));
  $("chartSvg").setAttribute("aria-label", t("chartAria", {
    down: fmtSpeed(result ? result.down : sr.down.at(-1)?.[1]), up: fmtSpeed(result ? result.up : sr.up.at(-1)?.[1]),
    ping: fmtMs(idle), max: fmtMs(maxLoaded || idle),
  }));
}

// hover / touch: a crosshair and the values at that moment
function hideTip() { $("chartTip").hidden = true; $("chartCross")?.setAttribute("visibility", "hidden"); }
function showTip(ev) {
  if (!series || !chartScale) return;
  const svg = $("chartSvg"), pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM().inverse());
  const tAt = Math.max(0, Math.min(chartScale.tMax, (pt.x - PL) / (CW - PL - PR) * chartScale.tMax));
  const near = pts => pts.reduce((best, p) => !best || Math.abs(p[0] - tAt) < Math.abs(best[0] - tAt) ? p : best, null);
  const rows = [];
  for (const dir of ["down", "up"]) {
    const ph = series.phases[dir], p = ph && tAt >= ph[0] && tAt <= (ph[1] ?? Infinity) ? near(series[dir]) : null;
    if (p) rows.push(`<i style="background:${COLOR[dir]}"></i>${esc(t(dir))} <b>${esc(fmtSpeed(p[1]))}</b> Mbit/s`);
  }
  const pp = near(series.ping);
  if (pp && Math.abs(pp[0] - tAt) < .8) rows.push(`<i style="background:${COLOR[pp[2]]}"></i>${esc(t("ping"))} <b>${esc(fmtMs(pp[1]))}</b> ms`);
  const cx = chartScale.x(tAt);
  $("chartCross").setAttribute("x1", cx); $("chartCross").setAttribute("x2", cx); $("chartCross").setAttribute("visibility", "visible");
  const tip = $("chartTip");
  tip.innerHTML = `${esc(fmtSec(tAt))} ${esc(t("sec"))}${rows.length ? "<br>" + rows.join("<br>") : ""}`;
  tip.hidden = false;
  const box = $("chartWrap").getBoundingClientRect(), rel = (ev.clientX - box.left) / box.width;
  tip.style.left = `${Math.min(Math.max(rel * 100, 18), 82)}%`;
}
$("chartSvg").addEventListener("pointermove", e => { if (e.target.id === "chartHit" || e.target.closest("#chartSvg")) showTip(e); });
$("chartSvg").addEventListener("pointerleave", hideTip);

function setView(v) {
  view = v;
  store.set("nf_view", v);
  for (const b of $("viewTabs").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.view === v));
  $("meter").classList.toggle("graph", v === "graph");
  $("meter").classList.toggle("cover", v === "cover");
  $("chartWrap").hidden = v !== "graph";
  $("covWrap").hidden = $("covTools").hidden = v !== "cover";
  $("runHelp").hidden = v === "cover";
  setRunning();
  drawChart();
  drawCov();
}
$("viewTabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setView(b.dataset.view); });

// ---------- coverage walk ----------
// The browser can't read the Wi‑Fi signal, so coverage is measured by what it causes: a ping twice a second
// (lost pings count) and, unless «Spar data» is on, a short download every other second sized to take ~0.3 s.
// The user walks around and marks spots; a spot is the median of the last few seconds.
const COV_SPAN = 90, SPOT_SECS = 6, ROOMS = ["roomLiving", "roomKitchen", "roomBedroom", "roomOffice", "roomBath", "roomHall", "roomUp", "roomOut"];
let cov = null;   // { ctrl, t0, pts: [[sec, mbps|null, ms|null]], marks: [[sec, name]], bytes, lock }
let lastCov = null;  // the finished walk stays on screen until a new one starts
let spots = store.get("nf_spots", []);
const covSec = () => (performance.now() - cov.t0) / 1000;

// abort a single request after `ms`, or when the walk stops (a dead spot can leave a request hanging)
async function timed(signal, ms, fn) {
  const c = new AbortController(), stop = () => c.abort();
  const timer = setTimeout(stop, ms);
  signal.addEventListener("abort", stop, { once: true });
  try { return await fn(c.signal); } finally { clearTimeout(timer); signal.removeEventListener("abort", stop); }
}

// A short download timed from its first to its last byte (Resource Timing), so the round trip and the
// server's start-up don't count; a short probe on one connection still reads lower than the full test.
async function probe(size, add, signal) {
  const url = `${SPEED}/__down?bytes=${size}&r=${rnd()}`, t0 = performance.now();
  const res = await fetch(url, { cache: "no-store", signal });
  if (!res.ok) throw httpError(res);
  const rd = res.body.getReader();
  for (;;) { const { done, value } = await rd.read(); if (done) break; add(value.byteLength); }
  const e = performance.getEntriesByName(url).pop();
  performance.clearResourceTimings();
  const ms = e && e.responseEnd > e.responseStart && e.responseStart > 0 ? e.responseEnd - e.responseStart : performance.now() - t0;
  return mbit(size, Math.max(1, ms));
}

async function covLoop(c) {
  let size = 512e3, nextProbe = 0;
  while (!c.ctrl.signal.aborted) {
    let ms = null, mbps = null;
    try { ms = await timed(c.ctrl.signal, 2000, ping); } catch {}
    if (c.ctrl.signal.aborted) break;
    if (!saver && covSec() >= nextProbe) {
      nextProbe = covSec() + 2;
      try {
        mbps = await timed(c.ctrl.signal, 4000, sig => probe(size, n => { c.bytes += n; }, sig));
        size = Math.min(24e6, Math.max(256e3, mbps * 1e6 / 8 * .3));
      } catch { size = 256e3; }
      if (c.ctrl.signal.aborted) break;
    }
    c.pts.push([covSec(), mbps, ms]);
    updateCovNow();
    drawCov();
    await sleep(ms == null ? 200 : 450, c.ctrl.signal);
  }
}

async function startCov() {
  if (cov || running) return;
  cov = { ctrl: new AbortController(), t0: performance.now(), pts: [], marks: [], bytes: 0, lock: null };
  try { cov.lock = await navigator.wakeLock?.request("screen"); } catch {}
  setRunning();
  updateCovNow();
  drawCov();
  covLoop(cov);
}
function stopCov() {
  if (!cov) return;
  cov.ctrl.abort();
  cov.lock?.release?.().catch(() => {});
  lastCov = cov;
  cov = null;
  setRunning();
  updateCovNow();
  drawCov();
}
// the screen lock is dropped when the page is hidden; take it again when the user comes back
document.addEventListener("visibilitychange", async () => {
  if (cov && document.visibilityState === "visible" && (!cov.lock || cov.lock.released)) try { cov.lock = await navigator.wakeLock?.request("screen"); } catch {}
});

// a spot (or the "now" readout): medians over the last few seconds of the walk
function recent(c, secs) {
  const end = c.pts.at(-1)?.[0] ?? 0, pts = c.pts.filter(p => p[0] >= end - secs);
  const pings = pts.map(p => p[2]).filter(v => v != null), speeds = pts.map(p => p[1]).filter(v => v != null);
  const jitter = jitterOf(pings);
  return { n: pings.length, down: speeds.length ? median(speeds) : null, ping: median(pings), jitter, loss: pts.length ? pts.filter(p => p[2] == null).length / pts.length : 0 };
}
// 3 excellent, 2 good, 1 weak, 0 poor
function quality(sp) {
  if (sp.loss > .1 || !(sp.ping <= 100) || (sp.down != null && sp.down < 5)) return 0;
  if (sp.loss > 0 || sp.ping > 40 || sp.jitter > 20 || (sp.down != null && sp.down < 20)) return 1;
  if (sp.ping > 20 || (sp.down != null && sp.down < 75)) return 2;
  return 3;
}
const Q_KEY = ["qPoor", "qWeak", "qGood", "qGreat"];

function updateCovNow() {
  const c = cov || lastCov;
  $("covPhase").textContent = t(cov ? "covLive" : "covPhase");
  const w = c && c.pts.length ? recent(c, 3) : null;
  $("covNow").textContent = w && w.n ? `${w.down != null ? fmtSpeed(w.down) + " Mbit/s · " : ""}${fmtMs(w.ping)} ms` : "–";
  const secs = c && c.pts.length ? Math.round(c.pts.at(-1)[0]) : 0;
  $("covMeta").textContent = c ? t("covMeta", { time: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, data: fmtMB(c.bytes) }) : "";
  const ready = !!cov && recent(cov, SPOT_SECS).n >= 3;
  $("markBtn").disabled = !ready;
  for (const b of $("spotChips").querySelectorAll("button")) b.disabled = !ready;
}

function markSpot(name) {
  name = String(name || "").trim().slice(0, 30);
  if (!cov || !name) return;
  const w = recent(cov, SPOT_SECS);
  if (w.n < 3) return setBanner(t("covNeedMore"));
  cov.marks.push([covSec(), name]);
  spots = [{ name, at: Date.now(), down: w.down == null ? null : r1(w.down), ping: r1(w.ping), jitter: w.jitter == null ? null : r1(w.jitter), loss: r2(w.loss) },
    ...spots.filter(s => s.name.toLowerCase() !== name.toLowerCase())].slice(0, 30);
  store.set("nf_spots", spots);
  $("spotName").value = "";
  renderSpots();
  drawCov();
}

function renderChips() {
  $("spotChips").innerHTML = ROOMS.map(k => `<button type="button" class="chip" data-room="${k}">${esc(t(k))}</button>`).join("");
  updateCovNow();
}

function renderSpots() {
  $("spotsHead").hidden = !spots.length;
  // best first: by speed when it was measured, otherwise by ping
  const list = [...spots].sort((a, b) => quality(b) - quality(a) || (b.down ?? 0) - (a.down ?? 0) || a.ping - b.ping);
  const best = Math.max(1, ...list.map(s => s.down ?? 0));
  $("spots").innerHTML = list.map(s => {
    const q = quality(s);
    const val = [s.down != null && `${fmtSpeed(s.down)} Mbit/s`, `${t("ping")} ${fmtMs(s.ping)} ms`, s.jitter != null && `${t("jitter")} ${fmtMs(s.jitter)} ms`, s.loss > 0 && t("spotLoss", { pct: Math.round(s.loss * 100) })].filter(Boolean).join(" · ");
    return `<li class="spot"><span class="nm">${esc(s.name)}</span><span class="q q${q}">${esc(t(Q_KEY[q]))}</span>${s.down != null ? `<span class="bar" aria-hidden="true"><i style="width:${Math.max(2, s.down / best * 100).toFixed(1)}%"></i></span>` : ""}<span class="val">${esc(val)}</span></li>`;
  }).join("");
  const sum = [];
  if (list.length) sum.push(t("covBest", { name: list[0].name }));
  if (list.length > 1 && quality(list.at(-1)) <= 1) sum.push(t("covWeakTip", { name: list.at(-1).name, best: list[0].name }));
  else if (list.length > 1) sum.push(t("covAllGood"));
  $("covSummary").textContent = sum.join(" ");
}

// rolling graph of the last 90 s: speed probes on top, pings (and lost pings) below, marked spots as lines
function drawCov() {
  if (view !== "cover") return;
  const c = cov || lastCov;
  const has = !!c && c.pts.length > 0;
  $("covEmpty").hidden = has;
  $("covSvg").toggleAttribute("hidden", !has);
  if (!has) return;
  const end = c.pts.at(-1)[0], t1 = Math.max(COV_SPAN, end), t0 = t1 - COV_SPAN;
  const x = v => PL + (CW - PL - PR) * (v - t0) / COV_SPAN;
  const pts = c.pts.filter(p => p[0] >= t0);
  const speeds = pts.filter(p => p[1] != null), pings = pts.filter(p => p[2] != null);
  const vMax = niceMax(Math.max(...speeds.map(p => p[1]), 1)), pMax = niceMax(Math.max(...pings.map(p => p[2]), 1));
  const ya = v => AT + AH - AH * Math.min(v, vMax) / vMax, yb = v => BT + BH - BH * Math.min(v, pMax) / pMax;
  let g = `<text class="ttl" x="0" y="${AT - 9}">${esc(t("chartSpeed").split(" · ")[1])}</text>`;
  for (const v of [0, vMax / 2, vMax]) {
    g += `<line class="grid" x1="${PL}" x2="${CW - PR}" y1="${ya(v).toFixed(1)}" y2="${ya(v).toFixed(1)}"/>`;
    g += `<text class="axis" x="${PL - 9}" y="${(ya(v) + 3).toFixed(1)}" text-anchor="end">${esc(fmtSpeed(v))}</text>`;
  }
  // speed line, broken where probes are missing (failed, or more than 6 s apart)
  let d = "";
  speeds.forEach((p, i) => { d += `${i && p[0] - speeds[i - 1][0] <= 6 ? "L" : "M"}${x(p[0]).toFixed(1)} ${ya(p[1]).toFixed(1)}`; });
  if (d) g += `<path class="line down" d="${d}"/>`;
  if (speeds.length) { const p = speeds.at(-1); g += `<circle class="end" cx="${x(p[0]).toFixed(1)}" cy="${ya(p[1]).toFixed(1)}" r="4" fill="var(--yellow)"/>`; }
  g += `<text class="ttl" x="0" y="${BT - 10}">${esc(t("chartPing"))}</text>`;
  for (const v of [0, pMax]) {
    g += `<line class="grid" x1="${PL}" x2="${CW - PR}" y1="${yb(v).toFixed(1)}" y2="${yb(v).toFixed(1)}"/>`;
    g += `<text class="axis" x="${PL - 9}" y="${(yb(v) + 3).toFixed(1)}" text-anchor="end">${esc(fmtMs(v))}</text>`;
  }
  for (const p of pts) {
    const px = x(p[0]).toFixed(1);
    g += p[2] == null
      ? `<path class="lost" d="M${px - 3} ${BT - 3}l6 6m0 -6l-6 6"/>`
      : `<circle class="dot" cx="${px}" cy="${yb(p[2]).toFixed(1)}" r="2.4" fill="#8fa7bb"/>`;
  }
  // spot names on two rows above/inside the top of the plot; a name that fits on neither keeps just its line
  const rowEnd = [-Infinity, -Infinity];
  for (const [mx, name] of c.marks.filter(m => m[0] >= t0)) {
    const px = x(mx), label = name.length > 12 ? name.slice(0, 11) + "…" : name, w = label.length * 5.4;
    const lx = Math.min(CW - PR - w / 2, Math.max(PL + w / 2, px));
    g += `<line class="mark" x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${AT}" y2="${BT + BH}"/>`;
    const row = rowEnd.findIndex(e => lx - w / 2 > e + 4);
    if (row < 0) continue;
    rowEnd[row] = lx + w / 2;
    g += `<text class="marklbl" x="${lx.toFixed(1)}" y="${row ? AT + 8 : AT - 4}" text-anchor="middle">${esc(label)}</text>`;
  }
  // time axis as minutes:seconds since the walk started
  for (let v = Math.ceil(t0 / 15) * 15; v <= t1 + .01; v += 15) g += `<text class="axis" x="${x(v).toFixed(1)}" y="${BT + BH + 14}" text-anchor="middle">${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}</text>`;
  $("covSvg").innerHTML = g;
  $("covSvg").setAttribute("aria-label", t("covAria", { sec: COV_SPAN }));
}

$("markBtn").addEventListener("click", () => $("spotName").value.trim() ? markSpot($("spotName").value) : $("spotName").focus());
$("spotName").addEventListener("keydown", e => { if (e.key === "Enter" && !$("markBtn").disabled) $("markBtn").click(); });
$("spotChips").addEventListener("click", e => { const b = e.target.closest("button"); if (b && !b.disabled) markSpot(t(b.dataset.room)); });
$("spotsClear").addEventListener("click", () => {
  if (!confirm(t("confirmSpots"))) return;
  spots = [];
  store.set("nf_spots", spots);
  renderSpots();
});

// ---------- results ----------
function grade(r) {
  if (r.down >= 300 && r.ping <= 30) return "gradeBlazing";
  if (r.down >= 100) return "gradeFast";
  if (r.down >= 25) return "gradeOk";
  if (r.down >= 5) return "gradeSlow";
  return "gradeVerySlow";
}

function showResult(r, keepGauge) {
  if (!keepGauge) { gauge({ num: r.down, speed: r.down, phase: "phDone" }); series = r.series || null; drawChart(); openSugs = null; }
  $("sDown").textContent = fmtSpeed(r.down);
  $("sUp").textContent = fmtSpeed(r.up);
  $("sPing").textContent = fmtMs(r.ping);
  $("sJitter").textContent = fmtMs(r.jitter);
  // ping while downloading / uploading, shown side by side like speedtest.net
  const ld = [r.loadedDown, r.loadedUp].map(v => v ? fmtMs(v) : "–").join("/");
  $("sLoaded").innerHTML = r.loadedDown || r.loadedUp ? `${ld}<small>ms</small>` : "–";
  $("sData").textContent = fmtMB(r.bytes);
  $("grade").textContent = t(grade(r));
  $("grade").hidden = false;
  showWhere(r);
  renderAdvice();
  renderHistory();
}

const bloatOf = r => Math.max((r.loadedDown || r.ping) - r.ping, (r.loadedUp || r.ping) - r.ping);

function renderUses(r) {
  const bloat = bloatOf(r);
  const uses = [
    ["useWeb", r.down >= 3 && r.ping <= 150 ? 2 : r.down >= 1 ? 1 : 0],
    ["useHd", r.down >= 10 ? 2 : r.down >= 5 ? 1 : 0],
    ["use4k", r.down >= 25 ? 2 : r.down >= 15 ? 1 : 0],
    ["useCalls", r.up >= 3 && r.down >= 5 && r.jitter <= 30 && r.ping <= 150 ? (bloat > 150 ? 1 : 2) : r.up >= 1 && r.down >= 2 ? 1 : 0],
    ["useGaming", r.ping <= 40 && r.jitter <= 10 && bloat <= 100 ? 2 : r.ping <= 80 && r.jitter <= 30 ? 1 : 0],
    ["useFiles", r.up >= 20 && r.down >= 100 ? 2 : r.up >= 5 && r.down >= 25 ? 1 : 0],
  ];
  const cls = ["bad", "ok", "good"], txt = ["stBad", "stOk", "stGood"];
  $("uses").innerHTML = uses.map(([n, s]) => `<div class="use ${cls[s]}"><span class="nm">${esc(t(n))}</span><span class="st">${esc(t(txt[s]))}</span></div>`).join("");
  $("usesWrap").hidden = false;
}

// The advice: one card per problem found (what it means + what to do), then a card for the medium
// (Wi‑Fi / mobile) with the fixes that help almost every problem there, so they aren't repeated on every card.
// Cards hold message keys (plus values for the placeholders), so they follow the chosen language.
function advise(r) {
  const out = [], add = (level, title, why, steps = [], note = "") => out.push({ level, title, why, steps, note });
  const wifi = r.conn === "wifi", cable = r.conn === "cable", mobile = r.conn === "mobile";
  const bloat = bloatOf(r), upBloat = (r.loadedUp || 0) > (r.loadedDown || 0);
  const nordic = ["OSL", "ARN", "CPH", "HEL", "GOT", "BGO", "SVG", "TRD", "KRS", "TOS"];
  let medium = false, ring = false;

  if (r.limited > 0) add("warn", "limitTitle", ["limitWhy", { n: r.limited }], ["limitS1"]);

  const pct = r.plan ? r.down / r.plan : 1;
  if (r.plan && cable && r.plan > 100 && r.down >= 80 && r.down <= 97) {
    add("bad", "capTitle", ["capWhy", { plan: r.plan }], ["capS1", "capS2", "capS3", "capS4"]);
  } else if (r.plan && pct < .5) {
    const steps = [];
    if (wifi) steps.push("planCable");
    if (wifi && r.plan >= 300) steps.push(["planOldRouter", { plan: r.plan }]);
    steps.push("restart", "planOthers", "planIsp");
    add(pct < .25 ? "bad" : "warn", "planTitle", ["planWhy", { down: fmtSpeed(r.down), plan: r.plan, pct: Math.round(pct * 100) }], steps);
    medium = ring = true;
  } else if (r.down < 25) {
    add(r.down < 10 ? "bad" : "warn", r.down < 10 ? "slowTitleBad" : "slowTitleWarn",
      [r.down < 5 ? "slowWhy1" : r.down < 10 ? "slowWhy2" : "slowWhy3", { down: fmtSpeed(r.down) }],
      [mobile ? "slowQuota" : "slowOthers", ...(cable ? ["restart"] : []), "slowPlan"]);
    medium = true;
    if (r.down < 10 && !mobile) ring = true;
  }

  if (r.ping > 50) {
    const far = r.colo && !nordic.includes(r.colo) && (!r.country || r.country === "NO");
    add(r.ping > 100 ? "bad" : "warn", "pingTitle", ["pingWhy", { ping: fmtMs(r.ping) }],
      ["pingVpn", ...(far ? [["pingFar", { colo: r.colo }]] : []), "pingOthers", mobile ? "pingMobile" : "restartRouter"]);
    medium = true;
  }

  if (r.jitter > 15) {
    add(r.jitter > 30 ? "bad" : "warn", "jitTitle", ["jitWhy", { jitter: fmtMs(r.jitter) }], ["bgUploads", wifi ? "jitCable" : "jitLater"]);
    medium = true;
  }

  if (bloat > 60) {
    add(bloat > 150 ? "bad" : "warn", "bloatTitle", [upBloat ? "bloatWhyUp" : "bloatWhy", { from: fmtMs(r.ping), to: fmtMs(r.ping + bloat) }],
      ["bloatS1", "bloatS2", upBloat ? "bloatUpNight" : "bloatDownNight", "bloatRouter"]);
  }

  if (r.up < 5 || (r.down >= 50 && r.up < r.down / 15 && r.up < 10)) {
    add(r.up < 2 ? "bad" : "warn", "upTitle", ["upWhy", { up: fmtSpeed(r.up) }], ["bgUploads", "upPlan", ...(wifi ? ["upWifi"] : [])]);
    medium = true;
  }

  // Failed requests alone don't prove a bad connection: a rate-limited Cloudflare answer without CORS headers
  // looks just like a network error to the browser. Only mention them when something else points to trouble too.
  if (r.errors > 0 && out.some(s => s.level === "bad" || s.level === "warn"))
    add("warn", "errTitle", [r.errors === 1 ? "errWhy1" : "errWhyN", { n: r.errors }], ["errS1", "restart"],
      Object.entries(r.errKinds || {}).map(([k, n]) => `${k} × ${n}`).join(", "));

  // fixes for the medium itself
  if (medium && wifi) add("fix", "wifiTitle", "wifiWhy", ["wifi1", "wifi2", "wifi3", "wifi4", "restartRouter", "wifi5"]);
  if (medium && mobile) add("fix", "mobTitle", "mobWhy", ["mob1", "mob2", "mob3", "mob4", "mob5"]);
  if (ring) {
    add("tip", mobile ? "ringTitleMobile" : "ringTitle", "ringWhy",
      mobile ? ["ringM1", "ringM2", "ringCopy"] : ["ring1", "ring2", "ring3", "ringCopy"]);
  }

  if (!out.some(s => s.level === "bad" || s.level === "warn")) {
    // a good result needs no fixes; only a tip that can still tell the user something new
    const steps = [];
    if (!r.plan) steps.push("goodPlan");
    else if (wifi && r.down < r.plan * .8) steps.push("goodCable");
    out.unshift({ level: "good", title: "goodTitle", why: "goodWhy", steps });
  }
  const order = { bad: 0, warn: 1, good: 2, fix: 3, tip: 4 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
// A message is a key, or [key, values] when it has placeholders.
const msg = m => Array.isArray(m) ? t(m[0], m[1]) : t(m);

function renderAdvice() {
  if (!last) return;
  const r = { ...last, conn, plan };
  renderUses(r);
  const tags = { bad: "tagBad", warn: "tagWarn", fix: "tagFix", tip: "tagTip", good: "tagGood" };
  const list = advise(r);
  const problems = list.filter(s => s.level === "bad" || s.level === "warn").length;
  $("sugTitle").textContent = problems ? t("sugTitleN", { n: problems }) : t("sugTitle");
  // one row per finding; the most important one starts open, and what the user opens stays open on redraws
  const key = s => Array.isArray(s.title) ? s.title[0] : s.title;
  if (!openSugs) openSugs = new Set(list.length ? [key(list[0])] : []);
  $("sugs").innerHTML = list.map(s => `
    <details class="sug ${s.level}" data-key="${esc(key(s))}"${openSugs.has(key(s)) ? " open" : ""}>
      <summary><span class="tag">${esc(t(tags[s.level]))}</span><h3>${esc(msg(s.title))}</h3><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
      <div class="sug-body">
        <p>${esc(msg(s.why))}</p>
        ${s.note ? `<p class="sug-note">${esc(t("errKinds", { list: s.note }))}</p>` : ""}
        ${s.steps.length ? `<ol>${s.steps.map(step => `<li><span>${esc(msg(step))}</span></li>`).join("")}</ol>` : ""}
      </div>
    </details>`).join("");
  $("sugWrap").hidden = false;
}
let openSugs = null;  // titles of the open findings; reset for each new result
$("sugs").addEventListener("toggle", e => {
  const d = e.target;
  if (!d.dataset?.key || !openSugs) return;
  d.open ? openSugs.add(d.dataset.key) : openSugs.delete(d.dataset.key);
}, true);

function renderHistory() {
  $("histWrap").hidden = !history.length;
  const d = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  $("hist").innerHTML = history.map(h => `
    <li class="hrow">
      <span class="when">${esc(d.format(h.at))} · ${esc(CONN_KEY[h.conn] ? t(CONN_KEY[h.conn]) : "")}</span>
      <span class="v">${fmtSpeed(h.down)} <small>${esc(t("histDown"))}</small></span>
      <span class="v">${fmtSpeed(h.up)} <small>${esc(t("histUp"))}</small></span>
      <span class="v">${fmtMs(h.ping)} <small>ms</small></span>
    </li>`).join("");
}

function summary(r) {
  const d = new Intl.DateTimeFormat(locale(), { dateStyle: "short", timeStyle: "short" }).format(r.at);
  return [
    `Nettfart ${d}`,
    t("sumDown", { v: fmtSpeed(r.down) }),
    t("sumUp", { v: fmtSpeed(r.up) }),
    t("sumPing", { ping: fmtMs(r.ping), jitter: fmtMs(r.jitter) }),
    t("sumLoaded", { d: fmtMs(r.loadedDown), u: fmtMs(r.loadedUp) }),
    t("sumConn", { conn: CONN_KEY[conn] ? t(CONN_KEY[conn]) : t("unknown") }) + (plan ? t("sumPlan", { plan }) : ""),
    [r.colo && t("sumServer", { colo: r.colo }), r.isp].filter(Boolean).join(" · "),
  ].filter(Boolean).join("\n");
}

// ---------- events ----------
$("startBtn").addEventListener("click", () => {
  if (running) running.abort();
  else if (view === "cover") cov ? stopCov() : startCov();
  else runTest();
});

function setConn(c) {
  conn = c;
  store.set("nf_conn", c);
  for (const b of $("connSeg").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.conn === c));
  renderAdvice();
}
$("connSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setConn(b.dataset.conn); });

$("saverIn").checked = saver;
$("saverIn").addEventListener("change", () => { saver = $("saverIn").checked; store.set("nf_saver", saver); });

$("planIn").value = plan || "";
$("planIn").addEventListener("input", () => {
  const v = parseInt($("planIn").value.replace(/\D/g, ""), 10);
  plan = v > 0 ? v : null;
  store.set("nf_plan", plan);
  renderAdvice();
});

$("shareBtn").addEventListener("click", async () => {
  if (!last) return;
  const text = summary(last);
  try {
    if (navigator.share && matchMedia("(pointer:coarse)").matches) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); $("shareBtn").textContent = t("copied"); setTimeout(() => $("shareBtn").textContent = t("copyResult"), 1800); }
  } catch {}
});

$("histClear").addEventListener("click", () => {
  if (!confirm(t("confirmClear"))) return;
  history = [];
  store.set("nf_hist", history);
  renderHistory();
});

// NO/EN switch: static text comes from data-i18n; the dynamic parts are redrawn from their stored state.
document.querySelectorAll("[data-language]").forEach(b => b.addEventListener("click", () => Cloud247I18n.setLanguage(b.dataset.language)));
Cloud247I18n.onChange(() => {
  gauge(gaugeState);
  drawChart();
  drawCov();
  renderChips();
  renderSpots();
  setRunning(!!running);
  if (last && !running) showResult(last, true);
  else { renderAdvice(); renderHistory(); }
});

Cloud247I18n.apply();
renderChips();
renderSpots();
setView(view);
setConn(conn);
gauge({});
if (history.length) { last = history[0]; showResult(last); gauge({ num: last.down, speed: last.down, phase: "phPrev" }); }
setRunning(false);
renderHistory();

$("year").textContent = new Date().getFullYear();
