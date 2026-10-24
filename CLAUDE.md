# Nettfart

Speedtest fra Cloud247 (Cloud Toolbox). Statisk side på **GitHub Pages**. UI-et finnes på norsk (bokmål) og engelsk; svar til brukeren skrives på **norsk**.

## Arkitektur

- `index.html` — markup + CSS (Cloud247-profilen: samme tokens og komponenter som cloud247.no og Password Generator) og en streng CSP i `<meta>`.
- `i18n.js` — alle tekster på `no` og `en`, samme mønster som de andre Cloud247-verktøyene (`data-i18n`, `data-i18n-aria`, `data-i18n-title`; språkvalget lagres i `cloud247-nettfart-language`). Ny tekst legges inn på begge språk.
- `app.js` — måling og forslagsmotor, ren JS uten byggesteg. Dynamisk tekst hentes med `t(key, values)`.
- Ingen egen server. Målingene går mot `https://speed.cloudflare.com` (`__down?bytes=N`, `__up`). `/meta` har ikke CORS og skal ikke brukes; datasenter leses fra `cf-meta-*`-headerne.
- Metoden følger `@cloudflare/speedtest` (npm): ping = TTFB fra Resource Timing minus `Server-Timing` (`cfRequestDuration`), fart = 90-persentil av 1-sekunders vinduer etter oppvarming. Endres metoden, sjekk mot bibliotekets kildekode.
- Visninger: «Måler» (SVG-gauge) og «Graf» (`drawChart()` i `app.js`): fart (Mbit/s) og ping (ms) i hver sin plott med felles tidsakse, aldri to y-akser i samme plott. Grafdata (`series`) lagres avrundet i historikken.
- «Dekning» (kartlegging): `covLoop()` i `app.js` – ping + korte fartsprøver (`probe()`, tidtatt fra første til siste byte) mens brukeren går rundt; steder (`nf_spots`) er median av siste 6 s. Fart herfra er bare til å sammenligne steder, ikke et testresultat.
- Publiseres av GitHub Pages fra `main` / rot. `.nojekyll` gjør at filene serveres som de er.

## Regler

- Alle kall til speed.cloudflare.com må være enkle CORS-forespørsler: GET, eller POST av en `Blob` uten type, uten egne headere og uten lyttere på `xhr.upload`. Ellers sender nettleseren en preflight som endepunktene ikke er laget for.
- speed.cloudflare.com svarer med HTTP/1.1 (også uten proxy/antivirus), så HTTP-versjonen sier ingenting om brukerens nett og skal ikke gi forslag.
- Cloudflares 429-svar mangler trolig CORS og ser ut som nettverksfeil i nettleseren. Feilede forespørsler skal derfor bare nevnes når andre målinger også viser problemer.
- Godt resultat = ingen fikser. «Alt ser bra ut» viser bare tips som faktisk er nye for brukeren.
- Nye eksterne adresser må også inn i `connect-src` i CSP-en i `index.html`.
- Alle stier skal være relative (siden kan ligge under `/speedtest/`).
- Kun gratis tjenester. Ingen secrets, ingen database, ingen byggesteg.
- **Versjon**: øk versjonen i footeren (`id="verTxt"`) og `?v=` på skriptene ved hver endring (ny funksjon = minor, feilretting = patch).
- **Commits**: norsk commit-melding, første linje `vX.Y.Z: kort beskrivelse`, deretter punktliste.
- **Mobil først**: zoom og gester låses kun på touch (`pointer: coarse`); på PC må vanlig scrolling virke.

## Lokalt

```bash
python3 -m http.server 8080
```
