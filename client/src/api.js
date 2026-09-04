const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.set(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

const requestJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    let message = "Errore durante la richiesta API";

    try {
      const errorBody = await response.json();
      message = errorBody.message || errorBody.error || message;
    } catch {
      message = `${message}: HTTP ${response.status}`;
    }

    throw new Error(message);
  }

  return response.json();
};

/**
 * Centralizzo qui le chiamate HTTP.
 *
 * In questo modo i componenti React restano concentrati sulla visualizzazione,
 * mentre questo file conosce gli endpoint esposti dal backend Express.
 */
export const api = {
  getSummary: (filters) => requestJson(`/api/analytics/summary${buildQueryString(filters)}`),

  getFunnel: (filters) => requestJson(`/api/analytics/funnel${buildQueryString(filters)}`),

  getRelationships: (filters) =>
    requestJson(`/api/analytics/relationships${buildQueryString(filters)}`),

  getByDimension: (dimension, filters) =>
    requestJson(
      `/api/analytics/by-dimension${buildQueryString({
        ...filters,
        dimension,
      })}`,
    ),

  getByDay: (filters) => requestJson(`/api/analytics/by-day${buildQueryString(filters)}`),

  getParticipantFilters: () => requestJson("/api/participants/filters"),

  getParticipants: (params) => requestJson(`/api/participants${buildQueryString(params)}`),
};
