import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { AlertTriangle, CheckCircle2, Activity, Database, RefreshCcw } from "lucide-react";

const API_URL = "https://6rdmfrher0.execute-api.us-east-1.amazonaws.com/kpis";

function normalizeApiResponse(payload) {
  let body = payload;

  if (payload && typeof payload === "object" && "body" in payload) {
    body = payload.body;
  }

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      throw new Error("La API respondió HTML o texto plano. Este frontend necesita una respuesta JSON.");
    }
  }

  if (!body || typeof body !== "object") {
    throw new Error("La respuesta de la API no tiene un formato JSON válido.");
  }

  const resumen = body.resumen_ejecutivo || body.resumen || {
    total_proyectos: body.total || 0,
    criticos: 0,
    saludables: 0,
    no_calculables: 0,
    en_riesgo: 0,
  };

  const proyectos = body.proyectos || {};

  const criticos = proyectos.criticos || body.criticos || [];
  const saludables = proyectos.saludables || body.saludables || [];
  const noCalculables = proyectos.no_calculables || body.no_calculables || [];
  const riesgo = proyectos.riesgo || body.riesgo || [];

  const mergedRows = [
    ...criticos.map((x) => ({ ...x, estado: x.estado || "CRITICO" })),
    ...riesgo.map((x) => ({ ...x, estado: x.estado || "RIESGO" })),
    ...saludables.map((x) => ({ ...x, estado: x.estado || "SALUDABLE" })),
    ...noCalculables.map((x) => ({ ...x, estado: x.estado || "NO_CALCULABLE" })),
  ];

  const auditoria = body.auditoria || body.audit || [];

  const chartSeries = body.curva_s || body.series || null;

  return {
    resumen: {
      total_proyectos: Number(resumen.total_proyectos ?? resumen.total ?? mergedRows.length ?? 0),
      criticos: Number(resumen.criticos ?? criticos.length ?? 0),
      en_riesgo: Number(resumen.en_riesgo ?? resumen.riesgo ?? riesgo.length ?? 0),
      saludables: Number(resumen.saludables ?? saludables.length ?? 0),
      no_calculables: Number(resumen.no_calculables ?? noCalculables.length ?? 0),
    },
    criticos,
    riesgo,
    saludables,
    noCalculables,
    rows: mergedRows,
    auditoria,
    chartSeries,
  };
}

function buildFallbackSeries(rows) {
  return rows
    .filter((r) => r && (r.vp != null || r.ev != null || r.ac != null))
    .slice(0, 12)
    .map((r, idx) => ({
      name: r.project_name || r.name || r.id || `P${idx + 1}`,
      valor_planeado: Number(r.vp ?? r.valor_planeado ?? 0),
      valor_ganado: Number(r.ev ?? r.valor_ganado ?? 0),
      costo_actual: Number(r.ac ?? r.costo_actual ?? 0),
    }));
}

function StatusBadge({ estado }) {
  const map = {
    CRITICO: "destructive",
    RIESGO: "secondary",
    SALUDABLE: "default",
    NO_CALCULABLE: "outline",
  };
  return <Badge variant={map[estado] || "outline"}>{estado}</Badge>;
}

