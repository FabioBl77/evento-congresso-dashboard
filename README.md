# Dashboard Evento Congresso 2025

Questo progetto e' il mio elaborato tecnico per la prova Full Stack Developer / Business Software Developer.

Ho realizzato una dashboard web che importa i dati di un congresso medico da un file Excel, li salva in SQLite, li espone tramite API REST e li visualizza con React.

L'obiettivo non e' riportare il foglio Excel a schermo, ma trasformarlo in un modello interrogabile e usare i dati per leggere il percorso dei partecipanti: comunicazione pre-evento, interazioni on-site, accesso alla sala riservata, presenza al simposio e attivita' successive.

## Stack tecnico

- Backend: Node.js con Express
- Database: SQLite
- Frontend: React con Vite
- Grafici: Recharts
- Import Excel: libreria xlsx
- Avvio: Node.js oppure Docker Compose

Ho scelto SQLite per avere un database reale e persistente senza richiedere l'installazione di un server esterno. Per una prova tecnica di queste dimensioni mi permette di concentrarmi su modello dati, import, query e aggregazioni.

Ho scelto React con Vite per separare frontend e backend mantenendo un setup leggero. In alternativa avrei potuto usare HTML, CSS e JavaScript puro, ma React rende piu' chiara la gestione di stato, filtri, caricamento dati e viste della dashboard.

## Struttura del progetto

```text
Evento Congresso
  client
    .dockerignore
    Dockerfile
    index.html
    package.json
    vite.config.js
    src
      api.js
      App.jsx
      main.jsx
      styles.css
  docs
    database-model.md
  scripts
    import-excel.js
    inspect-database.js
  server
    database.js
    index.js
    routes
      analytics.routes.js
      participants.routes.js
  .dockerignore
  .gitignore
  docker-compose.yml
  Dockerfile
  Dataset Evento Congresso 2025.xlsx
  package.json
  README.md
```

Il dataset Excel e' incluso nella repository per rendere il progetto avviabile dopo il clone. Il database SQLite non e' incluso perche' viene generato dallo script di import.

## Avvio rapido con Node.js

Prerequisito: Node.js 20 o superiore.

Dalla root del progetto:

```powershell
npm install
cd client
npm install
cd ..
npm run import
npm run dev
```

Poi apro la dashboard nel browser:

```text
http://127.0.0.1:5173
```

Il backend risponde su:

```text
http://127.0.0.1:3000
```

Endpoint di controllo:

```text
http://127.0.0.1:3000/api/health
```

## Avvio con Docker Compose

Prerequisito: Docker Desktop avviato.

Dalla root del progetto:

```powershell
docker compose up --build
```

Il backend importa automaticamente il dataset, crea il database SQLite in un volume Docker e poi avvia le API. Il frontend viene esposto su:

```text
http://127.0.0.1:5173
```

Per fermare i container:

```powershell
docker compose down
```

Per eliminare anche il volume con il database generato:

```powershell
docker compose down -v
```

## Comandi utili

Import del dataset nel database SQLite:

```powershell
npm run import
```

Verifica dei conteggi principali del database:

```powershell
node scripts/inspect-database.js
```

Avvio solo backend:

```powershell
npm run server
```

Avvio solo frontend:

```powershell
cd client
npm run dev
```

Build di verifica del frontend:

```powershell
cd client
npm run build
```

## Modello dati

Il foglio `02_Partecipanti` contiene una riga per persona e molte colonne di touchpoint. Ho scelto di non copiarlo in una sola tabella larga, perche' sarebbe stato meno flessibile per le aggregazioni richieste.

Ho separato i dati in tre tabelle principali:

- `participants`: dati anagrafici e dimensioni di analisi, come stakeholder, regione e canale di ingaggio;
- `touchpoint_definitions`: dizionario dei touchpoint ricavato dal foglio `01_Interazioni`;
- `participant_touchpoints`: valori dei touchpoint collegati ai singoli partecipanti.

