# Nettfart

Speedtest fra Cloud247 (Cloud Toolbox). Kjører på Cloudflare Workers. UI-et finnes på norsk (bokmål) og engelsk; svar til brukeren skrives på **norsk**.

## Arkitektur

- `src/index.js` — Worker. API-ruter under `/api/*` (oversikt i toppen av fila); alt annet serveres fra `public/` via Workers Assets (`run_worker_first: ["/api/*"]`).
- `public/index.html` — markup + CSS (Cloud247-profilen: samme tokens og komponenter som cloud247.no og Password Generator).
- `public/i18n.js` — alle tekster på `no` og `en`, samme mønster som de andre Cloud247-verktøyene (`data-i18n`, `data-i18n-aria`, `data-i18n-title`; språkvalget lagres i `cloud247-nettfart-language`). Ny tekst legges inn på begge språk.
- `public/app.js` — måling og forslagsmotor, ren JS uten byggesteg. Dynamisk tekst hentes med `t(key, values)`.
- `.github/workflows/deploy.yml` — push til `main` deployer (krever `CLOUDFLARE_API_TOKEN` og `CLOUDFLARE_ACCOUNT_ID` som repo-secrets).

## Konvensjoner

- Kun gratis tjenester. Ingen database og ingen eksterne API-er.
- **Versjon**: øk `version` i `package.json` ved hver endring som deployes (ny funksjon = minor, feilretting = patch). Vises i footeren via `/api/version`.
- **Commits**: norsk commit-melding, første linje `vX.Y.Z: kort beskrivelse`, deretter punktliste.
- **Mobil først**: zoom og gester låses kun på touch (`pointer: coarse`); på PC må vanlig scrolling virke.
- Worker-fila skal bare eksportere `default` (workerd avviser andre navngitte eksporter).

## Lokalt

```bash
npx wrangler dev
```
