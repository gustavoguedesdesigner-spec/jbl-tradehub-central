import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import {
  BarChart3, Package, Box, Megaphone, Rocket, AlertTriangle,
  Factory, Sparkles, ShieldCheck, Wrench, FileDown, FileSpreadsheet,
  TrendingUp, Printer,
} from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import * as XLSX from "xlsx";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { obterDashboardExecutivo, type DashboardExecutivo } from "@/lib/dashboard-executivo.functions";

const opts = queryOptions({
  queryKey: ["dashboard-executivo"],
  queryFn: () => obterDashboardExecutivo(),
});

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo — JBL Trade Hub" },
      {
        name: "description",
        content:
          "Painel executivo com indicadores de produtos, materiais, campanhas, projetos, pendências, produção e homologação. Exportação em PDF e Excel.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: DashboardExecutivoPage,
});

const COLORS = ["#6366f1", "#8b5cf6", "#d946ef", "#f59e0b", "#10b981", "#ef4444", "#14b8a6", "#3b82f6"];

function DashboardExecutivoPage() {
  const { data } = useSuspenseQuery(opts);
  const ref = useRef<HTMLDivElement>(null);

  const kpis = useMemo(
    () => [
      { key: "produtos", label: "Produtos", value: data.cards.produtos, sub: `${data.cards.produtos_ativos} ativos`, icon: Package, tone: "from-blue-500 to-blue-600" },
      { key: "materiais", label: "Materiais", value: data.cards.materiais, sub: `${data.cards.homologados} homologados`, icon: Box, tone: "from-amber-500 to-orange-500" },
      { key: "campanhas", label: "Campanhas", value: data.cards.campanhas, sub: `${data.cards.campanhas_ativas} ativas`, icon: Megaphone, tone: "from-fuchsia-500 to-pink-500" },
      { key: "projetos", label: "Projetos", value: data.cards.projetos, sub: `${data.cards.projetos_andamento} em andamento`, icon: Rocket, tone: "from-indigo-500 to-violet-600" },
      { key: "pendencias", label: "Pendências", value: data.cards.pendencias, sub: "aguardando ação", icon: AlertTriangle, tone: "from-red-500 to-rose-600" },
      { key: "producao", label: "Produção", value: data.cards.producao, sub: "materiais em fábrica", icon: Factory, tone: "from-yellow-500 to-amber-600" },
      { key: "especiais", label: "Materiais Especiais", value: data.cards.materiais_especiais, sub: "pipeline de inovação", icon: Sparkles, tone: "from-violet-500 to-purple-600" },
      { key: "homologados", label: "Itens Homologados", value: data.cards.homologados, sub: "aprovados na Base Mestre", icon: ShieldCheck, tone: "from-emerald-500 to-green-600" },
      { key: "desenv", label: "Em Desenvolvimento", value: data.cards.em_desenvolvimento, sub: "materiais em criação", icon: Wrench, tone: "from-sky-500 to-cyan-600" },
    ],
    [data],
  );

  const exportPDF = () => window.print();
  const exportExcel = () => exportToXlsx(data);

  return (
    <div ref={ref} className="space-y-6 print:space-y-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-900/10 bg-gradient-to-br from-neutral-950 via-indigo-950 to-violet-900 p-8 text-white shadow-xl print:rounded-none print:shadow-none print:from-neutral-900 print:to-neutral-900">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl print:hidden" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur ring-1 ring-white/15">
              <BarChart3 className="h-7 w-7 text-indigo-200" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/90">Executivo</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                Dashboard Executivo
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Visão consolidada de produtos, materiais, campanhas, projetos, pendências, produção
                e homologação. Gerado em{" "}
                <span className="font-semibold text-white">
                  {new Date(data.geradoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </span>
                .
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="secondary" size="sm" className="gap-2" onClick={exportPDF}>
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button variant="secondary" size="sm" className="gap-2" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/10" onClick={exportPDF}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 print:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.key}
            className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm print:shadow-none"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.tone}`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  {k.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                  {k.value.toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{k.sub}</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${k.tone} p-2.5 text-white shadow-sm`}>
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Projetos por Status" icon={Rocket}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.projetosPorStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="status" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#f5f5f5" }} />
              <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pipeline de Materiais (Lançamentos)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.pendenciasPorTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="tipo" stroke="#6b7280" fontSize={11} width={100} />
              <Tooltip cursor={{ fill: "#f5f5f5" }} />
              <Bar dataKey="total" fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Materiais por Status (Base Mestre)" icon={Box}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.materiaisPorStatus}
                dataKey="total"
                nameKey="status"
                outerRadius={90}
                label={(e: { status: string; total: number }) => `${e.status}: ${e.total}`}
              >
                {data.materiaisPorStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Produtos por Linha" icon={Package}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.produtosPorLinha.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="nome" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#f5f5f5" }} />
              <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tabela resumo (ótimo para PDF/print) */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Resumo Consolidado</h3>
            <Badge variant="outline">Snapshot</Badge>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Indicador</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2">Contexto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {kpis.map((k) => (
                  <tr key={k.key}>
                    <td className="px-4 py-2 font-medium text-neutral-800">{k.label}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {k.value.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{k.sub}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartCard({
  title, icon: Icon, children,
}: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-neutral-100 p-2 text-neutral-700">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function exportToXlsx(data: DashboardExecutivo) {
  const wb = XLSX.utils.book_new();

  const kpiRows = [
    ["Indicador", "Valor"],
    ["Produtos", data.cards.produtos],
    ["Produtos ativos", data.cards.produtos_ativos],
    ["Materiais", data.cards.materiais],
    ["Itens homologados", data.cards.homologados],
    ["Em desenvolvimento", data.cards.em_desenvolvimento],
    ["Campanhas", data.cards.campanhas],
    ["Campanhas ativas", data.cards.campanhas_ativas],
    ["Projetos", data.cards.projetos],
    ["Projetos em andamento", data.cards.projetos_andamento],
    ["Pendências", data.cards.pendencias],
    ["Produção", data.cards.producao],
    ["Materiais especiais", data.cards.materiais_especiais],
    [],
    ["Gerado em", new Date(data.geradoEm).toLocaleString("pt-BR")],
  ];
  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiRows);
  kpiSheet["!cols"] = [{ wch: 32 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, kpiSheet, "Indicadores");

  const addBreakdown = (name: string, header: [string, string], rows: Array<[string, number]>) => {
    const s = XLSX.utils.aoa_to_sheet([header, ...rows]);
    s["!cols"] = [{ wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, s, name);
  };

  addBreakdown("Projetos por Status", ["Status", "Total"],
    data.projetosPorStatus.map((r) => [r.status, r.total]));
  addBreakdown("Pipeline Materiais", ["Etapa", "Total"],
    data.pendenciasPorTipo.map((r) => [r.tipo, r.total]));
  addBreakdown("Materiais por Status", ["Status", "Total"],
    data.materiaisPorStatus.map((r) => [r.status, r.total]));
  addBreakdown("Produtos por Linha", ["Linha", "Total"],
    data.produtosPorLinha.map((r) => [r.nome, r.total]));
  addBreakdown("Produtos por Categoria", ["Categoria", "Total"],
    data.produtosPorCategoria.map((r) => [r.nome, r.total]));

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `dashboard-executivo-${stamp}.xlsx`);
}