In questo modo il foglio `01_Interazioni` non resta solo documentazione, ma diventa parte del modello dati. La spiegazione piu' dettagliata e' nel file:

```text
docs/database-model.md
```

## API

Il backend espone API REST. Le aggregazioni vengono calcolate nel database o nel backend, non nel browser.

Endpoint principali:

```text
GET /api/health
GET /api/participants
GET /api/analytics/summary
GET /api/analytics/funnel
GET /api/analytics/relationships
GET /api/analytics/by-dimension
GET /api/analytics/by-day
```

`/api/participants` supporta paginazione, ricerca testuale e filtri per stakeholder, regione e canale di ingaggio.

Gli endpoint analytics restituiscono dati gia' pronti per i grafici della dashboard.

## Dashboard

La dashboard contiene due sezioni:

- `Dashboard`: KPI principali, funnel del percorso, relazioni tra azioni, confronto per dimensione e andamento giornaliero;
- `Partecipanti`: tabella filtrabile e paginata.

Le viste richieste dalla consegna sono presenti:

- funnel dalle persone raggiunte fino alle azioni piu' impegnative;
- relazioni tra azioni, ad esempio DEM aperta verso visita stand e sala VIP verso simposio;
- confronto per dimensione anagrafica, selezionabile tra canale, stakeholder e regione;
- andamento per giornata del congresso.

I filtri agiscono sulla pagina e sono gestiti anche gli stati di caricamento, errore e risultato vuoto.

## Anomalie gestite nei dati

Durante l'analisi del dataset ho gestito questi casi:

- celle vuote non sempre equivalenti a zero;
- date italiane convertite da `DD/MM/YYYY` a `YYYY-MM-DD`;
- booleani normalizzati in `0` e `1`;
- numeri convertiti da testo a valore numerico;
- `focus_rate` mantenuto come decimale tra 0 e 1;
- database rigenerabile a ogni import.

Per esempio, `permanenza_min` e `focus_rate` restano vuoti se la persona non era presente al simposio. Non li trasformo in zero perche' significherebbe attribuire un valore misurato a un evento non avvenuto.

## Osservazioni rese visibili

Il lavoro rende visibili soprattutto tre aspetti:

- quante persone passano dalla comunicazione DEM alle interazioni piu' impegnative;
- quante persone che aprono la DEM arrivano poi alla visita dello stand;
- quante persone che accedono alla sala VIP risultano presenti anche al simposio;
- quali canali di ingaggio portano partecipanti piu' attivi;
- come cambiano visite, accessi e presenze nelle diverse giornate del congresso.

Queste osservazioni nascono dall'incrocio tra anagrafica, canale di ingaggio, giornata e touchpoint.

## Limiti

Questi dati permettono di leggere comportamenti e correlazioni, ma non dimostrano causalita'. Per esempio, se un canale porta piu' visite allo stand non posso concludere automaticamente che quel canale sia la causa diretta del coinvolgimento.

Inoltre il dataset e' sintetico nelle anagrafiche, quindi non puo' essere usato per valutazioni reali sulle singole persone.

## Verifiche eseguite

Ho verificato:

- import Excel in SQLite;
- conteggi principali del database;
- endpoint `/api/health`;
- endpoint partecipanti con filtri e paginazione;
- endpoint analytics;
- endpoint relazioni tra touchpoint;
- build frontend React;
- avvio rapido con `npm run import` e `npm run dev`.

Risultati principali dopo l'import:

```text
Partecipanti: 2375
Definizioni touchpoint: 24
Valori touchpoint: 33610
```

La build frontend viene completata correttamente. Vite segnala solo un warning sulla dimensione del bundle JavaScript, dovuto anche all'uso di Recharts.

## Cosa farei con piu' tempo

- Aggiungerei test automatici sulle query principali.
- Estenderei la validazione del dataset in fase di import.
- Inserirei filtri piu' granulari nella dashboard.
- Aggiungerei esportazione CSV delle viste aggregate.
- Separerei ulteriormente i componenti React se la dashboard crescesse.
