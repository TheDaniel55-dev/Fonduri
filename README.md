# Fonduri

Aplicație personală de bani: fonduri, cheltuieli, crypto, Earn, cont de economii și pușculița cu bancnote. Telefonul este sursa datelor; în acest depozit e doar codul.

- Merge offline, se instalează pe iPhone din Safari („Adaugă pe ecranul principal”).
- **Datele nu stau aici.** Sincronizarea opțională cu Orașul DSL trimite un instantaneu criptat doar după scanarea unui QR și aprobarea cu cheia de acces. PC-ul verifică aprobarea și păstrează local copia sincronizată.
- Nu urca niciodată în repo fișierul de import sau backup-urile (`fonduri-import.json`, `fonduri-backup-*.json`).

## Fișiere

| Fișier | Ce face |
|---|---|
| `index.html` | Pagina aplicației |
| `core.js` | Toate calculele: fonduri, împărțirea veniturilor, crypto, economii, statistici |
| `app.js` | Ecranele și butoanele |
| `styles.css` | Aspectul |
| `sw.js` | Ține aplicația pe telefon ca să meargă fără internet |
| `vendor/xlsx.mini.min.js` | Exportul în Excel (SheetJS, licență Apache 2.0) |
| `city-sync.js`, `vendor/jsQR.js` | Scanare QR, aprobare cu cheia de acces și transfer criptat către oraș |

În 1.6, Crypto și Earn au un istoric comun. Corecturile și transferurile nu sunt venit. În Setări → Crypto se verifică diferențele Earn vechi: alegerea schimbă raportul, păstrând cantitatea. Recompensele confirmate sunt evaluate la cotația disponibilă; estimările sunt separate. Teste de calcul: `node --test tests/crypto.test.js`.

## Actualizare

Când schimbi ceva, crește `VERSION` în `sw.js` (de exemplu `fonduri-v1.0.1`), altfel telefonul poate păstra versiunea veche până la următoarea deschidere.

Prețurile crypto vin de la Binance (`data-api.binance.vision`), cursul USD/RON de la BCE prin Frankfurter (`api.frankfurter.dev`).
