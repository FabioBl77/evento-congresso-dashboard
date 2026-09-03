# Dashboard Evento Congresso 2025

Questo progetto e' il mio elaborato tecnico per la prova Full Stack Developer / Business Software Developer.

Ho realizzato una piccola applicazione web che importa i dati di un congresso medico da un file Excel, li salva in un database SQLite, li espone tramite API REST e li visualizza in una dashboard React.

L'obiettivo principale non e' mostrare il contenuto del foglio Excel cosi' com'e', ma trasformare i dati in un modello piu' interrogabile e usarli per leggere il percorso dei partecipanti: comunicazione pre-evento, interazioni on-site, accesso alla sala riservata, presenza al simposio e interazioni successive.

## Stack tecnico

Ho scelto questo stack:

- Backend: Node.js con Express
- Database: SQLite
- Frontend: React con Vite
- Grafici: Recharts
- Import Excel: libreria xlsx

Ho scelto SQLite perche' permette di avere un database reale e persistente senza richiedere l'installazione di un server esterno. Per una prova tecnica contenuta nel tempo mi sembra una scelta adatta, perche' consente di concentrarsi sul modello dati, sulle query e sulle aggregazioni.

Ho scelto React con Vite per separare in modo chiaro frontend e backend, mantenendo comunque un setup leggero e semplice da avviare.

## Struttura del progetto

La struttura principale del progetto e' questa:

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
  docker-compose.yml
  Dockerfile
  package.json
  README.md
  .gitignore
