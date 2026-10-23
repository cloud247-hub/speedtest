# Nettfart

Speedtest fra Cloud247, en del av [Cloud Toolbox](https://cloud247.no/). Måler ping, jitter, nedlasting, opplasting og ping under last (bufferbloat), og gir konkrete forslag til hva du kan gjøre når nettet er tregt. Norsk og engelsk (NO/EN-valg i toppen, som de andre verktøyene).

- Kjører på Cloudflare Workers. Ingen database, ingen innlogging og ingen eksterne API-er: testen går mot egne ruter (`/api/ping`, `/api/down`, `/api/up`, `/api/info`).
- Hver retning kjøres med 4 parallelle strømmer i 8 sekunder. De første 1,5 sekundene (oppvarming) telles ikke. På raske linjer stopper testen ved 250 MB ned / 100 MB opp, så den ikke spiser mobildata.
- Forslagene tar hensyn til hvordan du er koblet til (Wi‑Fi, kabel, mobilnett) og eventuelt hva abonnementet lover.
- Historikk og språkvalg lagres bare i nettleseren (localStorage).
- Designet følger cloud247.no: navy `#061A2F`, gul `#FAD63A`, Inter/systemfont og Cloud247-logoen i toppen.

## Deploy

Hver push til `main` deployes automatisk via `.github/workflows/deploy.yml`. Engangsoppsett i GitHub-repoet (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN`: token fra malen **Edit Cloudflare Workers**
- `CLOUDFLARE_ACCOUNT_ID`: står til høyre på Workers & Pages-oversikten

Workeren heter `nettfart` og havner på `nettfart.<konto>.workers.dev`. Egen adresse legger du inn under Workers → nettfart → Settings → Domains & Routes, eller i `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "nettfart.cloud247.no", "custom_domain": true }]
```

Manuelt:

```bash
npm install
npx wrangler deploy
```

## Lokalt

```bash
npx wrangler dev
```

Lokalt blir tallene urealistisk høye (alt går via localhost), og serveren rapporterer HTTP/1.1. Bruk nettleserens nettverksstruping for å se forslagene.

## Versjon

`version` i `package.json` vises i bunnen av appen. Øk den ved hver endring som deployes.
