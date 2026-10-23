# Nettfart

Speedtest fra Cloud247, en del av [Cloud Toolbox](https://cloud247.no/). Måler ping, jitter, nedlasting, opplasting og ping under last (bufferbloat), og gir konkrete forslag til hva du kan gjøre når nettet er tregt. Norsk og engelsk (NO/EN-valg i toppen, som de andre verktøyene).

- Statisk side på **GitHub Pages**: ingen server, ingen byggesteg, ingen secrets.
- Testdataene går mot Cloudflares offentlige speedtest-endepunkter på `speed.cloudflare.com` (`__down` og `__up`), de samme som speed.cloudflare.com og Cloudflares åpne bibliotek [`@cloudflare/speedtest`](https://github.com/cloudflare/speedtest) bruker. Alle kall er enkle CORS-forespørsler (ingen preflight), og CSP-en tillater bare kall dit.
- Metoden følger Cloudflares bibliotek: ping er tid til første byte (Resource Timing) minus serverens egen behandlingstid fra `Server-Timing`, og farten er 90-persentilen av farten per sekund etter oppvarmingen. Datasenter (`cf-meta-colo`/`cf-meta-city`) leses fra svarheaderne, HTTP-versjonen fra Resource Timing.
- Hver retning kjøres med 4 parallelle strømmer i 8 sekunder. De første 1,5 sekundene (oppvarming) telles ikke. På en gigabit-linje bruker testen rundt 1 GB hver vei. Bryteren «Spar data» (av som standard, valget huskes) stopper testen ved 250 MB ned / 100 MB opp.
- «Under last» måles over samme forbindelse som testdataene (som hos Cloudflare), så den blir gjerne noe høyere enn hos speedtest.net, som bruker egne forbindelser til ping.
- Forslagene tar hensyn til hvordan du er koblet til (Wi‑Fi, kabel, mobilnett) og eventuelt hva abonnementet lover.
- Historikk og språkvalg lagres bare i nettleseren (localStorage).
- Designet følger cloud247.no: navy `#061A2F`, gul `#FAD63A`, Inter/systemfont og Cloud247-logoen i toppen.

## Publisering

GitHub Pages publiserer `main` fra roten av repoet (Settings → Pages → *Deploy from a branch*, `main` / `/ (root)`). Hver push til `main` er ute etter et minutt eller to på `https://cloud247-hub.github.io/speedtest/`.

Egen adresse som de andre verktøyene (f.eks. `speedtest.cloud247.no`):

1. DNS: CNAME-post `speedtest` → `cloud247-hub.github.io`
2. Legg en fil `CNAME` i roten med `speedtest.cloud247.no` (eller skriv adressen under Settings → Pages → Custom domain), og slå på *Enforce HTTPS*.

## Lokalt

Alle stier er relative, så hvilken som helst statisk server fungerer:

```bash
python3 -m http.server 8080
# åpne http://localhost:8080/
```

## Versjon

Versjonen står i footeren i `index.html` (`id="verTxt"`) og som `?v=` på skriptene (for å tvinge fram ny versjon i nettleserens cache). Øk begge ved hver endring.
