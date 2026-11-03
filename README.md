# Fonduri

Aplicație personală de bani: fonduri, cheltuieli, crypto (cu toate fee-urile), Earn, cont de economii și pușculița cu bancnote. Datele stau doar pe telefon; în acest depozit e doar codul.

- Merge offline, se instalează pe iPhone din Safari („Adaugă pe ecranul principal”).
- **Datele nu stau aici.** Stau doar pe telefon. Repo-ul conține doar codul aplicației.
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

## Actualizare

Când schimbi ceva, crește `VERSION` în `sw.js` (de exemplu `fonduri-v1.0.1`), altfel telefonul poate păstra versiunea veche până la următoarea deschidere.

Prețurile crypto vin de la Binance (`data-api.binance.vision`), cursul USD/RON de la BCE prin Frankfurter (`api.frankfurter.dev`).