```

Il file Excel originale e' incluso nella repository per rendere ripetibile l'avvio del progetto, anche tramite Docker Compose. Il database SQLite generato non e' invece incluso, perche' viene ricreato dallo script di import.

Per eseguire il progetto e' necessario avere localmente il file:

```text
Dataset Evento Congresso 2025.xlsx
```

Se si vuole usare un file aggiornato manualmente, puo' essere posizionato nella root del progetto oppure in:

```text
data/raw/Dataset Evento Congresso 2025.xlsx
```

## Avvio rapido con Node.js

Il modo piu' semplice per avviare il progetto senza Docker e' usare Node.js.

Installo le dipendenze del backend:

```powershell
npm install
```

Installo le dipendenze del frontend:

```powershell
cd client
npm install
cd ..
```

Importo il dataset nel database SQLite:

```powershell
npm run import
```

Avvio backend e frontend con un solo comando dalla root:

```powershell
npm run dev
```

La dashboard viene esposta su:

```text
http://127.0.0.1:5173
```

Il backend viene esposto su:

```text
http://127.0.0.1:3000
```

## Avvio con Docker Compose

In alternativa, il progetto puo' essere avviato anche con Docker Compose. Questa modalita' richiede Docker Desktop avviato.

Dalla root del progetto eseguo:

```powershell
docker compose up --build
```

Il backend importa automaticamente il file Excel, crea il database SQLite dentro un volume Docker e poi avvia le API. Quando i servizi sono avviati, apro la dashboard nel browser:

```text
http://127.0.0.1:5173
```

Il backend resta disponibile su:

```text
http://127.0.0.1:3000
```

Per fermare i container:

```powershell
docker compose down
```

Per eliminare anche il volume con il database SQLite generato:

```powershell
docker compose down -v
```

## Installazione manuale separata

Se preferisco non usare il comando unico `npm run dev`, posso avviare backend e frontend in due terminali separati.

Dalla root del progetto installo le dipendenze:

```powershell
npm install
```

Poi installo le dipendenze del frontend:

```powershell
cd client
npm install
cd ..
```

## Import manuale dei dati

Dalla root del progetto eseguo:

```powershell
npm run import
```

Lo script legge il file Excel, ricrea il database SQLite e importa:

- partecipanti;
- definizioni dei touchpoint;
- valori dei touchpoint collegati ai partecipanti.

Il database viene generato in:

```text
data/evento-congresso.sqlite
```

Il comando e' pensato per essere ripetibile: a ogni esecuzione ricostruisce il database partendo dal file Excel originale.

## Verifica del database

Per controllare rapidamente il contenuto importato eseguo:

```powershell
node scripts/inspect-database.js
```

Questo script stampa conteggi e aggregazioni principali, utili per verificare che l'import sia coerente prima di avviare la dashboard.

## Avvio manuale separato dell'applicazione

Per usare l'applicazione in locale servono due terminali.

Nel primo terminale, dalla root del progetto, avvio il backend:

```powershell
npm run server
```

Il backend viene esposto su:

```text
http://127.0.0.1:3000
```

Nel secondo terminale avvio il frontend:

```powershell
cd client
npm run dev
```

La dashboard viene esposta su:

```text
http://127.0.0.1:5173
```

Durante lo sviluppo Vite inoltra le chiamate `/api` al backend Express.

## API disponibili

Il backend espone API REST per leggere i partecipanti e per ottenere aggregazioni gia' pronte per la dashboard.

Endpoint di controllo:

```text
GET /api/health
```

Endpoint partecipanti:

```text
GET /api/participants
```

Questo endpoint prevede:

- paginazione;
- filtro per tipologia stakeholder;
- filtro per regione;
- filtro per canale di ingaggio;
- ricerca testuale su nome, azienda o email.

Endpoint aggregazioni:

```text
GET /api/analytics/summary
GET /api/analytics/funnel
GET /api/analytics/by-dimension
GET /api/analytics/by-day
```

Le aggregazioni vengono calcolate nel backend tramite query SQL. Il browser riceve dati gia' pronti per essere visualizzati, senza dover ricostruire le metriche lato frontend.

## Modello dati

Il foglio `02_Partecipanti` e' largo e contiene molte colonne che rappresentano touchpoint diversi. Ho scelto quindi di non replicare semplicemente la struttura Excel in una tabella unica, ma di separare i dati in tre aree principali:

- `participants`: contiene i dati anagrafici del partecipante;
- `touchpoint_definitions`: contiene il dizionario dei touchpoint ricavato dal foglio `01_Interazioni`;
- `participant_touchpoints`: contiene i valori dei touchpoint associati ai singoli partecipanti.

Questa scelta mi permette di usare il foglio `01_Interazioni` come parte reale del modello dati e non solo come documentazione. Inoltre rende piu' semplici le query per fase del percorso, canale di ingaggio, tipologia di stakeholder, regione e giornata del congresso.

La spiegazione piu' dettagliata del modello e' nel file:

```text
docs/database-model.md
```

## Dashboard

La dashboard mostra:

- KPI principali dell'evento;
- funnel del percorso dei partecipanti;
- confronto per canale, stakeholder o regione;
- andamento giornaliero delle interazioni;
- tabella partecipanti con ricerca e paginazione.

Le viste principali nascono dall'incrocio tra dati anagrafici, canali di ingaggio e touchpoint. In questo modo la dashboard non si limita a contare righe del file Excel, ma prova a leggere il comportamento dei partecipanti nelle diverse fasi dell'evento.

## Interpretazione dei dati

Durante l'analisi del file Excel ho individuato alcune particolarita' da gestire:

- alcune celle vuote non rappresentano zero, ad esempio `permanenza_min` e `focus_rate` quando il partecipante non era presente al simposio;
- le date sono in formato italiano;
- email e nomi sono sintetici e appartengono al dominio `example.org`;
- il `focus_rate` e' un valore decimale tra 0 e 1.

Queste interpretazioni vengono applicate nello script di import e sono alla base delle aggregazioni mostrate nella dashboard.

## Verifiche eseguite

Ho verificato:

- import del file Excel nel database SQLite;
- conteggi principali del database;
- endpoint `/api/health`;
- endpoint partecipanti con paginazione e filtri;
- endpoint analytics principali;
- build di produzione del frontend React.

Comando usato per verificare la build frontend:

```powershell
cd client
npm run build
```

La build viene completata correttamente. Vite segnala solo un warning sulla dimensione del bundle JavaScript, dovuto anche all'uso di Recharts. Per una prova tecnica locale lo considero accettabile.

## Limiti e sviluppi futuri

Con piu' tempo aggiungerei:

- test automatici sulle query principali;
- validazione piu' estesa sul dataset;
- filtri piu' granulari nella dashboard;
- esportazione CSV delle viste aggregate.
