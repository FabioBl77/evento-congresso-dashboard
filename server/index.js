import express from "express";
import cors from "cors";
import { closeDatabase, getDatabase } from "./database.js";
import participantsRoutes from "./routes/participants.routes.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/participants", participantsRoutes);

/**
 * Endpoint tecnico minimale.
 *
 * Serve per verificare subito che:
 * - il server Express sia avviato;
 * - il database SQLite sia stato creato con `npm run import`;
 * - la tabella principale sia interrogabile.
 */
app.get("/api/health", (request, response, next) => {
  try {
    const db = getDatabase();
    const result = db.prepare("SELECT COUNT(*) AS total FROM participants").get();

    response.json({
      status: "ok",
      database: "connected",
      participants: result.total,
    });
  } catch (error) {
    next(error);
  }
});

app.use((request, response) => {
  response.status(404).json({
    error: "Endpoint non trovato",
  });
});

app.use((error, request, response, next) => {
  console.error(error);

  response.status(500).json({
    error: "Errore interno del server",
    message: error.message,
  });
});

const server = app.listen(port, () => {
  console.log(`API server avviato su http://localhost:${port}`);
});

const shutdown = () => {
  closeDatabase();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
