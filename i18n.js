/* Cloud247 UI translations (same pattern as the other Cloud Toolbox tools). Only the language preference is persisted. */
(function (root) {
  "use strict";
  const messages = {
    no: {
      metaDescription: "Nettfart fra Cloud247: test hvor raskt nettet ditt er, og få konkrete forslag til hva du kan gjøre når det går tregt.",
      network: "NETTVERK",
      heroTitle: "Test nettet ditt.", heroTagline: "Fiks det som er tregt.",
      heroDescription: "Mål nedlasting, opplasting, ping og stabilitet på under et halvt minutt. Går noe tregt, får du konkrete forslag til hva du kan gjøre, tilpasset Wi‑Fi, kabel eller mobilnett.",
      tagFree: "Gratis, ingen konto", tagLocal: "Resultatene lagres bare på enheten", tagCloudflare: "Måles mot Cloudflare",
      measure: "MÅLING", runTitle: "Start testen", gaugeLabel: "Fartsmåler",
      startTest: "Start test", testAgain: "Test på nytt", cancel: "Avbryt", server: "Server",
      viewLabel: "Visning", viewGauge: "Måler", viewGraph: "Graf",
      chartSpeed: "Fart · Mbit/s", chartPing: "Ping · ms", pingIdle: "Ping i ro", chartEmpty: "Kjør en test for å se grafen.",
      chartAria: "Graf over testen: ned {down} Mbit/s, opp {up} Mbit/s, ping {ping} ms i ro og opptil {max} ms under last.", sec: "s",
      saverTitle: "Spar data", saverHelp: "Stopper ved rundt 250 MB ned og 100 MB opp. Raske linjer kan da måles litt lavere.",
      runHelp: "Testen bruker fire tilkoblinger samtidig i 8 sekunder hver vei. Uten «Spar data» kan den bruke rundt 1 GB hver vei på en gigabit-linje.",
      result: "RESULTAT", resultTitle: "Dine tall",
      down: "Ned", up: "Opp", ping: "Ping", jitter: "Jitter", loaded: "Under last", loadedHelp: "Ping mens linja er full: ved nedlasting / ved opplasting", dataUsed: "Data brukt",
      unitsHelp: "Ned og opp i Mbit/s, ping og jitter i millisekunder. Under last (ms): ved nedlasting / ved opplasting.",
      connQuestion: "Hvordan er du koblet til?", connWifi: "Wi‑Fi", connCable: "Kabel", connMobile: "Mobilnett",
      plan: "Abonnement", planHelp: "Valgfritt: hva leverandøren lover",
      copyResult: "Kopier resultat", copied: "Kopiert ✓",
      usage: "BRUK", usesTitle: "Hva holder nettet til?",
      suggestions: "FORSLAG", sugTitle: "Forslag", sugTitleN: "Forslag til fiks · {n} funn",
      history: "HISTORIKK", histTitle: "Tidligere tester", histClear: "Tøm historikken", histLocal: "Lagres bare på denne enheten.",
      histDown: "ned", histUp: "opp", confirmClear: "Slette alle tidligere tester på denne enheten?",
      moreTitle: "Flere gratis verktøy", moreText: "Sjekk domenet, e-posten og Microsoft-miljøet ditt.", moreButton: "Til Cloud Toolbox",

      phReady: "Klar", phPing: "Måler ping", phDown: "Laster ned", phUp: "Laster opp", phDone: "Ned · ferdig",
      phPrev: "Forrige test", phAborted: "Avbrutt", phFailed: "Feilet",
      errBanner: "Testen stoppet: {msg} Sjekk at du er på nett og prøv igjen.", errUnknown: "ukjent feil.",
      errReach: "Fikk ikke kontakt med testserveren (speed.cloudflare.com). Den kan være blokkert av en annonseblokker eller et firmanett.", errNoDown: "Fikk ikke lastet ned noe.", errNoUp: "Fikk ikke lastet opp noe.",

      gradeBlazing: "Lynrask", gradeFast: "Rask", gradeOk: "Grei", gradeSlow: "Treg", gradeVerySlow: "Veldig treg",
      useWeb: "Surfing og e-post", useHd: "Strømming i HD", use4k: "Strømming i 4K", useCalls: "Videomøter", useGaming: "Gaming", useFiles: "Store filer og backup",
      stBad: "Dårlig", stOk: "Kan hakke", stGood: "Fint",
      tagBad: "Viktig", tagWarn: "Bør fikses", tagFix: "Slik fikser du det", tagTip: "Tips", tagGood: "Alt bra",

      limitTitle: "Cloudflare begrenset testen",
      limitWhy: "{n} forespørsler ble avvist med «for mange forespørsler» (HTTP 429). Det skjer når det kjøres mange tester fra samme adresse på kort tid, og har ingenting med nettet ditt å gjøre. Resultatet kan bli litt for lavt.",
      limitS1: "Vent et par minutter og test igjen.",
      errLimited: "Cloudflare avviste testen fordi det er kjørt mange tester på kort tid (HTTP 429). Vent et par minutter og prøv igjen.",
      errTitle: "Forbindelsen hakket under testen",
      errWhy1: "1 forespørsel feilet underveis. Det tyder på at nettet faller ut et lite øyeblikk, som gir frys i samtaler og strømming.",
      errWhyN: "{n} forespørsler feilet underveis. Det tyder på at nettet faller ut et lite øyeblikk, som gir frys i samtaler og strømming.",
      errS1: "Kjør testen igjen. Skjer det ofte, noter klokkeslettene.",
      restart: "Restart ruteren og modemet: trekk ut strømmen i 30 sekunder.",

      capTitle: "Ser ut som et tak på 100 Mbit/s",
      capWhy: "Du betaler for {plan} Mbit/s, men måler like under 100. Det er et klassisk tegn på at noe på veien bare klarer 100 Mbit/s.",
      capS1: "Bytt nettverkskabelen. Det skal stå Cat 5e, Cat 6 eller høyere på kabelen. Gamle kabler eller en skadet kontakt gir ofte 100 Mbit/s.",
      capS2: "Sjekk at porten på ruteren og på maskinen er gigabit (1000 Mbit/s). Lampen ved porten har ofte egen farge for gigabit.",
      capS3: "Fjern gamle svitsjer og strømnettadaptere (powerline) mellom maskinen og ruteren, og test rett i ruteren.",
      capS4: "Bruker du en USB-adapter for nettverk: sjekk at den støtter 1 Gbit/s.",

      planTitle: "Du får under halvparten av det du betaler for",
      planWhy: "Du målte {down} av {plan} Mbit/s ({pct} %).",
      planCable: "Test med kabel rett i ruteren. Wi‑Fi er nesten alltid flaskehalsen, og kabel viser hva linja faktisk leverer.",
      planOldRouter: "Eldre rutere klarer sjelden mer enn 100–300 Mbit/s over Wi‑Fi. Med {plan} Mbit/s trenger du Wi‑Fi 6 (802.11ax) eller nyere for å få ut farten trådløst.",
      planOthers: "Sjekk om noen andre i huset strømmer, laster ned spill eller tar backup akkurat nå.",
      planIsp: "Er farten fortsatt lav på kabel: test på flere tidspunkt, og kontakt leverandøren med resultatene.",

      slowTitleBad: "Treg nedlasting", slowTitleWarn: "Nedlastingen er i treigeste laget",
      slowWhy1: "{down} Mbit/s holder til surfing, men strømming og nedlastinger vil gå tregt, særlig når flere bruker nettet samtidig.",
      slowWhy2: "{down} Mbit/s holder til surfing og litt strømming, men HD-video kan hakke og nedlastinger går tregt, særlig når flere bruker nettet samtidig.",
      slowWhy3: "{down} Mbit/s holder til surfing og strømming i HD, men 4K-strømming og store nedlastinger vil gå tregt, særlig når flere bruker nettet samtidig.",
      slowQuota: "Sjekk om du har brukt opp datakvoten. Mange abonnement struper farten når kvoten er brukt.",
      slowOthers: "Sjekk om andre enheter laster ned noe stort: oppdateringer, spill eller backup.",
      slowPlan: "Finn ut hva abonnementet ditt lover, og fyll det inn over. Da kan appen si om du får det du betaler for.",

      pingTitle: "Høy ping",
      pingWhy: "Ping er tiden et signal bruker fram og tilbake. {ping} ms gjør at nettsider bruker lang tid på å starte, og gir forsinkelse i samtaler og spill. Normalt er under 20 ms på fiber, og 20–50 ms på mobilnett.",
      pingVpn: "Slå av VPN hvis du bruker det. Trafikken går da ofte via et annet land.",
      pingFar: "Testen gikk via en server i {colo}, langt fra Norge. Det tyder på VPN, en proxy eller at trafikken går en omvei.",
      pingOthers: "Stopp store nedlastinger og opplastinger på andre enheter.",
      pingMobile: "Mobilnett har naturlig høyere ping. Wi‑Fi eller kabel gir lavere.",
      restartRouter: "Restart ruteren: trekk ut strømmen i 30 sekunder.",

      jitTitle: "Ujevn forbindelse (jitter)",
      jitWhy: "Pingen varierer med {jitter} ms fra måling til måling. Det gir hakking og ekko i videosamtaler og «lagg» i spill, selv om farten er god.",
      bgUploads: "Sjekk om noe laster opp i bakgrunnen: iCloud-bilder, OneDrive, Google Foto, Dropbox eller backup.",
      jitCable: "Bruk kabel til det som må være stabilt, som møter og spill. Kabel fjerner nesten all jitter.",
      jitLater: "Test igjen på et annet tidspunkt for å se om det skyldes travelhet i nettet.",

      bloatTitle: "Nettet blir tregt når det er i bruk",
      bloatWhy: "Pingen gikk fra {from} ms til {to} ms mens linja var full. Dette kalles bufferbloat: ruteren holder for mye data i kø, så alt annet må vente. Typisk merker du det som frys i et møte mens noen strømmer eller tar backup.",
      bloatWhyUp: "Pingen gikk fra {from} ms til {to} ms mens linja var full, verst ved opplasting. Dette kalles bufferbloat: ruteren holder for mye data i kø, så alt annet må vente. Typisk merker du det som frys i et møte mens noen strømmer eller tar backup.",
      bloatS1: "Se etter «SQM», «Smart Queue», «Adaptive QoS» eller «Bufferbloat» i ruterens innstillinger, og slå det på.",
      bloatS2: "Har ruteren bare vanlig QoS: sett fartsgrensen til rundt 90 % av det du målte.",
      bloatUpNight: "Flytt store opplastinger (bildesynk og backup) til natta.",
      bloatDownNight: "Flytt store nedlastinger (spill og oppdateringer) til natta.",
      bloatRouter: "Ruteren fra leverandøren mangler ofte denne funksjonen. En nyere ruter med SQM løser det for de fleste.",

      upTitle: "Lav opplasting",
      upWhy: "Opplasting brukes når du sender video i møter, deler filer og tar backup. {up} Mbit/s kan gi uskarp video av deg i samtaler og trege opplastinger.",
      upPlan: "Mange abonnement har mye lavere opplasting enn nedlasting, særlig ADSL og kabel-TV-nett. Sjekk hva abonnementet ditt lover for opplasting.",
      upWifi: "Svakt Wi‑Fi rammer opplasting hardest, fordi telefonen sender svakere enn ruteren. Gå nærmere ruteren.",

      httpTitle: "Tilkoblingen går via en mellomstasjon",
      httpWhy: "Nettleseren brukte den gamle protokollen HTTP/1.1. Det skjer ofte når antivirus med «HTTPS-skanning», en VPN eller en firmaproxy leser trafikken, og det kan gjøre nettet tregere.",
      httpS1: "Slå av HTTPS- eller webskanning i antivirusprogrammet, og test igjen.",
      httpS2: "Test uten VPN.",

      wifiTitle: "Slik får du bedre Wi‑Fi",
      wifiWhy: "Svakt eller forstyrret Wi‑Fi er den vanligste årsaken til tregt nett hjemme.",
      wifi1: "Gå nærmere ruteren, eller sett ruteren høyt og midt i boligen. Ikke i et skap, bak TV-en eller på gulvet.",
      wifi2: "Vegger, gulv, speil og akvarier demper signalet mye. Én etasje opp eller ned kan halvere farten.",
      wifi3: "Koble til 5 GHz-nettet (ofte merket «5G» eller «5GHz» i navnet) når du er i nærheten av ruteren. Det er mye raskere enn 2,4 GHz.",
      wifi4: "Mikrobølgeovn, babycall og Bluetooth forstyrrer 2,4 GHz. Bor du tett, kan du bytte kanal i ruteren eller la den velge automatisk.",
      wifi5: "Er boligen stor eller har flere etasjer, gir mesh eller et ekstra tilgangspunkt med kabel mye bedre dekning enn en forsterker (repeater).",

      mobTitle: "Slik får du bedre mobilnett",
      mobWhy: "Mobilnett varierer mye med hvor du står og hvor mange som bruker masten.",
      mob1: "Gå nærmere et vindu, eller ut. Betong og energiglass stopper mobilsignalet.",
      mob2: "Slå flymodus på og av, så kobler telefonen seg til masten på nytt.",
      mob3: "Sjekk at 5G eller 4G er slått på i mobilnett-innstillingene.",
      mob4: "Sjekk om du har brukt opp datakvoten. Da strupes farten ofte.",
      mob5: "Er du hjemme eller på jobb: bruk Wi‑Fi i stedet.",

      ringTitle: "Før du ringer leverandøren", ringTitleMobile: "Før du kontakter mobiloperatøren",
      ringWhy: "Da kan du vise at problemet ligger hos dem, og slipper de vanlige spørsmålene.",
      ringM1: "Test flere steder og på ulike tidspunkt. Historikken nederst lagrer resultatene.",
      ringM2: "Sjekk dekningskartet til operatøren for adressen din.",
      ringCopy: "Trykk «Kopier resultat» og lim det inn i henvendelsen.",
      ring1: "Restart modem og ruter.",
      ring2: "Test med kabel rett i ruteren. Da vet du om det er linja eller Wi‑Fi-en som er problemet.",
      ring3: "Test på ulike tidspunkt, gjerne på kvelden (kl. 19–23). Historikken nederst lagrer resultatene.",

      goodTitle: "Nettet ditt er i god form",
      goodWhy: "Fart, ping og stabilitet ser bra ut. Ingen ting å fikse.",
      goodEvening: "Test gjerne igjen på kvelden (kl. 19–23). Da er nettet mest belastet.",
      goodCable: "Vil du se hva linja klarer uten Wi‑Fi, test med kabel rett i ruteren.",
      goodPlan: "Fyll inn hva abonnementet ditt lover, så sjekker appen om du får det du betaler for.",

      sumDown: "Ned: {v} Mbit/s", sumUp: "Opp: {v} Mbit/s", sumPing: "Ping: {ping} ms (jitter {jitter} ms)",
      sumLoaded: "Ping under last: ned {d} ms, opp {u} ms", sumConn: "Tilkobling: {conn}", sumPlan: ", abonnement {plan} Mbit/s",
      sumServer: "Server: Cloudflare {colo}", unknown: "ukjent",
    },
    en: {
      metaDescription: "Nettfart by Cloud247: test how fast your connection is, and get concrete suggestions for what to do when it's slow.",
      network: "NETWORK",
      heroTitle: "Test your connection.", heroTagline: "Fix what's slow.",
      heroDescription: "Measure download, upload, ping and stability in under half a minute. If something is slow, you get concrete suggestions for what to do, tailored to Wi‑Fi, cable or mobile.",
      tagFree: "Free, no account", tagLocal: "Results are stored only on your device", tagCloudflare: "Measured against Cloudflare",
      measure: "TEST", runTitle: "Run the test", gaugeLabel: "Speed gauge",
      startTest: "Start test", testAgain: "Test again", cancel: "Cancel", server: "Server",
      viewLabel: "View", viewGauge: "Gauge", viewGraph: "Graph",
      chartSpeed: "Speed · Mbit/s", chartPing: "Ping · ms", pingIdle: "Idle ping", chartEmpty: "Run a test to see the graph.",
      chartAria: "Graph of the test: down {down} Mbit/s, up {up} Mbit/s, ping {ping} ms idle and up to {max} ms under load.", sec: "s",
      saverTitle: "Save data", saverHelp: "Stops at about 250 MB down and 100 MB up. Fast lines may then measure slightly lower.",
      runHelp: "The test uses four connections at once for 8 seconds in each direction. Without «Save data» it can use about 1 GB each way on a gigabit line.",
      result: "RESULTS", resultTitle: "Your numbers",
      down: "Down", up: "Up", ping: "Ping", jitter: "Jitter", loaded: "Under load", loadedHelp: "Ping while the line is busy: while downloading / while uploading", dataUsed: "Data used",
      unitsHelp: "Down and up in Mbit/s, ping and jitter in milliseconds. Under load (ms): while downloading / while uploading.",
      connQuestion: "How are you connected?", connWifi: "Wi‑Fi", connCable: "Cable", connMobile: "Mobile",
      plan: "Your plan", planHelp: "Optional: what your provider promises",
      copyResult: "Copy result", copied: "Copied ✓",
      usage: "USAGE", usesTitle: "What can your connection handle?",
      suggestions: "SUGGESTIONS", sugTitle: "Suggestions", sugTitleN: "Suggested fixes · {n} found",
      history: "HISTORY", histTitle: "Previous tests", histClear: "Clear history", histLocal: "Stored only on this device.",
      histDown: "down", histUp: "up", confirmClear: "Delete all previous tests on this device?",
      moreTitle: "More free tools", moreText: "Check your domain, email and Microsoft environment.", moreButton: "Go to Cloud Toolbox",

      phReady: "Ready", phPing: "Measuring ping", phDown: "Downloading", phUp: "Uploading", phDone: "Down · done",
      phPrev: "Previous test", phAborted: "Cancelled", phFailed: "Failed",
      errBanner: "The test stopped: {msg} Check that you're online and try again.", errUnknown: "unknown error.",
      errReach: "Couldn't reach the test server (speed.cloudflare.com). It may be blocked by an ad blocker or a company network.", errNoDown: "Couldn't download anything.", errNoUp: "Couldn't upload anything.",

      gradeBlazing: "Blazing", gradeFast: "Fast", gradeOk: "OK", gradeSlow: "Slow", gradeVerySlow: "Very slow",
      useWeb: "Browsing and email", useHd: "HD streaming", use4k: "4K streaming", useCalls: "Video calls", useGaming: "Gaming", useFiles: "Large files and backup",
      stBad: "Poor", stOk: "May stutter", stGood: "Good",
      tagBad: "Important", tagWarn: "Should fix", tagFix: "How to fix it", tagTip: "Tip", tagGood: "All good",

      limitTitle: "Cloudflare limited the test",
      limitWhy: "{n} requests were refused with «too many requests» (HTTP 429). That happens when many tests run from the same address in a short time, and has nothing to do with your connection. The result may be slightly too low.",
      limitS1: "Wait a couple of minutes and test again.",
      errLimited: "Cloudflare refused the test because many tests have run in a short time (HTTP 429). Wait a couple of minutes and try again.",
      errTitle: "The connection dropped during the test",
      errWhy1: "1 request failed along the way. That suggests the connection drops out for a moment, which causes freezes in calls and streaming.",
      errWhyN: "{n} requests failed along the way. That suggests the connection drops out for a moment, which causes freezes in calls and streaming.",
      errS1: "Run the test again. If it happens often, note the times.",
      restart: "Restart the router and modem: unplug the power for 30 seconds.",

      capTitle: "Looks like a 100 Mbit/s ceiling",
      capWhy: "You pay for {plan} Mbit/s but measure just under 100. That's a classic sign that something along the way only handles 100 Mbit/s.",
      capS1: "Replace the network cable. It should say Cat 5e, Cat 6 or higher on the cable. Old cables or a damaged plug often give 100 Mbit/s.",
      capS2: "Check that the ports on the router and the computer are gigabit (1000 Mbit/s). The port light often has its own colour for gigabit.",
      capS3: "Remove old switches and powerline adapters between the computer and the router, and test directly at the router.",
      capS4: "Using a USB network adapter? Check that it supports 1 Gbit/s.",

      planTitle: "You're getting less than half of what you pay for",
      planWhy: "You measured {down} of {plan} Mbit/s ({pct} %).",
      planCable: "Test with a cable straight into the router. Wi‑Fi is almost always the bottleneck, and a cable shows what the line actually delivers.",
      planOldRouter: "Older routers rarely manage more than 100–300 Mbit/s over Wi‑Fi. With {plan} Mbit/s you need Wi‑Fi 6 (802.11ax) or newer to get the speed wirelessly.",
      planOthers: "Check whether anyone else at home is streaming, downloading games or running a backup right now.",
      planIsp: "If it's still slow on cable: test at several times of day, and contact your provider with the results.",

      slowTitleBad: "Slow download", slowTitleWarn: "Download is on the slow side",
      slowWhy1: "{down} Mbit/s is enough for browsing, but streaming and downloads will be slow, especially when several people use the connection at once.",
      slowWhy2: "{down} Mbit/s is enough for browsing and some streaming, but HD video may stutter and downloads will be slow, especially when several people use the connection at once.",
      slowWhy3: "{down} Mbit/s is enough for browsing and HD streaming, but 4K streaming and large downloads will be slow, especially when several people use the connection at once.",
      slowQuota: "Check whether you've used up your data allowance. Many plans throttle the speed once it's used.",
      slowOthers: "Check whether other devices are downloading something big: updates, games or backups.",
      slowPlan: "Find out what your plan promises and enter it above. Then the app can tell you whether you get what you pay for.",

      pingTitle: "High ping",
      pingWhy: "Ping is the time a signal takes there and back. {ping} ms makes web pages slow to start and causes delay in calls and games. Normal is under 20 ms on fibre, and 20–50 ms on mobile.",
      pingVpn: "Turn off your VPN if you use one. Traffic often goes via another country.",
      pingFar: "The test went via a server in {colo}, far from Norway. That suggests a VPN, a proxy or that traffic takes a detour.",
      pingOthers: "Stop large downloads and uploads on other devices.",
      pingMobile: "Mobile networks naturally have higher ping. Wi‑Fi or cable gives lower ping.",
      restartRouter: "Restart the router: unplug the power for 30 seconds.",

      jitTitle: "Unstable connection (jitter)",
      jitWhy: "Ping varies by {jitter} ms from one measurement to the next. That causes stutter and echo in video calls and lag in games, even when the speed is good.",
      bgUploads: "Check whether something is uploading in the background: iCloud Photos, OneDrive, Google Photos, Dropbox or a backup.",
      jitCable: "Use a cable for things that must be stable, like meetings and games. A cable removes almost all jitter.",
      jitLater: "Test again at another time to see if it's caused by a busy network.",

      bloatTitle: "The connection gets slow when it's busy",
      bloatWhy: "Ping went from {from} ms to {to} ms while the line was full. This is called bufferbloat: the router queues too much data, so everything else has to wait. You typically notice it as freezes in a meeting while someone streams or runs a backup.",
      bloatWhyUp: "Ping went from {from} ms to {to} ms while the line was full, worst when uploading. This is called bufferbloat: the router queues too much data, so everything else has to wait. You typically notice it as freezes in a meeting while someone streams or runs a backup.",
      bloatS1: "Look for «SQM», «Smart Queue», «Adaptive QoS» or «Bufferbloat» in the router settings, and turn it on.",
      bloatS2: "If the router only has regular QoS: set the speed limit to about 90 % of what you measured.",
      bloatUpNight: "Move large uploads (photo sync and backups) to the night.",
      bloatDownNight: "Move large downloads (games and updates) to the night.",
      bloatRouter: "The router from your provider often lacks this feature. A newer router with SQM fixes it for most people.",

      upTitle: "Low upload",
      upWhy: "Upload is used when you send video in meetings, share files and run backups. {up} Mbit/s can make your video blurry in calls and make uploads slow.",
      upPlan: "Many plans have much lower upload than download, especially ADSL and cable-TV networks. Check what your plan promises for upload.",
      upWifi: "Weak Wi‑Fi hits upload hardest, because the phone transmits more weakly than the router. Move closer to the router.",

      httpTitle: "The connection goes through a middleman",
      httpWhy: "The browser used the old HTTP/1.1 protocol. That often happens when antivirus «HTTPS scanning», a VPN or a company proxy reads the traffic, and it can make the connection slower.",
      httpS1: "Turn off HTTPS or web scanning in your antivirus, and test again.",
      httpS2: "Test without VPN.",

      wifiTitle: "How to get better Wi‑Fi",
      wifiWhy: "Weak or disturbed Wi‑Fi is the most common cause of a slow connection at home.",
      wifi1: "Move closer to the router, or place the router high up and central in your home. Not in a cupboard, behind the TV or on the floor.",
      wifi2: "Walls, floors, mirrors and aquariums weaken the signal a lot. One floor up or down can halve the speed.",
      wifi3: "Connect to the 5 GHz network (often marked «5G» or «5GHz» in the name) when you're near the router. It's much faster than 2.4 GHz.",
      wifi4: "Microwaves, baby monitors and Bluetooth disturb 2.4 GHz. If neighbours are close, change the channel on the router or let it pick automatically.",
      wifi5: "In a large home or one with several floors, mesh or an extra access point with a cable gives much better coverage than a range extender.",

      mobTitle: "How to get better mobile coverage",
      mobWhy: "Mobile networks vary a lot with where you are and how many people use the mast.",
      mob1: "Move closer to a window, or go outside. Concrete and energy-efficient glass block the mobile signal.",
      mob2: "Turn airplane mode on and off, so the phone reconnects to the mast.",
      mob3: "Check that 5G or 4G is turned on in the mobile network settings.",
      mob4: "Check whether you've used up your data allowance. The speed is often throttled then.",
      mob5: "At home or at work: use Wi‑Fi instead.",

      ringTitle: "Before you call your provider", ringTitleMobile: "Before you contact your mobile operator",
      ringWhy: "Then you can show that the problem is on their side, and skip the usual questions.",
      ringM1: "Test in several places and at different times. The history below keeps the results.",
      ringM2: "Check the operator's coverage map for your address.",
      ringCopy: "Tap «Copy result» and paste it into your message.",
      ring1: "Restart the modem and router.",
      ring2: "Test with a cable straight into the router. Then you know whether the line or the Wi‑Fi is the problem.",
      ring3: "Test at different times, ideally in the evening (7–11 pm). The history below keeps the results.",

      goodTitle: "Your connection is in good shape",
      goodWhy: "Speed, ping and stability look good. Nothing to fix.",
      goodEvening: "Test again in the evening (7–11 pm) if you like. That's when networks are busiest.",
      goodCable: "To see what the line can do without Wi‑Fi, test with a cable straight into the router.",
      goodPlan: "Enter what your plan promises, and the app checks whether you get what you pay for.",

      sumDown: "Download: {v} Mbit/s", sumUp: "Upload: {v} Mbit/s", sumPing: "Ping: {ping} ms (jitter {jitter} ms)",
      sumLoaded: "Ping under load: down {d} ms, up {u} ms", sumConn: "Connection: {conn}", sumPlan: ", plan {plan} Mbit/s",
      sumServer: "Server: Cloudflare {colo}", unknown: "unknown",
    },
  };
  const STORAGE_KEY = "cloud247-nettfart-language";
  const listeners = [];
  let language = "no";
  try { const saved = root.localStorage.getItem(STORAGE_KEY); if (saved === "no" || saved === "en") language = saved; } catch (_) { /* Storage is optional. */ }
  function t(key, values = {}) {
    const message = messages[language][key] ?? messages.no[key] ?? key;
    return message.replace(/\{(\w+)\}/g, (_, name) => values[name] === undefined ? "{" + name + "}" : String(values[name]));
  }
  function apply() {
    document.documentElement.lang = language === "no" ? "nb" : "en";
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach(node => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
    document.querySelectorAll("[data-i18n-title]").forEach(node => { node.setAttribute("title", t(node.dataset.i18nTitle)); });
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("metaDescription"));
    document.querySelectorAll("[data-language]").forEach(button => {
      const selected = button.dataset.language === language;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }
  function setLanguage(next) {
    if ((next !== "no" && next !== "en") || next === language) return;
    language = next;
    try { root.localStorage.setItem(STORAGE_KEY, language); } catch (_) { /* Do not require storage. */ }
    apply();
    listeners.forEach(fn => fn(language));
  }
  root.Cloud247I18n = Object.freeze({ t, apply, setLanguage, getLanguage: () => language, onChange: fn => listeners.push(fn) });
})(window);
