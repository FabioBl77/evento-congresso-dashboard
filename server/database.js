import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const databasePath = path.join(projectRoot, "data", "evento-congresso.sqlite");

let database = null;

/**
 * Restituisce una singola connessione SQLite condivisa dal backend.
 *
 * Il database viene creato dallo script `npm run import`, quindi qui controllo
 * solo che il file esista. Se manca, l'errore indica subito all'utente il
 * comando corretto da eseguire prima di avviare le API.
 */
export const getDatabase = () => {
  if (database) {
    return database;
  }

  if (!fs.existsSync(databasePath)) {
    throw new Error("Database non trovato. Eseguire prima: npm run import");
  }

  database = new Database(databasePath, {
    fileMustExist: true,
  });

  database.pragma("foreign_keys = ON");

  return database;
};

/**
 * Helper per leggere l'id interno di un touchpoint partendo dal suo nome tecnico.
 * Le route analytics lo useranno per evitare di duplicare query ripetitive.
 */
export const getTouchpointId = (technicalName) => {
  const row = getDatabase()
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

/**
 * Chiude la connessione quando il processo termina.
 * In sviluppo non e' indispensabile, ma evita handle aperti nei test o negli script.
 */
export const closeDatabase = () => {
  if (!database) {
    return;
  }

  database.close();
  database = null;
};
