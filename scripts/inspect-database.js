import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const databasePath = path.join(projectRoot, "data", "evento-congresso.sqlite");

if (!fs.existsSync(databasePath)) {
  console.error("Database non trovato.");
  console.error("Eseguire prima: npm run import");
  process.exit(1);
}

const db = new Database(databasePath, {
  readonly: true,
  fileMustExist: true,
});

// Recupera l'id tecnico di un touchpoint partendo dal nome normalizzato
// definito nel foglio 01_Interazioni.
const getTouchpointId = (technicalName) => {
  const row = db
    .prepare(
      `
        SELECT id
        FROM touchpoint_definitions
        WHERE technical_name = ?
      `,
    )
    .get(technicalName);

  if (!row) {
    throw new Error(`Touchpoint non trovato: ${technicalName}`);
  }

  return row.id;
};

// Conta i partecipanti che hanno un determinato touchpoint booleano valorizzato a 1.
const countBooleanTouchpoint = (technicalName) => {
  const touchpointId = getTouchpointId(technicalName);

  return db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM participant_touchpoints
        WHERE touchpoint_id = ?
          AND value_boolean = 1
      `,
    )
    .get(touchpointId).total;
};

const printSection = (title) => {
  console.log("");
  console.log(title);
  console.log("-".repeat(title.length));
};

try {
  printSection("Conteggi principali");

  const participantCount = db.prepare("SELECT COUNT(*) AS total FROM participants").get().total;
  const definitionCount = db.prepare("SELECT COUNT(*) AS total FROM touchpoint_definitions").get().total;
  const valueCount = db.prepare("SELECT COUNT(*) AS total FROM participant_touchpoints").get().total;

  console.table([
    { metrica: "Partecipanti", valore: participantCount },
    { metrica: "Definizioni touchpoint", valore: definitionCount },
    { metrica: "Valori touchpoint", valore: valueCount },
  ]);

  printSection("Funnel base");

  const demDatabaseCount = db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM participants
        WHERE in_dem_database = 1
      `,
    )
    .get().total;

  console.table([
    { step: "In database DEM", valore: demDatabaseCount },
    { step: "DEM inviata", valore: countBooleanTouchpoint("dem_inviata") },
    { step: "DEM consegnata", valore: countBooleanTouchpoint("dem_consegnata") },
    { step: "DEM aperta", valore: countBooleanTouchpoint("dem_aperta") },
    { step: "Visita stand", valore: countBooleanTouchpoint("visita_stand") },
    { step: "Accesso sala VIP", valore: countBooleanTouchpoint("accesso_sala_vip") },
    { step: "Presenza simposio", valore: countBooleanTouchpoint("presenza_simposio") },
  ]);

  printSection("Touchpoint per fase percorso");

  console.table(
    db
      .prepare(
        `
          SELECT journey_phase AS fase, COUNT(*) AS touchpoint
          FROM touchpoint_definitions
          GROUP BY journey_phase
          ORDER BY journey_phase
        `,
      )
      .all(),
  );

  printSection("Attivazione per canale di ingaggio");

  console.table(
    db
      .prepare(
        `
          SELECT
            p.engagement_channel AS canale,
            COUNT(*) AS partecipanti,
            SUM(CASE WHEN stand.value_boolean = 1 THEN 1 ELSE 0 END) AS visite_stand,
            SUM(CASE WHEN vip.value_boolean = 1 THEN 1 ELSE 0 END) AS accessi_vip,
            SUM(CASE WHEN simposio.value_boolean = 1 THEN 1 ELSE 0 END) AS presenze_simposio
          FROM participants p
          LEFT JOIN touchpoint_definitions stand_def
            ON stand_def.technical_name = 'visita_stand'
          LEFT JOIN participant_touchpoints stand
            ON stand.participant_id = p.id
           AND stand.touchpoint_id = stand_def.id
          LEFT JOIN touchpoint_definitions vip_def
            ON vip_def.technical_name = 'accesso_sala_vip'
          LEFT JOIN participant_touchpoints vip
            ON vip.participant_id = p.id
           AND vip.touchpoint_id = vip_def.id
          LEFT JOIN touchpoint_definitions simposio_def
            ON simposio_def.technical_name = 'presenza_simposio'
          LEFT JOIN participant_touchpoints simposio
            ON simposio.participant_id = p.id
           AND simposio.touchpoint_id = simposio_def.id
          GROUP BY p.engagement_channel
          ORDER BY partecipanti DESC
        `,
      )
      .all(),
  );

  printSection("Andamento visite per giornata");

  console.table(
    db
      .prepare(
        `
          SELECT
            giorno.value_date AS giorno,
            COUNT(*) AS visite_stand,
            SUM(COALESCE(visualizzazioni.value_number, 0)) AS visualizzazioni,
            SUM(COALESCE(scroll.value_number, 0)) AS approfondimenti
          FROM participant_touchpoints giorno
          JOIN touchpoint_definitions giorno_def
            ON giorno_def.id = giorno.touchpoint_id
           AND giorno_def.technical_name = 'giorno_visita'
          LEFT JOIN touchpoint_definitions visualizzazioni_def
            ON visualizzazioni_def.technical_name = 'visualizzazioni'
          LEFT JOIN participant_touchpoints visualizzazioni
            ON visualizzazioni.participant_id = giorno.participant_id
           AND visualizzazioni.touchpoint_id = visualizzazioni_def.id
          LEFT JOIN touchpoint_definitions scroll_def
            ON scroll_def.technical_name = 'scroll'
          LEFT JOIN participant_touchpoints scroll
            ON scroll.participant_id = giorno.participant_id
           AND scroll.touchpoint_id = scroll_def.id
          WHERE giorno.value_date IS NOT NULL
          GROUP BY giorno.value_date
          ORDER BY giorno.value_date
        `,
      )
      .all(),
  );

  printSection("Controllo valori null attesi");

  const permanenceId = getTouchpointId("permanenza_min");
  const focusRateId = getTouchpointId("focus_rate");

  console.table([
    {
      controllo: "Permanenza valorizzata",
      valore: db
        .prepare(
          `
            SELECT COUNT(*) AS total
            FROM participant_touchpoints
            WHERE touchpoint_id = ?
              AND value_number IS NOT NULL
          `,
        )
        .get(permanenceId).total,
    },
    {
      controllo: "Focus rate valorizzato",
      valore: db
        .prepare(
          `
            SELECT COUNT(*) AS total
            FROM participant_touchpoints
            WHERE touchpoint_id = ?
              AND value_number IS NOT NULL
          `,
        )
        .get(focusRateId).total,
    },
  ]);
} finally {
  db.close();
}
