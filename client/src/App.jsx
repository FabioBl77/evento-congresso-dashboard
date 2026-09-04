import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "./api.js";

const emptyFilters = {
  stakeholderType: "",
  region: "",
  engagementChannel: "",
};

const emptyFilterOptions = {
  stakeholderTypes: [],
  regions: [],
  engagementChannels: [],
};

const dimensionOptions = [
  { value: "engagementChannel", label: "Canale di ingaggio" },
  { value: "stakeholderType", label: "Tipologia stakeholder" },
  { value: "region", label: "Regione" },
];

const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "participants", label: "Partecipanti" },
];

const numberFormatter = new Intl.NumberFormat("it-IT");

const formatNumber = (value) => numberFormatter.format(value || 0);

const formatPercentage = (value, total) => {
  if (!total) {
    return "0,0%";
  }

  return `${((value / total) * 100).toFixed(1).replace(".", ",")}%`;
};

const normalizeChartName = (value) => value || "Non indicato";

function App() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [filters, setFilters] = useState(emptyFilters);
  const [dimension, setDimension] = useState("engagementChannel");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterOptions, setFilterOptions] = useState(emptyFilterOptions);
  const [dashboardData, setDashboardData] = useState({
    summary: null,
    funnel: [],
    relationships: [],
    byDimension: [],
    byDay: [],
  });
  const [participants, setParticipants] = useState({
    data: [],
    pagination: {
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const participantParams = useMemo(
    () => ({
      ...filters,
      search,
      page,
      pageSize: 10,
    }),
    [filters, page, search],
  );

  useEffect(() => {
    let ignoreResult = false;

    const loadFilterOptions = async () => {
      try {
        const result = await api.getParticipantFilters();

        if (!ignoreResult) {
          setFilterOptions(result);
        }
      } catch (requestError) {
        if (!ignoreResult) {
          setError(requestError.message);
        }
      }
    };

    loadFilterOptions();

    return () => {
      ignoreResult = true;
    };
  }, []);

  useEffect(() => {
    let ignoreResult = false;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [summary, funnel, relationships, byDimension, byDay, participantsResult] = await Promise.all([
          api.getSummary(filters),
          api.getFunnel(filters),
          api.getRelationships(filters),
          api.getByDimension(dimension, filters),
          api.getByDay(filters),
          api.getParticipants(participantParams),
        ]);

        if (!ignoreResult) {
          setDashboardData({
            summary,
            funnel,
            relationships,
            byDimension,
            byDay,
          });
          setParticipants(participantsResult);
        }
      } catch (requestError) {
        if (!ignoreResult) {
          setError(requestError.message);
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      ignoreResult = true;
    };
  }, [dimension, filters, participantParams]);

  const selectedDimensionLabel =
    dimensionOptions.find((option) => option.value === dimension)?.label || "";

  const handleFilterChange = (field, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
    setPage(1);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setSearch("");
    setPage(1);
  };

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Evento Congresso 2025</p>
          <h1>Dashboard partecipanti</h1>
        </div>
        <button className="secondary-button" type="button" onClick={resetFilters}>
          Azzera filtri
        </button>
      </header>

      <nav className="main-nav" aria-label="Sezioni dashboard">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeSection === item.id ? "nav-button nav-button-active" : "nav-button"}
            type="button"
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="toolbar" aria-label="Filtri dashboard">
        <label>
          Stakeholder
          <select
            value={filters.stakeholderType}
            onChange={(event) => handleFilterChange("stakeholderType", event.target.value)}
          >
            <option value="">Tutti gli stakeholder</option>
            {filterOptions.stakeholderTypes.map((stakeholder) => (
              <option key={stakeholder} value={stakeholder}>
                {stakeholder}
              </option>
            ))}
          </select>
        </label>

        <label>
          Regione
          <select
            value={filters.region}
            onChange={(event) => handleFilterChange("region", event.target.value)}
          >
            <option value="">Tutte le regioni</option>
            {filterOptions.regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>

        <label>
          Canale
          <select
            value={filters.engagementChannel}
            onChange={(event) => handleFilterChange("engagementChannel", event.target.value)}
          >
            <option value="">Tutti i canali</option>
            {filterOptions.engagementChannels.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <div className="error-box">{error}</div> : null}

      {activeSection === "dashboard" ? (
        <>
          <section className="kpi-grid" aria-label="Indicatori principali">
            <KpiCard
              label="Partecipanti"
              value={dashboardData.summary?.participants}
              detail="Record importati nel database"
            />
            <KpiCard
              label="DEM inviate"
              value={dashboardData.summary?.demSent}
              detail={formatPercentage(
                dashboardData.summary?.demSent,
                dashboardData.summary?.participants,
              )}
            />
            <KpiCard
              label="DEM aperte"
              value={dashboardData.summary?.demOpened}
              detail={formatPercentage(
                dashboardData.summary?.demOpened,
                dashboardData.summary?.demSent,
              )}
            />
            <KpiCard
              label="Visite stand"
              value={dashboardData.summary?.standVisits}
              detail={formatPercentage(
                dashboardData.summary?.standVisits,
                dashboardData.summary?.participants,
              )}
            />
            <KpiCard
              label="Accessi sala VIP"
              value={dashboardData.summary?.vipAccesses}
              detail={formatPercentage(
                dashboardData.summary?.vipAccesses,
                dashboardData.summary?.participants,
              )}
            />
            <KpiCard
              label="Presenze simposio"
              value={dashboardData.summary?.symposiumAttendances}
              detail={formatPercentage(
                dashboardData.summary?.symposiumAttendances,
                dashboardData.summary?.participants,
              )}
            />
          </section>

          {!isLoading && dashboardData.summary?.participants === 0 ? (
            <div className="empty-box">Nessun risultato per i filtri selezionati.</div>
          ) : null}

          <section className="dashboard-grid">
            <Panel title="Funnel evento" isLoading={isLoading}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.funnel} layout="vertical" margin={{ left: 96 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={140}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="value" fill="#28536b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Relazioni tra azioni" isLoading={isLoading}>
              <div className="relationship-list">
                {dashboardData.relationships.map((relationship) => (
                  <article className="relationship-item" key={relationship.label}>
                    <div>
                      <h3>{relationship.label}</h3>
                      <p>
                        {formatNumber(relationship.to)} su {formatNumber(relationship.from)}
                      </p>
                    </div>
                    <strong>{relationship.rate.toFixed(1).replace(".", ",")}%</strong>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Confronto per dimensione" isLoading={isLoading}>
              <div className="panel-control">
                <label>
                  Dimensione
                  <select value={dimension} onChange={(event) => setDimension(event.target.value)}>
                    {dimensionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={dashboardData.byDimension.map((item) => ({
                    ...item,
                    name: normalizeChartName(item.name),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="participants" name="Partecipanti" fill="#466060" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="standVisits" name="Visite stand" fill="#d17a22" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="symposiumAttendances"
                    name="Presenze simposio"
                    fill="#7c3f58"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="panel-note">Dimensione selezionata: {selectedDimensionLabel}</p>
            </Panel>

            <Panel title="Andamento giornaliero" isLoading={isLoading}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dashboardData.byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Line type="monotone" dataKey="standVisits" name="Visite stand" stroke="#28536b" />
                  <Line type="monotone" dataKey="vipAccesses" name="Accessi VIP" stroke="#d17a22" />
                  <Line
                    type="monotone"
                    dataKey="symposiumAttendances"
                    name="Presenze simposio"
                    stroke="#7c3f58"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </section>
        </>
      ) : null}

      {activeSection === "participants" ? (
        <ParticipantsPanel
          isLoading={isLoading}
          participants={participants}
          search={search}
          onSearchChange={handleSearchChange}
          onPageChange={setPage}
        />
      ) : null}

      <footer className="page-footer">
        Progetto realizzato da Blanna Fabio - 4 settembre 2026
      </footer>
    </main>
  );
}

function KpiCard({ label, value, detail }) {
  return (
    <article className="kpi-card">
      <p>{label}</p>
      <strong>{formatNumber(value)}</strong>
      <span>{detail}</span>
    </article>
  );
}

function ParticipantsPanel({ isLoading, participants, search, onSearchChange, onPageChange }) {
  const hasParticipants = participants.data.length > 0;

  return (
    <Panel title="Partecipanti" isLoading={isLoading} wide>
      <div className="table-toolbar">
        <label>
          Cerca
          <input
            type="search"
            value={search}
            onChange={onSearchChange}
            placeholder="Nome o email"
          />
        </label>
        <p>
          {formatNumber(participants.pagination.totalItems)} risultati, pagina{" "}
          {participants.pagination.page} di {participants.pagination.totalPages}
        </p>
      </div>

      {hasParticipants ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Partecipante</th>
                <th>Stakeholder</th>
                <th>Regione</th>
                <th>Canale</th>
              </tr>
            </thead>
            <tbody>
              {participants.data.map((participant) => (
                <tr key={participant.id}>
                  <td>
                    <strong>{participant.fullName || "Non indicato"}</strong>
                    <span>{participant.email || "Email non indicata"}</span>
                  </td>
                  <td>{participant.stakeholderType || "Non indicato"}</td>
                  <td>{participant.region || "Non indicata"}</td>
                  <td>{participant.engagementChannel || "Non indicato"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-box">Nessun partecipante trovato con i filtri selezionati.</div>
      )}

      <div className="pagination">
        <button
          className="secondary-button"
          type="button"
          onClick={() => onPageChange((currentPage) => Math.max(currentPage - 1, 1))}
          disabled={participants.pagination.page <= 1}
        >
          Precedente
        </button>
        <span className="page-indicator">
          Pagina {participants.pagination.page} di {participants.pagination.totalPages}
        </span>
        <button
          className="secondary-button"
          type="button"
          onClick={() =>
            onPageChange((currentPage) =>
              Math.min(currentPage + 1, participants.pagination.totalPages),
            )
          }
          disabled={participants.pagination.page >= participants.pagination.totalPages}
        >
          Successiva
        </button>
      </div>
    </Panel>
  );
}

function Panel({ title, children, isLoading, wide = false }) {
  return (
    <section className={wide ? "panel panel-wide" : "panel"}>
      <div className="panel-header">
        <h2>{title}</h2>
        {isLoading ? <span>Caricamento dati</span> : null}
      </div>
      {children}
    </section>
  );
}

export default App;
