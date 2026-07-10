import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  Package,
  Box,
  Rocket,
  Megaphone,
  CalendarClock,
  Wrench,
  ArrowUpRight,
  AlertTriangle,
  Info,
  CircleAlert,
  Activity,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { NovoProjetoInteligenteButton } from "@/components/NovoProjetoInteligenteButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { obterResumoDashboard, type DashboardResumo } from "@/lib/dashboard.functions";

const resumoOpts = queryOptions({
  queryKey: ["dashboard-resumo"],
  queryFn: () => obterResumoDashboard(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — JBL Trade Hub" },
      {
        name: "description",
        content: "Visão geral do Trade Marketing JBL: produtos, materiais, projetos e campanhas.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resumoOpts),
  errorComponent: ({ error }) => (
    <div className="container-page py-16">
      <p className="text-sm text-destructive">Erro ao carregar dashboard: {error.message}</p>
    </div>
  ),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(resumoOpts);

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Panorama do Trade Marketing JBL — produtos, materiais, projetos, campanhas."
        actions={<NovoProjetoInteligenteButton />}
      />
      <div className="container-page space-y-8 py-10">
        <StatsCards data={data} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartProdutosPorLinha data={data.produtosPorLinha} />
          </div>
          <ChartProjetosPorStatus data={data.projetosPorStatus} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Cronograma data={data.cronograma} />
          </div>
          <Alertas data={data.alertas} />
        </div>
        <AtividadesRecentes data={data.atividades} />
      </div>
    </>
  );
}

/* ---------------- Cards ---------------- */

type StatDef = {
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
};

function StatsCards({ data }: { data: DashboardResumo }) {
  const stats: StatDef[] = [
    {
      label: "Produtos",
      value: data.cards.produtos.total,
      hint: `${data.cards.produtos.ativos} ativos · ${data.cards.produtos.lancamento} em lançamento`,
      href: "/base-mestre/produtos",
      icon: Package,
    },
    {
      label: "Materiais",
      value: data.cards.materiais.total,
      hint: "Cadastro de PDV",
      href: "/base-mestre/materiais",
      icon: Box,
    },
    {
      label: "Projetos",
      value: data.cards.projetos.total,
      hint: `${data.cards.projetos.em_andamento} em andamento`,
      href: "/lancamentos",
      icon: Rocket,
    },
    {
      label: "Campanhas",
      value: data.cards.campanhas.total,
      hint: `${data.cards.campanhas.ativas} ativas`,
      href: "/lancamentos",
      icon: Megaphone,
    },
    {
      label: "Lançamentos no mês",
      value: data.cards.lancamentos_mes,
      hint: "Programados para este mês",
      href: "/lancamentos",
      icon: CalendarClock,
      accent: true,
    },
    {
      label: "Materiais em desenvolvimento",
      value: data.cards.materiais_dev,
      hint: "Aguardando aprovação",
      href: "/base-mestre/materiais",
      icon: Wrench,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((s) => (
        <Link key={s.label} to={s.href} className="group">
          <Card className="h-full transition-colors group-hover:border-neutral-300">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    s.accent
                      ? "bg-primary/10 text-primary"
                      : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  <s.icon className="h-[18px] w-[18px]" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-neutral-700" />
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {s.value.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/* ---------------- Gráficos ---------------- */

function ChartProdutosPorLinha({
  data,
}: {
  data: DashboardResumo["produtosPorLinha"];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Produtos por linha</CardTitle>
        <p className="text-xs text-muted-foreground">Distribuição da base atual.</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart label="Cadastre linhas e produtos para visualizar aqui." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "var(--color-neutral-500)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-neutral-500)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-neutral-100)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-neutral-200)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" fill="var(--color-neutral-900)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Planejado: "var(--color-neutral-300)",
  "Em andamento": "var(--color-primary)",
  Lançado: "var(--color-neutral-900)",
  Cancelado: "var(--color-neutral-200)",
};

function ChartProjetosPorStatus({
  data,
}: {
  data: DashboardResumo["projetosPorStatus"];
}) {
  const total = data.reduce((acc, d) => acc + d.total, 0);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Projetos por status</CardTitle>
        <p className="text-xs text-muted-foreground">{total} projetos no total.</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyChart label="Sem projetos ainda." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-neutral-500)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: "var(--color-neutral-700)" }} tickLine={false} axisLine={false} width={90} />
                <Tooltip
                  cursor={{ fill: "var(--color-neutral-100)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-neutral-200)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                  {data.map((d) => (
                    <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "var(--color-neutral-500)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 text-center">
      <Activity className="h-5 w-5 text-neutral-300" />
      <p className="max-w-[220px] text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------- Cronograma ---------------- */

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "primary" | "success" | "warning"
> = {
  planejado: "secondary",
  em_andamento: "primary",
  lancado: "success",
  cancelado: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  lancado: "Lançado",
  cancelado: "Cancelado",
};

function Cronograma({ data }: { data: DashboardResumo["cronograma"] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Cronograma de lançamentos</CardTitle>
          <p className="text-xs text-muted-foreground">Próximos projetos programados.</p>
        </div>
        <Link
          to="/lancamentos"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Ver todos →
        </Link>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 py-10 text-center">
            <CalendarClock className="h-5 w-5 text-neutral-300" />
            <p className="text-xs text-muted-foreground">
              Nenhum lançamento programado.
            </p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-neutral-200 pl-6">
            {data.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-neutral-900" />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.nome}</p>
                  <Badge variant={STATUS_VARIANT[item.status] ?? "secondary"}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.data
                    ? new Date(item.data).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })
                    : "Sem data definida"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Alertas ---------------- */

function Alertas({ data }: { data: DashboardResumo["alertas"] }) {
  const iconMap = {
    info: Info,
    warning: AlertTriangle,
    danger: CircleAlert,
  } as const;
  const colorMap = {
    info: "bg-neutral-100 text-neutral-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
  } as const;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Alertas</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pontos que precisam da sua atenção.
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 py-10 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Info className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">Tudo em ordem</p>
            <p className="text-xs text-muted-foreground">Sem alertas no momento.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((a) => {
              const Icon = iconMap[a.tipo];
              return (
                <li
                  key={a.id}
                  className="flex gap-3 rounded-xl border border-neutral-200 p-4"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorMap[a.tipo]}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.titulo}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.descricao}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Atividades recentes ---------------- */

const ENTIDADE_LABEL: Record<string, string> = {
  produto: "Produto",
  material: "Material",
  lancamento: "Projeto",
  campanha: "Campanha",
  briefing: "Briefing",
  fornecedor: "Fornecedor",
};

const ACAO_LABEL: Record<string, string> = {
  criado: "criado",
  atualizado: "atualizado",
  removido: "removido",
  status_alterado: "teve o status alterado",
};

function AtividadesRecentes({
  data,
}: {
  data: DashboardResumo["atividades"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Atividades recentes</CardTitle>
          <p className="text-xs text-muted-foreground">
            Últimos eventos registrados no sistema.
          </p>
        </div>
        <Activity className="h-4 w-4 text-neutral-400" />
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 py-10 text-center">
            <Activity className="h-5 w-5 text-neutral-300" />
            <p className="text-sm font-medium">Sem atividades ainda</p>
            <p className="max-w-md text-xs text-muted-foreground">
              À medida que cadastros forem criados e alterados, você verá o histórico aqui.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {data.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">
                      {ENTIDADE_LABEL[a.entidade_tipo] ?? a.entidade_tipo}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {ACAO_LABEL[a.acao] ?? a.acao}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
