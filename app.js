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

async function fetchDown(size, add, signal) {
  const res = await fetch(`${SPEED}/__down?bytes=${size}&r=${rnd()}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  add(size, started);
}

// One direction: parallel streams that keep asking for bigger chunks until the time (or data cap) is up
// (upload chunks stay shorter, since they only count once they're done), plus a ping every 300 ms to catch
// bufferbloat (latency that rises when the line is busy).
async function throughput(dir, signal, capped, onTick) {
  const ctrl = new AbortController(), stop = () => ctrl.abort();
  signal.addEventListener("abort", stop);
  let total = 0, errors = 0, closing = false, drainTimer;
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

  const stream = async () => {
    let size = START[dir];
    while (!ctrl.signal.aborted && !closing) {
      const started = performance.now();
      try { await (dir === "down" ? fetchDown : fetchUp)(size, add, ctrl.signal); }
      catch (e) {
        if (ctrl.signal.aborted) break;
        if (++errors > 8) { stop(); break; }
        await sleep(250, ctrl.signal);
        continue;
      }
      if (performance.now() - started < GROW_MS[dir]) size = Math.min(size * 2, MAX[dir]);
    }
  };
  const pinger = async () => {
    await sleep(1000, ctrl.signal);
    while (!ctrl.signal.aborted && !closing) {
      try { loaded.push(await ping(ctrl.signal)); } catch { break; }
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
  if (!total) throw new Error(t(dir === "down" ? "errNoDown" : "errNoUp"));
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
  return { mbps, bytes: total, loaded: median(loaded), errors };
}

async function runTest() {
  const ctrl = new AbortController();
  running = ctrl;
  setRunning(true);
  setBanner("");
  for (const id of ["sDown", "sUp", "sPing", "sJitter", "sLoaded", "sData"]) $(id).textContent = "–";
  $("grade").hidden = true;
  const r = { at: Date.now(), conn, plan, saver, bytes: 0, errors: 0 };

  try {
    // 1. ping and jitter on an idle line (first request warms up the connection and isn't counted)
    gauge({ num: "…", ms: true, phase: "phPing" });
    progress(0);
    await ping(ctrl.signal);
    const pings = [];
    for (let i = 0; i < PINGS; i++) {
      pings.push(await ping(ctrl.signal));
      const m = median(pings);
      gauge({ num: m, ms: true, phase: "phPing" });
      $("sPing").textContent = fmtMs(m);
      progress(.1 * (i + 1) / PINGS);
    }
    r.ping = median(pings);
    r.jitter = pings.slice(1).reduce((s, v, i) => s + Math.abs(v - pings[i]), 0) / (pings.length - 1);
    $("sJitter").textContent = fmtMs(r.jitter);
    Object.assign(r, server);
    showWhere(r);

    // 2. download, 3. upload
    for (const [dir, phase, base] of [["down", "phDown", .1], ["up", "phUp", .55]]) {
      const out = await throughput(dir, ctrl.signal, r.saver, (live, f) => {
        gauge({ num: live, speed: live, phase, dir });
        $(dir === "down" ? "sDown" : "sUp").textContent = fmtSpeed(live);
        progress(base + .45 * Math.min(1, f));
      });
      r[dir] = out.mbps;
      r[dir === "down" ? "loadedDown" : "loadedUp"] = out.loaded;
      r.bytes += out.bytes;
      r.errors += out.errors;
      $(dir === "down" ? "sDown" : "sUp").textContent = fmtSpeed(out.mbps);
      $("sData").textContent = fmtMB(r.bytes);
    }

    progress(1);
    last = r;
    history = [r, ...history].slice(0, 20);
    store.set("nf_hist", history);
    showResult(r);
  } catch (e) {
    if (e.name === "AbortError") { gauge({ phase: "phAborted" }); progress(0); }
    else {
      // fetch() rejects with a TypeError when the server can't be reached at all (offline, blocked, CORS)
      gauge({ phase: "phFailed" });
      setBanner(t("errBanner", { msg: e instanceof TypeError ? t("errReach") : e.message || t("errUnknown") }));
    }
    if (last) showResult(last, true);
  } finally {
    running = null;
    setRunning(false);
  }
}

function setRunning(on) {
  $("startBtn").classList.toggle("stop", on);
  $("startTxt").textContent = t(on ? "cancel" : last ? "testAgain" : "startTest");
  $("startBtn").querySelector("svg").toggleAttribute("hidden", on);
  $("saverIn").disabled = on;
  $("shareBtn").hidden = on || !last;
}
const setBanner = text => { $("banner").textContent = text; $("banner").hidden = !text; };

function showWhere(r) {
  // the data centre is only known when Cloudflare exposes its cf-meta headers; the test always runs against Cloudflare
  const bits = [r.colo ? `Cloudflare ${r.colo}` : r.http && "Cloudflare", r.city, r.isp, r.http].filter(Boolean);
  $("where").textContent = bits.length ? bits.join(" · ") : "–";
}

// ---------- results ----------
function grade(r) {
  if (r.down >= 300 && r.ping <= 30) return "gradeBlazing";
  if (r.down >= 100) return "gradeFast";
  if (r.down >= 25) return "gradeOk";
  if (r.down >= 5) return "gradeSlow";
  return "gradeVerySlow";
}

function showResult(r, keepGauge) {
  if (!keepGauge) gauge({ num: r.down, speed: r.down, phase: "phDone" });
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
  const out = [], add = (level, title, why, steps = []) => out.push({ level, title, why, steps });
  const wifi = r.conn === "wifi", cable = r.conn === "cable", mobile = r.conn === "mobile";
  const bloat = bloatOf(r), upBloat = (r.loadedUp || 0) > (r.loadedDown || 0);
  const nordic = ["OSL", "ARN", "CPH", "HEL", "GOT", "BGO", "SVG", "TRD", "KRS", "TOS"];
  let medium = false, ring = false;

  if (r.errors > 0) {
    add("warn", "errTitle", [r.errors === 1 ? "errWhy1" : "errWhyN", { n: r.errors }], ["errS1", "restart"]);
    medium = true;
  }

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

  if (r.http === "HTTP/1.1") add("tip", "httpTitle", "httpWhy", ["httpS1", "httpS2"]);

  // fixes for the medium itself
  if (medium && wifi) add("fix", "wifiTitle", "wifiWhy", ["wifi1", "wifi2", "wifi3", "wifi4", "restartRouter", "wifi5"]);
  if (medium && mobile) add("fix", "mobTitle", "mobWhy", ["mob1", "mob2", "mob3", "mob4", "mob5"]);
  if (ring) {
    add("tip", mobile ? "ringTitleMobile" : "ringTitle", "ringWhy",
      mobile ? ["ringM1", "ringM2", "ringCopy"] : ["ring1", "ring2", "ring3", "ringCopy"]);
  }

  if (!out.some(s => s.level === "bad" || s.level === "warn")) {
    const steps = ["goodEvening"];
    if (wifi) steps.push("goodCable");
    if (!r.plan) steps.push("goodPlan");
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
  $("sugs").innerHTML = list.map(s => `
    <article class="sug ${s.level}">
      <span class="tag">${esc(t(tags[s.level]))}</span>
      <h3>${esc(msg(s.title))}</h3>
      <p>${esc(msg(s.why))}</p>
      ${s.steps.length ? `<ol>${s.steps.map(step => `<li><span>${esc(msg(step))}</span></li>`).join("")}</ol>` : ""}
    </article>`).join("");
  $("sugWrap").hidden = false;
}

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
$("startBtn").addEventListener("click", () => running ? running.abort() : runTest());

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
  setRunning(!!running);
  if (last && !running) showResult(last, true);
  else { renderAdvice(); renderHistory(); }
});

Cloud247I18n.apply();
setConn(conn);
gauge({});
if (history.length) { last = history[0]; showResult(last); gauge({ num: last.down, speed: last.down, phase: "phPrev" }); }
setRunning(false);
renderHistory();

$("year").textContent = new Date().getFullYear();
