import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const excelCandidates = [
  path.join(projectRoot, "data", "raw", "Dataset Evento Congresso 2025.xlsx"),
  path.join(projectRoot, "Dataset Evento Congresso 2025.xlsx"),
];

const excelPath = excelCandidates.find((candidate) => fs.existsSync(candidate));
const databaseDir = path.join(projectRoot, "data");
const databasePath = path.join(databaseDir, "evento-congresso.sqlite");

if (!excelPath) {
  console.error("File Excel non trovato.");
  console.error("Percorso atteso: data/raw/Dataset Evento Congresso 2025.xlsx");
  process.exit(1);
}

fs.mkdirSync(databaseDir, { recursive: true });

const removeExistingDatabase = () => {
  if (!fs.existsSync(databasePath)) {
    return;
  }

  try {
    fs.unlinkSync(databasePath);
  } catch (error) {
    if (["EBUSY", "EPERM"].includes(error.code)) {
      console.error("Database SQLite gia' in uso.");
      console.error("Chiudere il backend o altri programmi che stanno usando il database.");
      console.error(`File bloccato: ${databasePath}`);
      process.exit(1);
    }

    throw error;
  }
};

removeExistingDatabase();

const workbook = xlsx.readFile(excelPath, {
  cellDates: false,
  raw: false,
});

const definitionsRows = xlsx.utils.sheet_to_json(workbook.Sheets["01_Interazioni"], {
  defval: null,
});

const participantsRows = xlsx.utils.sheet_to_json(workbook.Sheets["02_Partecipanti"], {
  defval: null,
});

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = Number(String(value).replace(",", "."));
  return Number.isNaN(normalized) ? null : normalized;
};

const normalizeBoolean = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "si", "sì", "yes"].includes(normalized)) {
    return 1;
  }

  if (["0", "false", "no"].includes(normalized)) {
    return 0;
  }

  return null;
};

const normalizeItalianDate = (value) => {
  const text = normalizeString(value);

  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return text;
  }

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const getDefinitionType = (definition) =>
  normalizeString(definition["Tipo di dato"])?.toLowerCase() ?? "testo";

const normalizeTouchpointValue = (value, definition) => {
  const type = getDefinitionType(definition);

  if (type === "booleano") {
    return normalizeBoolean(value);
  }

  if (["conteggio", "minuti", "tasso da 0 a 1"].includes(type)) {
    return normalizeNumber(value);
  }

  if (type === "data") {
    return normalizeItalianDate(value);
  }

  return normalizeString(value);
};

const createSchema = () => {
  db.exec(`
    CREATE TABLE participants (
      id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      stakeholder_type TEXT,
      region TEXT,
      engagement_channel TEXT,
      in_dem_database INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE touchpoint_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      excel_column TEXT NOT NULL,
      source_header TEXT NOT NULL UNIQUE,
      technical_name TEXT NOT NULL UNIQUE,
      data_type TEXT NOT NULL,
      journey_phase TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE participant_touchpoints (
      participant_id INTEGER NOT NULL,
      touchpoint_id INTEGER NOT NULL,
      value_text TEXT,
      value_number REAL,
      value_boolean INTEGER,
      value_date TEXT,
      PRIMARY KEY (participant_id, touchpoint_id),
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      FOREIGN KEY (touchpoint_id) REFERENCES touchpoint_definitions(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_participants_stakeholder_type
      ON participants(stakeholder_type);

    CREATE INDEX idx_participants_region
      ON participants(region);

    CREATE INDEX idx_participants_engagement_channel
      ON participants(engagement_channel);

    CREATE INDEX idx_touchpoint_definitions_phase
      ON touchpoint_definitions(journey_phase);

    CREATE INDEX idx_participant_touchpoints_boolean
      ON participant_touchpoints(touchpoint_id, value_boolean);

    CREATE INDEX idx_participant_touchpoints_date
      ON participant_touchpoints(touchpoint_id, value_date);
  `);
};

