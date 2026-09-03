# Dashboard Evento Congresso 2025

Questo progetto e' il mio elaborato tecnico per la prova Junior Full Stack Developer data-oriented.

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

La struttura prevista del progetto e' questa:

```text
Evento Congresso
  data
    raw
      Dataset Evento Congresso 2025.xlsx
    evento-congresso.sqlite
  docs
    Prova Tecnica Developer.docx
  server
    database.js
    index.js
    routes
      analytics.routes.js
      participants.routes.js
  scripts
    import-excel.js
  client
    index.html
    package.json
    vite.config.js
    src
      App.jsx
      main.jsx
      api.js
      styles.css
      components
        Filters.jsx
        FunnelChart.jsx
        DimensionComparison.jsx
        DailyTrend.jsx
        ParticipantsTable.jsx
  package.json
  README.md
  .gitignore
```

## Come avviare il progetto

I comandi definitivi verranno aggiornati al termine dell'implementazione. L'obiettivo e' permettere l'avvio su una macchina pulita con una sequenza semplice:

```text
npm install
npm run import
npm run dev
```

Il comando di import dovra' essere ripetibile: a ogni esecuzione dovra' ricreare il database partendo dal file Excel originale.

## Modello dati

Il foglio `02_Partecipanti` e' largo e contiene molte colonne che rappresentano touchpoint diversi. Ho scelto quindi di non replicare semplicemente la struttura Excel in una tabella unica, ma di separare i dati in tre aree principali:

- `participants`: contiene i dati anagrafici del partecipante;
- `touchpoint_definitions`: contiene il dizionario dei touchpoint ricavato dal foglio `01_Interazioni`;
- `participant_touchpoints`: contiene i valori dei touchpoint associati ai singoli partecipanti.

Questa scelta mi permette di usare il foglio `01_Interazioni` come parte reale del modello dati e non solo come documentazione. Inoltre rende piu' semplici le query per fase del percorso, canale di ingaggio, tipologia di stakeholder, regione e giornata del congresso.

## API

Il backend espone API REST per leggere i partecipanti e per ottenere aggregazioni gia' pronte per la dashboard.

Endpoint partecipanti:

```text
GET /api/participants
```

Questo endpoint prevede:

- paginazione;
- filtro per tipologia stakeholder;
- filtro per regione;
- filtro per canale di ingaggio;
- ricerca testuale su nome o email.

Endpoint aggregazioni:

```text
GET /api/analytics/funnel
GET /api/analytics/by-dimension
GET /api/analytics/by-day
GET /api/analytics/summary
```

Le aggregazioni vengono calcolate nel backend o tramite query SQL. Il browser riceve dati gia' pronti per essere visualizzati, senza dover ricostruire le metriche lato frontend.

## Dashboard

La dashboard mostra:

- un funnel del percorso dei partecipanti;
- un confronto per dimensione anagrafica;
- l'andamento per giornata del congresso;
- una tabella partecipanti con filtro e paginazione;
- stati di caricamento, errore e risultato vuoto.

Almeno due viste nascono dall'incrocio di dimensioni diverse. Gli incroci principali che ho previsto sono:

- canale di ingaggio e livello di attivazione;
- giorno visita e interazioni on-site;
- accesso alla sala VIP e presenza al simposio.

## Interpretazione dei dati

Durante la prima analisi del file Excel ho individuato alcune particolarita' da gestire:

- alcune celle vuote non rappresentano zero, ad esempio `permanenza_min` e `focus_rate` quando il partecipante non era presente al simposio;
- le date sono in formato italiano;
- alcune intestazioni LinkedIn non sono perfettamente coerenti, quindi uso i nomi tecnici del dizionario;
- email e nomi sono sintetici e appartengono al dominio `example.org`;
- il `focus_rate` e' un valore decimale tra 0 e 1.

Queste interpretazioni vengono applicate nello script di import e sono alla base delle aggregazioni mostrate nella dashboard.

## Osservazioni che voglio rendere visibili

Con questa dashboard voglio rendere leggibili almeno tre aspetti:

- quante persone passano dall'apertura della DEM alla visita allo stand;
- quali canali di ingaggio portano partecipanti piu' attivi;
- come cambiano visite, interazioni e accessi nelle diverse giornate del congresso.

## Limiti e sviluppi futuri

Con piu' tempo aggiungerei:

- test automatici sulle query principali;
- validazione piu' estesa sul dataset;
- Docker Compose per rendere l'ambiente ancora piu' riproducibile;
- filtri piu' granulari nella dashboard;
- esportazione CSV delle viste aggregate.
