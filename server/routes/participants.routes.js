import { Router } from "express";
import { getDatabase } from "../database.js";

const router = Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const normalizeFilter = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildParticipantsWhere = (query) => {
  const conditions = [];
  const params = {};

  const stakeholderType = normalizeFilter(query.stakeholderType);
  const region = normalizeFilter(query.region);
  const engagementChannel = normalizeFilter(query.engagementChannel);
  const search = normalizeFilter(query.search);

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

  if (search) {
    conditions.push("(p.full_name LIKE @search OR p.email LIKE @search)");
    params.search = `%${search}%`;
  }

  return {
    whereSql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
};

/**
 * Elenco partecipanti.
 *
 * Ho tenuto filtri e paginazione lato backend per evitare che il browser debba
 * caricare tutto il dataset. Questo endpoint sara' usato dalla tabella React.
 */
router.get("/", (request, response, next) => {
  try {
    const db = getDatabase();
    const page = parsePositiveInteger(request.query.page, DEFAULT_PAGE);
    const requestedPageSize = parsePositiveInteger(request.query.pageSize, DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;
    const { whereSql, params } = buildParticipantsWhere(request.query);

    const total = db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM participants p
          ${whereSql}
        `,
      )
      .get(params).total;

    const participants = db
      .prepare(
        `
          SELECT
            p.id,
            p.full_name AS fullName,
            p.email,
            p.stakeholder_type AS stakeholderType,
            p.region,
            p.engagement_channel AS engagementChannel,
            p.in_dem_database AS inDemDatabase
          FROM participants p
          ${whereSql}
          ORDER BY p.id
          LIMIT @pageSize
          OFFSET @offset
        `,
      )
      .all({
        ...params,
        pageSize,
        offset,
      });

    response.json({
      data: participants,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        stakeholderType: normalizeFilter(request.query.stakeholderType),
        region: normalizeFilter(request.query.region),
        engagementChannel: normalizeFilter(request.query.engagementChannel),
        search: normalizeFilter(request.query.search),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