function SummaryCard({ title, value, icon: Icon, subtitle }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-700" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectTable({ rows, title }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Proyecto</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">SPI</th>
                <th className="px-3 py-2">CPI</th>
                <th className="px-3 py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r, i) => (
                  <tr key={`${r.id || r.project_id || "row"}-${i}`} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-slate-700">{r.id || r.project_id || "-"}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{r.name || r.project_name || "-"}</td>
                    <td className="px-3 py-2"><StatusBadge estado={r.estado} /></td>
                    <td className="px-3 py-2 text-slate-700">{r.spi ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{r.cpi ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{r.motivo || r.detalle_error || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={6}>
                    Sin registros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FrontendReactKpisAcp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL, {
        headers: { Accept: "application/json" },
      });

      const text = await res.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(
          "La API actual está respondiendo HTML. Para este frontend, la Lambda debe exponer JSON en este endpoint o en un endpoint alterno."
        );
      }

      const normalized = normalizeApiResponse(payload);
      setData(normalized);
    } catch (e) {
      setError(e.message || "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];

    if (Array.isArray(data.chartSeries?.planeado) && Array.isArray(data.chartSeries?.ganado)) {
      return data.chartSeries.planeado.map((p, idx) => ({
        name: `P${idx + 1}`,
        valor_planeado: Number(p || 0),
        valor_ganado: Number(data.chartSeries.ganado[idx] || 0),
        costo_actual: Number(data.chartSeries.costo_actual?.[idx] || 0),
      }));
    }

    return buildFallbackSeries(data.rows);
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter((r) => {
      const hayTexto = `${r.id || ""} ${r.name || r.project_name || ""} ${r.motivo || ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const hayEstado = estadoFilter === "TODOS" || r.estado === estadoFilter;
      return hayTexto && hayEstado;
    });
  }, [data, query, estadoFilter]);

  const auditData = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.auditoria) && data.auditoria.length) return data.auditoria;

    const primavera = data.noCalculables.filter((x) => (x.motivo || "").includes("Primavera")).length;
    const oebs = data.noCalculables.filter((x) => (x.motivo || "").includes("OEBS")).length;
    const gold = data.noCalculables.filter((x) => (x.motivo || "").includes("Gold")).length;

    return [
      { fuente: "Primavera", errores: primavera },
      { fuente: "OEBS", errores: oebs },
      { fuente: "Gold", errores: gold },
    ];
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Dashboard Ejecutivo KPIs Primavera</h1>
            <p className="mt-2 text-slate-600">Frontend React conectado a la API de Lambda para una vista tipo ACP / VMO.</p>
          </div>
          <Button onClick={load} className="rounded-2xl">
            <RefreshCcw className="mr-2 h-4 w-4" /> Recargar
          </Button>
        </div>

        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="p-10 text-center text-slate-500">Cargando datos...</CardContent>
          </Card>
        ) : error ? (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error de integración</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard title="Total proyectos" value={data.resumen.total_proyectos} icon={Database} />
              <SummaryCard title="Criticos" value={data.resumen.criticos} icon={AlertTriangle} />
              <SummaryCard title="En riesgo" value={data.resumen.en_riesgo} icon={Activity} />
              <SummaryCard title="Saludables" value={data.resumen.saludables} icon={CheckCircle2} />
              <SummaryCard
                title="No calculables"
                value={data.resumen.no_calculables}
                icon={Database}
                subtitle="Con trazabilidad por fuente"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Ejecucion de presupuesto</CardTitle>
                </CardHeader>
                <CardContent className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide={chartData.length > 10} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="valor_planeado" name="Valor planeado" dot={false} />
                      <Line type="monotone" dataKey="valor_ganado" name="Valor ganado" dot={false} />
                      <Line type="monotone" dataKey="costo_actual" name="Costo actual" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Auditoria de datos</CardTitle>
                </CardHeader>
                <CardContent className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={auditData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fuente" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="errores" name="Errores" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Explorador de proyectos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
                  <Input
                    placeholder="Buscar por ID, nombre o motivo"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="rounded-xl"
                  />
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="CRITICO">Critico</option>
                    <option value="RIESGO">En riesgo</option>
                    <option value="SALUDABLE">Saludable</option>
                    <option value="NO_CALCULABLE">No calculable</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="criticos" className="space-y-4">
              <TabsList>
                <TabsTrigger value="criticos">Requiere accion inmediata</TabsTrigger>
                <TabsTrigger value="riesgo">En riesgo</TabsTrigger>
                <TabsTrigger value="saludables">Sin problemas</TabsTrigger>
                <TabsTrigger value="nocalc">No calculables</TabsTrigger>
                <TabsTrigger value="todo">Vista completa</TabsTrigger>
              </TabsList>

              <TabsContent value="criticos">
                <ProjectTable rows={data.criticos} title="Proyectos criticos" />
              </TabsContent>
              <TabsContent value="riesgo">
                <ProjectTable rows={data.riesgo} title="Proyectos en riesgo" />
              </TabsContent>
              <TabsContent value="saludables">
                <ProjectTable rows={data.saludables} title="Proyectos saludables" />
              </TabsContent>
              <TabsContent value="nocalc">
                <ProjectTable rows={data.noCalculables} title="Proyectos no calculables" />
              </TabsContent>
              <TabsContent value="todo">
                <ProjectTable rows={filteredRows} title="Vista completa filtrada" />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </div>
  );
}
```

Lo correcto aquí es esto: tu Lambda debe dejar de devolver HTML y pasar a devolver JSON. Con eso, este frontend sí te da la interacción pro que buscabas. Si la dejas devolviendo HTML, React no puede explotar bien los datos.

Puedo dejarte también la versión exacta de la Lambda en modo JSON para que este frontend funcione sin tocar a mano nada más.