const importData = db.transaction(() => {
  createSchema();

  // Gli statement vengono preparati dopo la creazione dello schema.
  // In questo modo SQLite trova gia' le tabelle quando better-sqlite3 valida le query.
  const insertParticipant = db.prepare(`
    INSERT INTO participants (
      id,
      full_name,
      email,
      stakeholder_type,
      region,
      engagement_channel,
      in_dem_database
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDefinition = db.prepare(`
    INSERT INTO touchpoint_definitions (
      excel_column,
      source_header,
      technical_name,
      data_type,
      journey_phase,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertTouchpoint = db.prepare(`
    INSERT INTO participant_touchpoints (
      participant_id,
      touchpoint_id,
      value_text,
      value_number,
      value_boolean,
      value_date
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const touchpointDefinitions = definitionsRows
    .map((row) => ({
      excelColumn: normalizeString(row["Colonna"]),
      sourceHeader: normalizeString(row["Intestazione nel foglio 02"]),
      technicalName: normalizeString(row["Nome tecnico"]),
      dataType: normalizeString(row["Tipo di dato"]),
      journeyPhase: normalizeString(row["Fase del percorso"]),
      description: normalizeString(row["Descrizione"]),
    }))
    .filter((definition) => definition.sourceHeader && definition.technicalName);

  for (const definition of touchpointDefinitions) {
    insertDefinition.run(
      definition.excelColumn,
      definition.sourceHeader,
      definition.technicalName,
      definition.dataType,
      definition.journeyPhase,
      definition.description,
    );
  }

  const touchpointIds = new Map(
    db
      .prepare("SELECT id, source_header FROM touchpoint_definitions")
      .all()
      .map((definition) => [definition.source_header, definition.id]),
  );

  const participantColumns = new Set([
    "ID",
    "Nome e cognome",
    "Email (chiave)",
    "Tipologia stakeholder",
    "Regione",
    "Canale di ingaggio",
    "In database DEM",
  ]);

  const touchpointColumns = touchpointDefinitions.filter(
    (definition) => !participantColumns.has(definition.sourceHeader),
  );

  for (const row of participantsRows) {
    const participantId = normalizeNumber(row["ID"]);
    const fullName = normalizeString(row["Nome e cognome"]);
    const email = normalizeString(row["Email (chiave)"]);

    if (!participantId || !fullName || !email) {
      continue;
    }

    insertParticipant.run(
      participantId,
      fullName,
      email,
      normalizeString(row["Tipologia stakeholder"]),
      normalizeString(row["Regione"]),
      normalizeString(row["Canale di ingaggio"]),
      normalizeBoolean(row["In database DEM"]) ?? 0,
    );

    for (const definition of touchpointColumns) {
      const rawValue = row[definition.sourceHeader];
      const normalizedValue = normalizeTouchpointValue(rawValue, {
        "Tipo di dato": definition.dataType,
      });

      if (normalizedValue === null) {
        continue;
      }

      const type = definition.dataType.toLowerCase();
      const touchpointId = touchpointIds.get(definition.sourceHeader);

      insertTouchpoint.run(
        participantId,
        touchpointId,
        type === "testo" ? normalizedValue : null,
        ["conteggio", "minuti", "tasso da 0 a 1"].includes(type) ? normalizedValue : null,
        type === "booleano" ? normalizedValue : null,
        type === "data" ? normalizedValue : null,
      );
    }
  }
});

importData();

const participantCount = db.prepare("SELECT COUNT(*) AS total FROM participants").get().total;
const definitionCount = db.prepare("SELECT COUNT(*) AS total FROM touchpoint_definitions").get().total;
const touchpointCount = db.prepare("SELECT COUNT(*) AS total FROM participant_touchpoints").get().total;

db.close();

console.log("Import completato.");
console.log(`Database: ${databasePath}`);
console.log(`Partecipanti importati: ${participantCount}`);
console.log(`Definizioni touchpoint importate: ${definitionCount}`);
console.log(`Valori touchpoint importati: ${touchpointCount}`);
