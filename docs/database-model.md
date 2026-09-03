# Modello dati

In questa prova ho scelto di non copiare il foglio `02_Partecipanti` in una sola tabella larga.

Il motivo e' che molte colonne del foglio rappresentano touchpoint ripetitivi: email inviate, email aperte, interazioni LinkedIn, visite allo stand, accessi alla sala VIP, presenza al simposio, permanenza e quiz. Tenerle tutte come colonne avrebbe funzionato per una prima lettura, ma avrebbe reso meno flessibili le aggregazioni per fase del percorso.

Ho quindi separato il modello in tre tabelle principali:

- `participants`
- `touchpoint_definitions`
- `participant_touchpoints`

## participants

La tabella `participants` contiene una riga per ogni persona.

Campi principali:

```text
id
full_name
email
stakeholder_type
region
engagement_channel
in_dem_database
```

L'email e' trattata come chiave univoca del dataset, come indicato nella consegna. L'id progressivo del foglio Excel viene mantenuto come chiave primaria tecnica.

Ho mantenuto in questa tabella le informazioni anagrafiche e di classificazione, perche' sono dimensioni utili per filtrare e confrontare i risultati.

## touchpoint_definitions

La tabella `touchpoint_definitions` deriva dal foglio `01_Interazioni`.

Campi principali:

```text
id
excel_column
source_header
technical_name
data_type
journey_phase
description
```

Questa tabella serve a trasformare il dizionario del file Excel in una parte reale del database.

In questo modo ogni touchpoint conserva:

- intestazione originale del foglio partecipanti;
- nome tecnico normalizzato;
- tipo di dato;
- fase del percorso;
- descrizione funzionale.

Questa scelta permette di interrogare i dati non solo per singola metrica, ma anche per fase del percorso, ad esempio pre-evento, on-site, sessione e post-evento.

## participant_touchpoints

La tabella `participant_touchpoints` collega ogni partecipante ai touchpoint misurati.

Campi principali:

```text
participant_id
touchpoint_id
value_text
value_number
value_boolean
value_date
```

Ho usato colonne valore separate per tipo per evitare di salvare tutto come testo. In questo modo i dati restano interrogabili correttamente:

- i booleani possono essere contati;
- i numeri possono essere sommati o mediati;
- le date possono essere ordinate;
- i testi restano disponibili quando servono.

La chiave primaria e' composta da:

```text
participant_id
touchpoint_id
```

Questo impedisce di salvare due volte lo stesso touchpoint per lo stesso partecipante.

## Gestione dei valori vuoti

Non tutti i valori vuoti hanno lo stesso significato.

Per esempio:

- `Permanenza (min)` e' vuoto se la persona non era presente al simposio;
- `Focus rate` e' vuoto se la persona non era presente al simposio;
- `Giorno visita` e' vuoto se la persona non ha visitato lo stand.

Per questo motivo lo script di import non trasforma automaticamente tutte le celle vuote in zero. I valori mancanti vengono salvati come assenza di valore, mentre gli zeri espliciti vengono mantenuti quando il dataset li contiene.

## Normalizzazioni applicate

Durante l'import applico queste normalizzazioni:

- stringhe vuote convertite in `null`;
- booleani convertiti in `0` o `1`;
- numeri convertiti in valori numerici;
- date italiane convertite da `DD/MM/YYYY` a `YYYY-MM-DD`;
- `focus_rate` mantenuto come numero decimale tra 0 e 1.

## Query e aggregazioni supportate

Questo modello permette di costruire le aggregazioni richieste dalla dashboard:

- funnel del percorso;
- confronto per canale di ingaggio;
- confronto per regione;
- confronto per tipologia stakeholder;
- andamento per giornata;
- incroci tra canale, fase e livello di attivazione.

Esempi di domande supportate:

- quante persone hanno aperto la DEM e poi visitato lo stand;
- quale canale di ingaggio porta piu' visite allo stand;
- quali giornate hanno generato piu' interazioni on-site;
- chi accede alla sala VIP e' coinvolto anche nel simposio.

## Verifica iniziale

Dopo l'import ho verificato il database con uno script dedicato.

Risultati principali:

```text
Partecipanti: 2375
Definizioni touchpoint: 24
Valori touchpoint: 33610
```

Funnel base verificato:

```text
In database DEM: 1846
DEM inviata: 1846
DEM consegnata: 1793
DEM aperta: 419
Visita stand: 168
Accesso sala VIP: 61
Presenza simposio: 96
```

Questa verifica mi permette di costruire le API partendo da query gia' controllate.
