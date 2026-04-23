import { useEffect, useMemo, useState } from "react";

const API_URL = "https://6rdmrfher0.execute-api.us-east-1.amazonaws.com/kpis";

export default function App() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    criticos: 0,
    riesgo: 0,
    saludables: 0,
    no_calculables: 0,
  });
  const [auditoria, setAuditoria] = useState({});
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL, {
          headers: {
            Accept: "application/json",
          },
        });

        const json = await response.json();
        const parsed = normalizeApiResponse(json);

        if (!mounted) return;

        setRows(parsed.data);
        setSummary(parsed.summary);
        setAuditoria(parsed.auditoria);
      } catch (err) {
        console.error("ERROR API:", err);
        if (!mounted) return;
        setError("No se pudo cargar la información del dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((row) => {
      const text = [
        row.project_id,
        row.project_name,
        row.estado,
        row.motivo,
        row.spi,
        row.cpi,
      ]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [rows, search]);

  const criticosRows = useMemo(
    () => filteredRows.filter((r) => r.estado === "CRITICO"),
    [filteredRows]
  );

  const riesgoRows = useMemo(
    () => filteredRows.filter((r) => r.estado === "RIESGO"),
    [filteredRows]
  );

  const saludablesRows = useMemo(
    () => filteredRows.filter((r) => r.estado === "SALUDABLE"),
    [filteredRows]
  );

  const noCalculablesRows = useMemo(
    () => filteredRows.filter((r) => r.estado === "NO_CALCULABLE"),
    [filteredRows]
  );

  const auditoriaRows = useMemo(() => {
    const normalized = buildAuditoriaRows(auditoria, rows);
    return normalized;
  }, [auditoria, rows]);

  const financieroRows = useMemo(() => {
    return rows
      .filter(
        (r) =>
          isFiniteNumber(r.valor_planeado) ||
          isFiniteNumber(r.valor_ganado) ||
          isFiniteNumber(r.costo_actual)
      )
      .slice(0, 18);
  }, [rows]);

  const estadoCounts = useMemo(() => {
    return [
      { label: "Críticos", value: summary.criticos || 0, color: "#ef4444" },
      { label: "En riesgo", value: summary.riesgo || 0, color: "#f59e0b" },
      { label: "Saludables", value: summary.saludables || 0, color: "#10b981" },
      {
        label: "No calculables",
        value: summary.no_calculables || 0,
        color: "#94a3b8",
      },
    ];
  }, [summary]);

  const topAlertas = useMemo(() => {
    return rows
      .filter((r) => r.estado === "CRITICO" || r.estado === "RIESGO")
      .slice(0, 8);
  }, [rows]);

  return (
    <div style={styles.app}>
      <style>{globalStyles}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>Entregable 6 · Dashboard Ejecutivo / VMO</div>
            <h1 style={styles.title}>Dashboard Ejecutivo KPIs Primavera</h1>
            <p style={styles.subtitle}>
              Vista ejecutiva, detalle operativo, auditoría, financiero y
              trazabilidad en una sola aplicación.
            </p>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.endpointBox}>
              <span style={styles.endpointLabel}>API</span>
              <span style={styles.endpointValue}>{API_URL}</span>
            </div>
          </div>
        </header>

        <nav style={styles.nav}>
          <TabButton
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
            label="Dashboard"
          />
          <TabButton
            active={activeTab === "detalle"}
            onClick={() => setActiveTab("detalle")}
            label="Detalle"
          />
          <TabButton
            active={activeTab === "criticos"}
            onClick={() => setActiveTab("criticos")}
            label="Críticos"
          />
          <TabButton
            active={activeTab === "riesgo"}
            onClick={() => setActiveTab("riesgo")}
            label="En riesgo"
          />
          <TabButton
            active={activeTab === "saludables"}
            onClick={() => setActiveTab("saludables")}
            label="Saludables"
          />
          <TabButton
            active={activeTab === "nocalculables"}
            onClick={() => setActiveTab("nocalculables")}
            label="No calculables"
          />
          <TabButton
            active={activeTab === "auditoria"}
            onClick={() => setActiveTab("auditoria")}
            label="Auditoría"
          />
          <TabButton
            active={activeTab === "financiero"}
            onClick={() => setActiveTab("financiero")}
            label="Financiero"
          />
          <TabButton
            active={activeTab === "trazabilidad"}
            onClick={() => setActiveTab("trazabilidad")}
            label="Trazabilidad"
          />
        </nav>

        {loading ? (
          <section style={styles.panel}>
            <div style={styles.loadingBox}>Cargando información...</div>
          </section>
        ) : error ? (
          <section style={styles.panel}>
            <div style={styles.errorBox}>{error}</div>
          </section>
        ) : (
          <>
            <section style={styles.cardsGrid}>
              <MetricCard
                title="Total"
                value={summary.total}
                color="#2563eb"
                subtitle="Portafolio total"
              />
              <MetricCard
                title="Críticos"
                value={summary.criticos}
                color="#dc2626"
                subtitle="Acción inmediata"
              />
              <MetricCard
                title="En riesgo"
                value={summary.riesgo}
                color="#d97706"
                subtitle="Seguimiento preventivo"
              />
              <MetricCard
                title="Saludables"
                value={summary.saludables}
                color="#059669"
                subtitle="Con comportamiento estable"
              />
              <MetricCard
                title="No calculables"
                value={summary.no_calculables}
                color="#64748b"
                subtitle="Con faltantes de datos"
              />
            </section>

            <section style={styles.toolbar}>
              <div style={styles.searchBox}>
                <span style={styles.searchIcon}>🔎</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por ID, proyecto, estado o motivo..."
                  style={styles.searchInput}
                />
              </div>

              <div style={styles.toolbarInfo}>
                Registros visibles: <strong>{filteredRows.length}</strong>
              </div>
            </section>

            {activeTab === "dashboard" && (
              <DashboardView
                estadoCounts={estadoCounts}
                topAlertas={topAlertas}
                financieroRows={financieroRows}
                auditoriaRows={auditoriaRows}
              />
            )}

            {activeTab === "detalle" && (
              <section style={styles.panel}>
                <PanelTitle
                  title="Detalle de proyectos"
                  description="Vista completa del portafolio con búsqueda aplicada."
                />
                <DataTable rows={filteredRows} />
              </section>
            )}

            {activeTab === "criticos" && (
              <section style={styles.panel}>
                <PanelTitle
                  title="Proyectos críticos"
                  description="Portafolio que requiere atención inmediata."
                />
                <DataTable rows={criticosRows} />
              </section>
            )}

            {activeTab === "riesgo" && (
              <section style={styles.panel}>
                <PanelTitle
                  title="Proyectos en riesgo"
                  description="Portafolio con desviaciones o señales preventivas."
                />
                <DataTable rows={riesgoRows} />
              </section>
            )}

            {activeTab === "saludables" && (
              <section style={styles.panel}>
                <PanelTitle
                  title="Proyectos saludables"
                  description="Portafolio con desempeño estable."
                />
                <DataTable rows={saludablesRows} />
              </section>
            )}

            {activeTab === "nocalculables" && (
              <section style={styles.panel}>
                <PanelTitle
                  title="Proyectos no calculables"
                  description="Portafolio con faltantes de fuente o imposibilidad de cálculo."
                />
                <DataTable rows={noCalculablesRows} />
              </section>
            )}

            {activeTab === "auditoria" && (
              <section style={styles.panel}>
                <PanelTitle
                  title="Auditoría de datos"
                  description="Errores, fuentes y trazabilidad de faltantes para soporte de negocio y CTO."
                />

                <div style={styles.twoColumns}>
                  <CardShell title="Errores por fuente">
                    <SimpleBarChart data={auditoriaRows} />
                  </CardShell>

                  <CardShell title="Detalle de auditoría">
                    <AuditTable rows={auditoriaRows} />
                  </CardShell>
                </div>
              </section>
            )}

            {activeTab === "financiero" && (
              <section style={styles.panel}>
                <PanelTitle
                  title="Análisis financiero EV / PV / AC"
                  description="Curva simplificada con valor planeado, valor ganado y costo actual."
                />

                <div style={styles.financialLegend}>
                  <LegendPill color="#3b82f6" label="Valor planeado" />
                  <LegendPill color="#22c55e" label="Valor ganado" />
                  <LegendPill color="#f59e0b" label="Costo actual" />
                </div>

                <CardShell title="Curva financiera">
                  <SimpleLineChart rows={financieroRows} />
                </CardShell>

                <div style={{ marginTop: 20 }}>
                  <CardShell title="Detalle financiero">
                    <FinancialTable rows={financieroRows} />
                  </CardShell>
                </div>
              </section>
            )}

            {activeTab === "trazabilidad" && (
              <section style={styles.panel}>
                <PanelTitle
                  title="Trazabilidad y gobierno de datos"
                  description="Vista ejecutiva del flujo Bronze → Silver → Gold y su relación con KPIs."
                />

                <div style={styles.traceGrid}>
                  <TraceCard
                    title="Bronze"
                    subtitle="Ingesta cruda"
                    items={[
                      "Fuentes operativas originales",
                      "Persistencia inicial",
                      "Recepción de datos de origen",
                    ]}
                    color="#1d4ed8"
                  />
                  <TraceCard
                    title="Silver"
                    subtitle="Limpieza y estandarización"
                    items={[
                      "Transformación técnica",
                      "Normalización de campos",
                      "Validaciones de calidad",
                    ]}
                    color="#7c3aed"
                  />
                  <TraceCard
                    title="Gold"
                    subtitle="Consumo analítico"
                    items={[
                      "Cálculo de KPIs",
                      "Exposición ejecutiva",
                      "Tableros y decisiones",
                    ]}
                    color="#059669"
                  />
                </div>

                <div style={{ marginTop: 20 }}>
                  <CardShell title="Indicadores de trazabilidad">
                    <div style={styles.traceStats}>
                      <TraceStat
                        label="Proyectos totales"
                        value={summary.total || 0}
                      />
                      <TraceStat
                        label="Con cálculo disponible"
                        value={(summary.total || 0) - (summary.no_calculables || 0)}
                      />
                      <TraceStat
                        label="No calculables"
                        value={summary.no_calculables || 0}
                      />
                      <TraceStat
                        label="Fuentes auditadas"
                        value={auditoriaRows.length}
                      />
                    </div>
                  </CardShell>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DashboardView({
  estadoCounts,
  topAlertas,
  financieroRows,
  auditoriaRows,
}) {
  return (
    <section style={styles.dashboardGrid}>
      <div style={styles.panel}>
        <PanelTitle
          title="Distribución del portafolio"
          description="Comportamiento general por estado."
        />
        <SimpleDonutLikeChart data={estadoCounts} />
      </div>

      <div style={styles.panel}>
        <PanelTitle
          title="Alertas prioritarias"
          description="Resumen ejecutivo de proyectos críticos y en riesgo."
        />
        <AlertList rows={topAlertas} />
      </div>

      <div style={styles.panelWide}>
        <PanelTitle
          title="Vista financiera ejecutiva"
          description="Comparación rápida de VP, VG y CA."
        />
        <div style={styles.financialLegend}>
          <LegendPill color="#3b82f6" label="Valor planeado" />
          <LegendPill color="#22c55e" label="Valor ganado" />
          <LegendPill color="#f59e0b" label="Costo actual" />
        </div>
        <SimpleLineChart rows={financieroRows.slice(0, 12)} />
      </div>

      <div style={styles.panelWide}>
        <PanelTitle
          title="Resumen de auditoría"
          description="Distribución de errores por fuente."
        />
        <SimpleBarChart data={auditoriaRows} />
      </div>
    </section>
  );
}

function MetricCard({ title, value, color, subtitle }) {
  return (
    <div
      style={{
        ...styles.metricCard,
        background: `linear-gradient(180deg, ${color}, ${shadeColor(color, -20)})`,
      }}
    >
      <div style={styles.metricTitle}>{title}</div>
      <div style={styles.metricValue}>{formatNumber(value)}</div>
      <div style={styles.metricSubtitle}>{subtitle}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.tabButton,
        ...(active ? styles.tabButtonActive : {}),
      }}
    >
      {label}
    </button>
  );
}

function PanelTitle({ title, description }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={styles.panelTitle}>{title}</h2>
      <p style={styles.panelDescription}>{description}</p>
    </div>
  );
}

function CardShell({ title, children }) {
  return (
    <div style={styles.cardShell}>
      <div style={styles.cardShellTitle}>{title}</div>
      {children}
    </div>
  );
}

function DataTable({ rows }) {
  if (!rows.length) {
    return <EmptyState text="No hay registros para mostrar." />;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Proyecto</th>
            <th style={styles.th}>SPI</th>
            <th style={styles.th}>CPI</th>
            <th style={styles.th}>VP</th>
            <th style={styles.th}>VG</th>
            <th style={styles.th}>CA</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.project_id}-${index}`} style={styles.tr}>
              <td style={styles.tdMono}>{safeValue(row.project_id)}</td>
              <td style={styles.tdProject}>{safeValue(row.project_name)}</td>
              <td style={styles.tdNumber}>{formatDecimal(row.spi)}</td>
              <td style={styles.tdNumber}>{formatDecimal(row.cpi)}</td>
              <td style={styles.tdNumber}>{formatCompactNumber(row.valor_planeado)}</td>
              <td style={styles.tdNumber}>{formatCompactNumber(row.valor_ganado)}</td>
              <td style={styles.tdNumber}>{formatCompactNumber(row.costo_actual)}</td>
              <td style={styles.td}>
                <StatusBadge status={row.estado} />
              </td>
              <td style={styles.tdMotivo}>{safeValue(row.motivo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinancialTable({ rows }) {
  if (!rows.length) {
    return <EmptyState text="No hay registros financieros para mostrar." />;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Proyecto</th>
            <th style={styles.th}>Valor planeado</th>
            <th style={styles.th}>Valor ganado</th>
            <th style={styles.th}>Costo actual</th>
            <th style={styles.th}>SPI</th>
            <th style={styles.th}>CPI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.project_id}-${index}`} style={styles.tr}>
              <td style={styles.tdMono}>{safeValue(row.project_id)}</td>
              <td style={styles.tdProject}>{safeValue(row.project_name)}</td>
              <td style={styles.tdNumber}>{formatCompactNumber(row.valor_planeado)}</td>
              <td style={styles.tdNumber}>{formatCompactNumber(row.valor_ganado)}</td>
              <td style={styles.tdNumber}>{formatCompactNumber(row.costo_actual)}</td>
              <td style={styles.tdNumber}>{formatDecimal(row.spi)}</td>
              <td style={styles.tdNumber}>{formatDecimal(row.cpi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ rows }) {
  if (!rows.length) {
    return <EmptyState text="No hay datos de auditoría para mostrar." />;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Fuente</th>
            <th style={styles.th}>Errores</th>
            <th style={styles.th}>Campos / motivo dominante</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.fuente}-${index}`} style={styles.tr}>
              <td style={styles.tdProject}>{safeValue(row.fuente)}</td>
              <td style={styles.tdNumber}>{formatNumber(row.errores)}</td>
              <td style={styles.td}>{safeValue(row.campos || row.motivo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    CRITICO: { bg: "#7f1d1d", border: "#ef4444", text: "#fecaca" },
    RIESGO: { bg: "#78350f", border: "#f59e0b", text: "#fde68a" },
    SALUDABLE: { bg: "#064e3b", border: "#10b981", text: "#a7f3d0" },
    NO_CALCULABLE: { bg: "#334155", border: "#94a3b8", text: "#e2e8f0" },
  };

  const style = map[status] || map.NO_CALCULABLE;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: 999,
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      {status || "-"}
    </span>
  );
}

function EmptyState({ text }) {
  return <div style={styles.emptyState}>{text}</div>;
}

function AlertList({ rows }) {
  if (!rows.length) {
    return <EmptyState text="No hay alertas prioritarias." />;
  }

  return (
    <div style={styles.alertList}>
      {rows.map((row, index) => (
        <div key={`${row.project_id}-${index}`} style={styles.alertItem}>
          <div style={styles.alertHeader}>
            <span style={styles.alertProject}>
              {safeValue(row.project_id)} · {safeValue(row.project_name)}
            </span>
            <StatusBadge status={row.estado} />
          </div>
          <div style={styles.alertBody}>
            SPI: <strong>{formatDecimal(row.spi)}</strong> · CPI:{" "}
            <strong>{formatDecimal(row.cpi)}</strong>
          </div>
          <div style={styles.alertMotivo}>
            Motivo: {safeValue(row.motivo || "Sin detalle de motivo")}
          </div>
        </div>
      ))}
    </div>
  );
}

function SimpleBarChart({ data }) {
  const maxValue = Math.max(...data.map((d) => Number(d.errores || 0)), 1);

  return (
    <div style={styles.barChart}>
      {data.map((item, index) => {
        const value = Number(item.errores || 0);
        const height = Math.max((value / maxValue) * 180, 8);

        return (
          <div key={`${item.fuente}-${index}`} style={styles.barItem}>
            <div style={styles.barValue}>{formatNumber(value)}</div>
            <div
              style={{
                ...styles.bar,
                height,
                background: chartColorByIndex(index),
              }}
            />
            <div style={styles.barLabel}>{item.fuente}</div>
          </div>
        );
      })}
    </div>
  );
}

function SimpleLineChart({ rows }) {
  if (!rows.length) {
    return <EmptyState text="No hay datos suficientes para la curva financiera." />;
  }

  const prepared = rows.map((row, idx) => ({
    label: String(row.project_id || `P${idx + 1}`),
    vp: Number(row.valor_planeado || 0),
    vg: Number(row.valor_ganado || 0),
    ca: Number(row.costo_actual || 0),
  }));

  const values = prepared.flatMap((r) => [r.vp, r.vg, r.ca]);
  const max = Math.max(...values, 1);

  const width = 1000;
  const height = 320;
  const padding = 40;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const toPoint = (index, value) => {
    const x =
      padding +
      (prepared.length === 1 ? innerWidth / 2 : (index / (prepared.length - 1)) * innerWidth);
    const y = padding + innerHeight - (Number(value || 0) / max) * innerHeight;
    return { x, y };
  };

  const buildPath = (key) =>
    prepared
      .map((row, index) => {
        const point = toPoint(index, row[key]);
        return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
      })
      .join(" ");

  return (
    <div style={styles.lineChartWrapper}>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.lineChartSvg}>
        <rect x="0" y="0" width={width} height={height} fill="#071224" rx="18" />

        {[0, 0.25, 0.5, 0.75, 1].map((tick, idx) => {
          const y = padding + innerHeight - innerHeight * tick;
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={10}
                y={y + 4}
                fill="#94a3b8"
                fontSize="12"
                fontFamily="Arial"
              >
                {formatCompactNumber(max * tick)}
              </text>
            </g>
          );
        })}

        <path d={buildPath("vp")} fill="none" stroke="#3b82f6" strokeWidth="3" />
        <path d={buildPath("vg")} fill="none" stroke="#22c55e" strokeWidth="3" />
        <path d={buildPath("ca")} fill="none" stroke="#f59e0b" strokeWidth="3" />

        {prepared.map((row, index) => {
          const vpPoint = toPoint(index, row.vp);
          const vgPoint = toPoint(index, row.vg);
          const caPoint = toPoint(index, row.ca);

          return (
            <g key={row.label}>
              <circle cx={vpPoint.x} cy={vpPoint.y} r="4" fill="#3b82f6" />
              <circle cx={vgPoint.x} cy={vgPoint.y} r="4" fill="#22c55e" />
              <circle cx={caPoint.x} cy={caPoint.y} r="4" fill="#f59e0b" />
              <text
                x={vpPoint.x}
                y={height - 12}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="11"
                fontFamily="Arial"
              >
                {truncateText(row.label, 8)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SimpleDonutLikeChart({ data }) {
  const total = data.reduce((acc, item) => acc + Number(item.value || 0), 0) || 1;

  let current = 0;
  const segments = data.map((item) => {
    const value = Number(item.value || 0);
    const start = current / total;
    current += value;
    const end = current / total;
    return {
      ...item,
      start,
      end,
    };
  });

  return (
    <div style={styles.donutLayout}>
      <div style={styles.donutWrapper}>
        <svg viewBox="0 0 240 240" width="240" height="240">
          <circle cx="120" cy="120" r="70" fill="none" stroke="#0f172a" strokeWidth="34" />
          {segments.map((segment, index) => (
            <circle
              key={index}
              cx="120"
              cy="120"
              r="70"
              fill="none"
              stroke={segment.color}
              strokeWidth="34"
              strokeDasharray={`${2 * Math.PI * 70 * (segment.end - segment.start)} ${
                2 * Math.PI * 70
              }`}
              strokeDashoffset={`${-2 * Math.PI * 70 * segment.start}`}
              transform="rotate(-90 120 120)"
              strokeLinecap="butt"
            />
          ))}
          <circle cx="120" cy="120" r="48" fill="#071224" />
          <text
            x="120"
            y="110"
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="16"
            fontFamily="Arial"
          >
            Total
          </text>
          <text
            x="120"
            y="135"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="28"
            fontWeight="700"
            fontFamily="Arial"
          >
            {formatNumber(total)}
          </text>
        </svg>
      </div>

      <div style={styles.donutLegend}>
        {data.map((item, index) => (
          <div key={index} style={styles.donutLegendItem}>
            <span
              style={{
                ...styles.legendDot,
                background: item.color,
              }}
            />
            <span style={styles.donutLegendText}>{item.label}</span>
            <span style={styles.donutLegendValue}>{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceCard({ title, subtitle, items, color }) {
  return (
    <div style={{ ...styles.traceCard, borderTop: `4px solid ${color}` }}>
      <div style={styles.traceTitle}>{title}</div>
      <div style={styles.traceSubtitle}>{subtitle}</div>
      <ul style={styles.traceList}>
        {items.map((item, index) => (
          <li key={index} style={styles.traceListItem}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TraceStat({ label, value }) {
  return (
    <div style={styles.traceStat}>
      <div style={styles.traceStatLabel}>{label}</div>
      <div style={styles.traceStatValue}>{formatNumber(value)}</div>
    </div>
  );
}

function LegendPill({ color, label }) {
  return (
    <div style={styles.legendPill}>
      <span style={{ ...styles.legendDot, background: color }} />
      {label}
    </div>
  );
}

function normalizeApiResponse(payload) {
  let parsed = payload;

  if (parsed && typeof parsed === "object" && typeof parsed.body === "string") {
    try {
      parsed = JSON.parse(parsed.body);
    } catch {
      parsed = payload;
    }
  }

  const summary = parsed?.summary || parsed?.resumen || {};
  const data = Array.isArray(parsed?.data) ? parsed.data : [];
  const auditoria = parsed?.auditoria || parsed?.audit || {};

  return {
    summary: {
      total: Number(summary.total || data.length || 0),
      criticos: Number(summary.criticos || countByEstado(data, "CRITICO")),
      riesgo: Number(summary.riesgo || countByEstado(data, "RIESGO")),
      saludables: Number(summary.saludables || countByEstado(data, "SALUDABLE")),
      no_calculables: Number(
        summary.no_calculables || countByEstado(data, "NO_CALCULABLE")
      ),
    },
    data,
    auditoria,
  };
}

function countByEstado(rows, estado) {
  return rows.filter((r) => r.estado === estado).length;
}

function buildAuditoriaRows(auditoria, rows) {
  if (Array.isArray(auditoria) && auditoria.length) {
    return auditoria.map((item) => ({
      fuente: item.fuente || item.source || "N/D",
      errores: Number(item.errores || item.errors || 0),
      campos: item.campos || item.fields || item.motivo || "N/D",
    }));
  }

  if (auditoria && typeof auditoria === "object" && Object.keys(auditoria).length) {
    return Object.entries(auditoria).map(([fuente, value]) => ({
      fuente,
      errores: Number(value?.errores || value?.errors || 0),
      campos: value?.campos || value?.fields || value?.motivo || "N/D",
    }));
  }

  const counts = {};
  rows.forEach((row) => {
    const motivo = String(row.motivo || "").toUpperCase();
    let fuente = "Sin clasificar";

    if (motivo.includes("OEBS")) fuente = "OEBS";
    else if (motivo.includes("PRIMAVERA")) fuente = "Primavera";
    else if (motivo.includes("GOLD")) fuente = "Gold";
    else if (motivo.includes("SPI/CPI")) fuente = "Gold";
    else if (motivo.includes("COSTO")) fuente = "OEBS";

    counts[fuente] = (counts[fuente] || 0) + 1;
  });

  return Object.entries(counts).map(([fuente, errores]) => ({
    fuente,
    errores,
    campos: "Derivado del motivo reportado",
  }));
}

function formatNumber(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("es-MX").format(num);
}

function formatCompactNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";

  return new Intl.NumberFormat("es-MX", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDecimal(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("es-MX", {
    maximumFractionDigits: 4,
  });
}

function safeValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function chartColorByIndex(index) {
  const palette = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];
  return palette[index % palette.length];
}

function shadeColor(hex, percent) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(
    0x1000000 +
    r * 0x10000 +
    g * 0x100 +
    b
  )
    .toString(16)
    .slice(1)}`;
}

const styles = {
  app: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #0f1b38 0%, #050b18 45%, #020617 100%)",
    color: "#e2e8f0",
    fontFamily:
      'Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    padding: 24,
  },
  container: {
    maxWidth: 1600,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  kicker: {
    color: "#60a5fa",
    fontWeight: 700,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 40,
    lineHeight: 1.1,
    color: "#ffffff",
    fontWeight: 800,
  },
  subtitle: {
    marginTop: 10,
    color: "#94a3b8",
    fontSize: 16,
    maxWidth: 860,
  },
  headerActions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  endpointBox: {
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: "12px 14px",
    minWidth: 320,
    maxWidth: 520,
  },
  endpointLabel: {
    display: "block",
    color: "#60a5fa",
    fontWeight: 700,
    fontSize: 12,
    marginBottom: 6,
  },
  endpointValue: {
    display: "block",
    color: "#cbd5e1",
    fontSize: 13,
    wordBreak: "break-all",
  },
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  tabButton: {
    background: "#0f172a",
    color: "#cbd5e1",
    border: "1px solid #1e293b",
    padding: "11px 16px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    transition: "all .2s ease",
  },
  tabButtonActive: {
    background: "linear-gradient(180deg, #1d4ed8, #1e40af)",
    color: "#ffffff",
    border: "1px solid #60a5fa",
    boxShadow: "0 0 0 1px rgba(96,165,250,.25)",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 16,
    marginBottom: 18,
  },
  metricCard: {
    borderRadius: 20,
    padding: 22,
    color: "#fff",
    boxShadow: "0 20px 40px rgba(2,6,23,.35)",
    border: "1px solid rgba(255,255,255,.08)",
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: 700,
    opacity: 0.95,
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: 10,
  },
  metricSubtitle: {
    fontSize: 13,
    opacity: 0.9,
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: "0 14px",
    minHeight: 48,
    flex: 1,
    minWidth: 280,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#fff",
    width: "100%",
    fontSize: 14,
  },
  toolbarInfo: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    color: "#cbd5e1",
    borderRadius: 14,
    padding: "13px 16px",
    fontSize: 14,
  },
  panel: {
    background: "rgba(7, 18, 36, 0.92)",
    border: "1px solid #1e293b",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 14px 30px rgba(2,6,23,.28)",
  },
  panelWide: {
    background: "rgba(7, 18, 36, 0.92)",
    border: "1px solid #1e293b",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 14px 30px rgba(2,6,23,.28)",
    gridColumn: "span 2",
  },
  panelTitle: {
    margin: 0,
    fontSize: 24,
    color: "#ffffff",
    fontWeight: 800,
  },
  panelDescription: {
    margin: "8px 0 0 0",
    color: "#94a3b8",
    fontSize: 14,
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
  },
  cardShell: {
    background: "#071224",
    border: "1px solid #1e293b",
    borderRadius: 18,
    padding: 16,
  },
  cardShellTitle: {
    color: "#ffffff",
    fontWeight: 700,
    marginBottom: 14,
    fontSize: 16,
  },
  tableWrapper: {
    overflowX: "auto",
    border: "1px solid #1e293b",
    borderRadius: 18,
    background: "#071224",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1100,
  },
  th: {
    position: "sticky",
    top: 0,
    background: "#0f1b33",
    color: "#38bdf8",
    textAlign: "left",
    padding: "14px 12px",
    fontSize: 13,
    borderBottom: "1px solid #1e293b",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #17233a",
  },
  td: {
    padding: "12px",
    color: "#e2e8f0",
    fontSize: 14,
    verticalAlign: "top",
  },
  tdProject: {
    padding: "12px",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    minWidth: 260,
    verticalAlign: "top",
  },
  tdMotivo: {
    padding: "12px",
    color: "#cbd5e1",
    fontSize: 14,
    minWidth: 180,
    verticalAlign: "top",
  },
  tdNumber: {
    padding: "12px",
    color: "#e2e8f0",
    fontSize: 14,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  tdMono: {
    padding: "12px",
    color: "#93c5fd",
    fontSize: 14,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  emptyState: {
    padding: 24,
    borderRadius: 16,
    background: "#071224",
    border: "1px dashed #334155",
    color: "#94a3b8",
    textAlign: "center",
  },
  loadingBox: {
    padding: 30,
    color: "#cbd5e1",
    textAlign: "center",
    fontSize: 18,
  },
  errorBox: {
    padding: 22,
    color: "#fecaca",
    background: "#450a0a",
    border: "1px solid #991b1b",
    borderRadius: 16,
    fontWeight: 700,
  },
  alertList: {
    display: "grid",
    gap: 12,
  },
  alertItem: {
    padding: 16,
    borderRadius: 16,
    background: "#071224",
    border: "1px solid #1e293b",
  },
  alertHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  alertProject: {
    fontWeight: 700,
    color: "#fff",
  },
  alertBody: {
    marginTop: 10,
    color: "#cbd5e1",
    fontSize: 14,
  },
  alertMotivo: {
    marginTop: 8,
    color: "#94a3b8",
    fontSize: 13,
  },
  barChart: {
    height: 260,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 18,
    padding: "14px 6px 8px",
  },
  barItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  barValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
  },
  bar: {
    width: "70%",
    minWidth: 40,
    borderRadius: "14px 14px 6px 6px",
    boxShadow: "0 8px 20px rgba(0,0,0,.2)",
  },
  barLabel: {
    color: "#cbd5e1",
    fontSize: 13,
    textAlign: "center",
  },
  lineChartWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  lineChartSvg: {
    width: "100%",
    minWidth: 900,
    display: "block",
    borderRadius: 18,
  },
  donutLayout: {
    display: "flex",
    alignItems: "center",
    gap: 22,
    flexWrap: "wrap",
  },
  donutWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 250,
  },
  donutLegend: {
    display: "grid",
    gap: 12,
    flex: 1,
    minWidth: 240,
  },
  donutLegendItem: {
    display: "grid",
    gridTemplateColumns: "16px 1fr auto",
    gap: 10,
    alignItems: "center",
    background: "#071224",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: "10px 12px",
  },
  donutLegendText: {
    color: "#e2e8f0",
    fontWeight: 600,
  },
  donutLegendValue: {
    color: "#ffffff",
    fontWeight: 800,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    display: "inline-block",
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
  },
  financialLegend: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  legendPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#0f172a",
    border: "1px solid #1e293b",
    color: "#e2e8f0",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  },
  traceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 18,
  },
  traceCard: {
    background: "#071224",
    border: "1px solid #1e293b",
    borderRadius: 18,
    padding: 18,
  },
  traceTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: 800,
  },
  traceSubtitle: {
    color: "#94a3b8",
    marginTop: 6,
    marginBottom: 14,
    fontSize: 14,
  },
  traceList: {
    margin: 0,
    paddingLeft: 18,
  },
  traceListItem: {
    color: "#cbd5e1",
    marginBottom: 10,
    lineHeight: 1.4,
  },
  traceStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  traceStat: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 18,
  },
  traceStatLabel: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 8,
  },
  traceStatValue: {
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 28,
  },
};

const globalStyles = `
  * { box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; min-height: 100%; }
  body { background: #020617; }
  input::placeholder { color: #64748b; }

  @media (max-width: 1200px) {
    .__dummy {}
  }

  @media (max-width: 1100px) {
    /* dashboard */
  }

  @media (max-width: 980px) {
    body {}
  }
`;