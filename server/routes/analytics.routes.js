import { Router } from "express";
import { getDatabase, getTouchpointId } from "../database.js";

const router = Router();

const normalizeFilter = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildParticipantFilters = (query) => {
  const conditions = [];
  const params = {};

  const stakeholderType = normalizeFilter(query.stakeholderType);
  const region = normalizeFilter(query.region);
  const engagementChannel = normalizeFilter(query.engagementChannel);

  if (stakeholderType) {
    conditions.push("p.stakeholder_type = @stakeholderType");
    params.stakeholderType = stakeholderType;
  }

  if (region) {
    conditions.push("p.region = @region");
    params.region = region;
  }

  if (engagementChannel) {
    conditions.push("p.engagement_channel = @engagementChannel");
    params.engagementChannel = engagementChannel;
  }

  return {
    whereSql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
};

const countBooleanTouchpoint = (db, technicalName, filters) => {
  const touchpointId = getTouchpointId(technicalName);

  return db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM participants p
        JOIN participant_touchpoints pt
          ON pt.participant_id = p.id
         AND pt.touchpoint_id = @touchpointId
         AND pt.value_boolean = 1
        ${filters.whereSql}
      `,
    )
    .get({
      ...filters.params,
      touchpointId,
    }).total;
};

/**
 * KPI sintetici della dashboard.
 *
 * Questo endpoint prepara numeri gia' pronti per il frontend, evitando di
 * replicare calcoli nel browser.
 */
router.get("/summary", (request, response, next) => {
  try {
    const db = getDatabase();
    const filters = buildParticipantFilters(request.query);

    const participants = db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM participants p
          ${filters.whereSql}
        `,
      )
      .get(filters.params).total;

    response.json({
      participants,
      demSent: countBooleanTouchpoint(db, "dem_inviata", filters),
      demOpened: countBooleanTouchpoint(db, "dem_aperta", filters),
      standVisits: countBooleanTouchpoint(db, "visita_stand", filters),
      vipAccesses: countBooleanTouchpoint(db, "accesso_sala_vip", filters),
      symposiumAttendances: countBooleanTouchpoint(db, "presenza_simposio", filters),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Funnel del percorso evento.
 *
 * Il primo step arriva dalla tabella participants, mentre gli altri step sono
 * touchpoint booleani. Lo tengo esplicito per rendere chiara la differenza tra
 * dimensioni anagrafiche e interazioni.
 */
router.get("/funnel", (request, response, next) => {
  try {
    const db = getDatabase();
    const filters = buildParticipantFilters(request.query);

    const demDatabase = db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM participants p
          ${filters.whereSql ? `${filters.whereSql} AND` : "WHERE"} p.in_dem_database = 1
        `,
      )
      .get(filters.params).total;

    response.json([
      { label: "In database DEM", value: demDatabase },
      { label: "DEM inviata", value: countBooleanTouchpoint(db, "dem_inviata", filters) },
      { label: "DEM consegnata", value: countBooleanTouchpoint(db, "dem_consegnata", filters) },
      { label: "DEM aperta", value: countBooleanTouchpoint(db, "dem_aperta", filters) },
      { label: "Visita stand", value: countBooleanTouchpoint(db, "visita_stand", filters) },
      { label: "Accesso sala VIP", value: countBooleanTouchpoint(db, "accesso_sala_vip", filters) },
      { label: "Presenza simposio", value: countBooleanTouchpoint(db, "presenza_simposio", filters) },
    ]);
  } catch (error) {
    next(error);
  }
});

/**
 * Confronto per dimensione anagrafica.
 *
 * Accetto solo dimensioni previste per evitare SQL dinamico non controllato.
 */
router.get("/by-dimension", (request, response, next) => {
  try {
    const allowedDimensions = {
      stakeholderType: "p.stakeholder_type",
      region: "p.region",
      engagementChannel: "p.engagement_channel",
    };

    const dimension = normalizeFilter(request.query.dimension) ?? "engagementChannel";
    const dimensionColumn = allowedDimensions[dimension];

    if (!dimensionColumn) {
      response.status(400).json({
        error: "Dimensione non valida",
        allowedDimensions: Object.keys(allowedDimensions),
      });
      return;
    }

    const db = getDatabase();
    const filters = buildParticipantFilters(request.query);

    response.json(
      db
        .prepare(
          `
            SELECT
              ${dimensionColumn} AS label,
              COUNT(*) AS participants,
              SUM(CASE WHEN stand.value_boolean = 1 THEN 1 ELSE 0 END) AS standVisits,
              SUM(CASE WHEN vip.value_boolean = 1 THEN 1 ELSE 0 END) AS vipAccesses,
              SUM(CASE WHEN simposio.value_boolean = 1 THEN 1 ELSE 0 END) AS symposiumAttendances
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
            ${filters.whereSql}
            GROUP BY ${dimensionColumn}
            ORDER BY participants DESC
          `,
        )
        .all(filters.params),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * Andamento giornaliero delle interazioni on-site.
 *
 * Uso `giorno_visita` come asse temporale e incrocio la giornata con visite,
 * contenuti aperti, approfondimenti, sala VIP e simposio.
 */
router.get("/by-day", (request, response, next) => {
  try {
    const db = getDatabase();
    const filters = buildParticipantFilters(request.query);

    response.json(
      db
        .prepare(
          `
            SELECT
              giorno.value_date AS day,
              COUNT(*) AS standVisits,
              SUM(COALESCE(visualizzazioni.value_number, 0)) AS contentViews,
              SUM(COALESCE(scroll.value_number, 0)) AS deepViews,
              SUM(CASE WHEN vip.value_boolean = 1 THEN 1 ELSE 0 END) AS vipAccesses,
              SUM(CASE WHEN simposio.value_boolean = 1 THEN 1 ELSE 0 END) AS symposiumAttendances
            FROM participants p
            JOIN touchpoint_definitions giorno_def
              ON giorno_def.technical_name = 'giorno_visita'
            JOIN participant_touchpoints giorno
              ON giorno.participant_id = p.id
             AND giorno.touchpoint_id = giorno_def.id
             AND giorno.value_date IS NOT NULL
            LEFT JOIN touchpoint_definitions visualizzazioni_def
              ON visualizzazioni_def.technical_name = 'visualizzazioni'
            LEFT JOIN participant_touchpoints visualizzazioni
              ON visualizzazioni.participant_id = p.id
             AND visualizzazioni.touchpoint_id = visualizzazioni_def.id
            LEFT JOIN touchpoint_definitions scroll_def
              ON scroll_def.technical_name = 'scroll'
            LEFT JOIN participant_touchpoints scroll
              ON scroll.participant_id = p.id
             AND scroll.touchpoint_id = scroll_def.id
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
            ${filters.whereSql}
            GROUP BY giorno.value_date
            ORDER BY giorno.value_date
          `,
        )
        .all(filters.params),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
