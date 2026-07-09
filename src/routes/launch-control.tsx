import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Rocket,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Calendar as CalendarIcon,
  Filter,
  LayoutGrid,
  Flame,
  Users,
  Bot,
  ArrowRight,
  Package,
  ChevronRight,
  Send,
} from "lucide-react";

import { PageHero } from "@/components/layout/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/launch-control")({
  head: () => ({
    meta: [
      { title: "Launch Control Center — JBL Trade Hub" },
      { name: "description", content: "Centro de Controle das operações de Marketing e Trade Marketing." },
    ],
  }),
  component: LaunchControlPage,
});

// ─────────────────────────────────────────────────────────────
// DADOS DEMO
// ─────────────────────────────────────────────────────────────

type StageState = "done" | "wip" | "late" | "todo" | "review";

const STAGE_STYLES: Record<StageState, { dot: string; ring: string; label: string; heat: string }> = {
  done: { dot: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Concluído", heat: "bg-emerald-500/80" },
  wip: { dot: "bg-amber-400", ring: "ring-amber-400/30", label: "Em andamento", heat: "bg-amber-400/80" },
  late: { dot: "bg-red-500", ring: "ring-red-500/40", label: "Atrasado", heat: "bg-red-500/85" },
  todo: { dot: "bg-neutral-300", ring: "ring-neutral-300/30", label: "Não iniciado", heat: "bg-neutral-200" },
  review: { dot: "bg-sky-500", ring: "ring-sky-500/30", label: "Aguardando aprovação", heat: "bg-sky-500/80" },
};

const STAGES = [
  "Briefing",
  "Criação",
  "Aprov. Interna",
  "Cliente",
  "Arte Final",
  "Produção",
  "Distribuição",
  "Instalação",
  "Lançamento",
] as const;

type Launch = {
  id: string;
  produto: string;
  categoria: string;
  campanha: string;
  campanhaTamanho: "G" | "M" | "P";
  responsavel: string;
  fornecedor: string;
  data: string; // yyyy-mm-dd
  prioridade: "Alta" | "Média" | "Baixa";
  progresso: number;
  status: "No prazo" | "Atenção" | "Crítico" | "Concluído";
  etapas: StageState[];
  checklist: { label: string; state: "done" | "wip" | "todo" }[];
};

const RESPONSAVEIS = ["Patricia", "Camila", "Marcelo", "Rafael", "Bruna"];
const FORNECEDORES = ["Print+", "MaxDisplay", "GráficaOne", "TradeArt", "PDV Studio"];
const CAMPANHAS = ["Verão 2026", "Back to Music", "Party Season", "Pro Audio", "Holiday Sound"];
const CATEGORIAS = ["Party", "Portátil", "Home", "Fones", "Gaming"];
const PRODUTOS = [
  ["PartyBox 130", "Party"],
  ["PartyBox 330", "Party"],
  ["Xtreme 5", "Portátil"],
  ["Flip 7", "Portátil"],
  ["Go 5", "Portátil"],
  ["Live 780NC", "Fones"],
  ["Live Beam 4", "Fones"],
  ["Live Buds 4", "Fones"],
  ["Quantum 910", "Gaming"],
  ["Tour Pro 2", "Fones"],
  ["Aura Studio 5", "Home"],
  ["Boombox 3", "Party"],
  ["Charge 6", "Portátil"],
  ["Clip 5", "Portátil"],
  ["Tune Buds", "Fones"],
  ["Bar 1300", "Home"],
  ["PartyBox Club 120", "Party"],
  ["Wave Beam", "Fones"],
  ["Quantum One", "Gaming"],
  ["Reflect Aero", "Fones"],
] as const;

function seedLaunches(): Launch[] {
  const states: StageState[] = ["done", "done", "wip", "review", "late", "todo"];
  const today = new Date();
  return PRODUTOS.map((p, i) => {
    const etapas = Array.from({ length: STAGES.length }).map((_, idx) => {
      if (idx < (i % 8) + 1) return "done" as StageState;
      if (idx === (i % 8) + 1) return states[i % states.length];
      return "todo" as StageState;
    });
    const done = etapas.filter((s) => s === "done").length;
    const progresso = Math.round((done / STAGES.length) * 100);
    const hasLate = etapas.includes("late");
    const hasReview = etapas.includes("review");
    const status: Launch["status"] = progresso === 100 ? "Concluído" : hasLate ? "Crítico" : hasReview ? "Atenção" : "No prazo";
    const size: Launch["campanhaTamanho"] = i % 3 === 0 ? "G" : i % 3 === 1 ? "M" : "P";
    const d = new Date(today);
    d.setDate(today.getDate() + ((i * 3) % 45) - 5);
    return {
      id: `L-${1000 + i}`,
      produto: p[0],
      categoria: p[1],
      campanha: CAMPANHAS[i % CAMPANHAS.length],
      campanhaTamanho: size,
      responsavel: RESPONSAVEIS[i % RESPONSAVEIS.length],
      fornecedor: FORNECEDORES[i % FORNECEDORES.length],
      data: d.toISOString().slice(0, 10),
      prioridade: i % 4 === 0 ? "Alta" : i % 4 === 1 ? "Média" : "Baixa",
      progresso,
      status,
      etapas,
      checklist: [
        { label: "Produto", state: "done" },
        { label: "KV", state: etapas[1] === "done" ? "done" : "wip" },
        { label: "Assets", state: etapas[2] === "done" ? "done" : "wip" },
        { label: "Materiais", state: etapas[3] === "done" ? "done" : "todo" },
        { label: "Aprovação", state: etapas[4] === "done" ? "done" : etapas[4] === "review" ? "wip" : "todo" },
        { label: "Produção", state: etapas[5] === "done" ? "done" : etapas[5] === "wip" || etapas[5] === "late" ? "wip" : "todo" },
        { label: "Distribuição", state: etapas[6] === "done" ? "done" : "todo" },
        { label: "Instalação", state: etapas[7] === "done" ? "done" : "todo" },
      ],
    };
  });
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────

function LaunchControlPage() {
  const launches = useMemo(seedLaunches, []);
  const [modo, setModo] = useState<"matrix" | "heatmap">("matrix");
  const [filtroCategoria, setFiltroCategoria] = useState("__all");
  const [filtroCampanha, setFiltroCampanha] = useState("__all");
  const [filtroResp, setFiltroResp] = useState("__all");
  const [busca, setBusca] = useState("");
  const [aiQuery, setAiQuery] = useState("");

  const filtered = useMemo(
    () =>
      launches.filter((l) => {
        if (filtroCategoria !== "__all" && l.categoria !== filtroCategoria) return false;
        if (filtroCampanha !== "__all" && l.campanha !== filtroCampanha) return false;
        if (filtroResp !== "__all" && l.responsavel !== filtroResp) return false;
        if (busca && !l.produto.toLowerCase().includes(busca.toLowerCase())) return false;
        return true;
      }),
    [launches, filtroCategoria, filtroCampanha, filtroResp, busca],
  );

  const totais = useMemo(() => {
    const ativos = launches.filter((l) => l.status !== "Concluído").length;
    const g = launches.filter((l) => l.campanhaTamanho === "G").length;
    const m = launches.filter((l) => l.campanhaTamanho === "M").length;
    const p = launches.filter((l) => l.campanhaTamanho === "P").length;
    const revisao = launches.filter((l) => l.etapas.includes("review")).length;
    const briefingsPend = launches.filter((l) => l.etapas[0] !== "done").length;
    const atrasados = launches.filter((l) => l.status === "Crítico").length;
    const concluidos = launches.filter((l) => l.status === "Concluído").length;
    const today = new Date();
    const week = launches.filter((l) => {
      const d = new Date(l.data);
      const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    return { ativos, g, m, p, revisao, briefingsPend, atrasados, concluidos, week };
  }, [launches]);

  const cardsExec = [
    { label: "Projetos Ativos", value: totais.ativos, delta: "+3", icon: Rocket, tone: "text-primary" },
    { label: "Campanhas G", value: totais.g, delta: "+1", icon: Flame, tone: "text-red-500" },
    { label: "Campanhas M", value: totais.m, delta: "0", icon: LayoutGrid, tone: "text-amber-500" },
    { label: "Campanhas P", value: totais.p, delta: "-1", icon: LayoutGrid, tone: "text-emerald-500" },
    { label: "Aprovações Pendentes", value: totais.revisao, delta: "+2", icon: CheckCircle2, tone: "text-sky-500" },
    { label: "Briefings Pendentes", value: totais.briefingsPend, delta: "-2", icon: FileText, tone: "text-neutral-500" },
    { label: "Projetos Atrasados", value: totais.atrasados, delta: "+1", icon: AlertTriangle, tone: "text-red-500" },
    { label: "Projetos Concluídos", value: totais.concluidos, delta: "+4", icon: CheckCircle2, tone: "text-emerald-500" },
    { label: "Próximos Lançamentos (7d)", value: totais.week, delta: "+2", icon: CalendarIcon, tone: "text-primary" },
  ];

  const attention = launches
    .filter((l) => l.status === "Crítico" || l.etapas.includes("review") || l.etapas[0] !== "done")
    .slice(0, 8);

  const cargaEquipe = RESPONSAVEIS.map((nome) => {
    const projetos = launches.filter((l) => l.responsavel === nome);
    const atrasados = projetos.filter((p) => p.status === "Crítico").length;
    return { nome, total: projetos.length, atrasados };
  }).sort((a, b) => b.total - a.total);

  const maxCarga = Math.max(...cargaEquipe.map((c) => c.total), 1);

  const today = new Date();
  const timelineDays = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <TooltipProvider delayDuration={100}>
      <PageHero
        eyebrow="Launch Control Center"
        title="Centro de Controle de Operações"
        description="Toda a operação de lançamentos, campanhas e projetos em uma única visão. Entenda o estado real da operação em menos de 20 segundos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ao vivo
            </Badge>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" /> Filtros
            </Button>
            <Button size="sm" className="gap-2 bg-[#FF6B00] text-white hover:bg-[#E85F00]">
              <Sparkles className="h-4 w-4" /> Novo Projeto
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1600px] px-6 py-8 space-y-8">
        {/* CARDS EXECUTIVOS */}
        <section>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-9">
            {cardsExec.map((c) => {
              const Icon = c.icon;
              const positive = c.delta.startsWith("+");
              const negative = c.delta.startsWith("-");
              return (
                <Card
                  key={c.label}
                  className="group relative overflow-hidden border-neutral-200/70 bg-white/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-neutral-900/40"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <Icon className={cn("h-4 w-4", c.tone)} />
                      <span
                        className={cn(
                          "text-[10px] font-medium tabular-nums",
                          positive && "text-emerald-600",
                          negative && "text-red-500",
                          !positive && !negative && "text-muted-foreground",
                        )}
                      >
                        {c.delta}
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{c.value}</div>
                    <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{c.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FILTROS */}
        <section className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-56"
          />
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroCampanha} onValueChange={setFiltroCampanha}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Campanha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas campanhas</SelectItem>
              {CAMPANHAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroResp} onValueChange={setFiltroResp}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos responsáveis</SelectItem>
              {RESPONSAVEIS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Tabs value={modo} onValueChange={(v) => setModo(v as "matrix" | "heatmap")}>
              <TabsList>
                <TabsTrigger value="matrix" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Matrix</TabsTrigger>
                <TabsTrigger value="heatmap" className="gap-1.5"><Flame className="h-3.5 w-3.5" /> Heatmap</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </section>

        {/* LAUNCH MATRIX + PAINEL INTELIGENTE */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base">Launch Matrix</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">{filtered.length} lançamentos · toque em uma célula para detalhes</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                {(["done", "wip", "review", "late", "todo"] as StageState[]).map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", STAGE_STYLES[s].dot)} />
                    {STAGE_STYLES[s].label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-[12px]">
                  <thead>
                    <tr className="border-y bg-neutral-50/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground dark:bg-neutral-900/40">
                      <th className="sticky left-0 z-10 bg-neutral-50/60 px-4 py-2.5 font-medium dark:bg-neutral-900/40">Lançamento</th>
                      <th className="px-2 py-2.5 font-medium">Resp.</th>
                      {STAGES.map((s) => (
                        <th key={s} className="px-2 py-2.5 text-center font-medium">{s}</th>
                      ))}
                      <th className="px-3 py-2.5 font-medium">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l) => (
                      <tr key={l.id} className="group border-b transition hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40">
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 group-hover:bg-neutral-50/70 dark:bg-neutral-950 dark:group-hover:bg-neutral-900/40">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                              <Package className="h-4 w-4 text-neutral-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{l.produto}</div>
                              <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                                <span>{l.campanha}</span>
                                <span className="opacity-40">·</span>
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-medium">{l.campanhaTamanho}</Badge>
                                <span className="opacity-40">·</span>
                                <span>{l.categoria}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <Avatar name={l.responsavel} />
                        </td>
                        {l.etapas.map((s, idx) => (
                          <td key={idx} className="px-1 py-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "mx-auto flex h-7 w-7 items-center justify-center rounded-md transition hover:scale-110",
                                    modo === "heatmap"
                                      ? cn(STAGE_STYLES[s].heat, "opacity-90")
                                      : "bg-neutral-100 dark:bg-neutral-800/60",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-2.5 w-2.5 rounded-full ring-2",
                                      STAGE_STYLES[s].dot,
                                      STAGE_STYLES[s].ring,
                                      modo === "heatmap" && "bg-white/90 ring-white/50",
                                    )}
                                  />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <div className="font-medium">{STAGES[idx]}</div>
                                <div className="text-muted-foreground">{STAGE_STYLES[s].label}</div>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        ))}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={l.progresso} className="h-1.5 w-24" />
                            <span className="w-8 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                              {l.progresso}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* PAINEL INTELIGENTE */}
          <div className="space-y-6">
            <Card className="border-amber-200/60 bg-gradient-to-b from-amber-50/60 to-transparent dark:border-amber-900/40 dark:from-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  O que precisa da sua atenção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attention.map((l) => {
                  const motivo =
                    l.status === "Crítico"
                      ? { text: "Atrasado", tone: "text-red-500", icon: AlertTriangle }
                      : l.etapas.includes("review")
                      ? { text: "Aguardando aprovação", tone: "text-sky-500", icon: Clock }
                      : { text: "Briefing incompleto", tone: "text-neutral-500", icon: FileText };
                  const Icon = motivo.icon;
                  return (
                    <div key={l.id} className="group flex items-center gap-3 rounded-lg border bg-white p-2.5 transition hover:border-primary/40 hover:shadow-sm dark:bg-neutral-950">
                      <Icon className={cn("h-4 w-4 shrink-0", motivo.tone)} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">{l.produto}</div>
                        <div className="text-[11px] text-muted-foreground">{motivo.text} · {l.responsavel}</div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px] opacity-0 transition group-hover:opacity-100">
                        Abrir <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* COMPASS AI */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bot className="h-4 w-4 text-primary" /> Compass AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Input
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="Pergunte sobre a operação..."
                    className="pr-9 bg-white dark:bg-neutral-950"
                  />
                  <Button size="icon" variant="ghost" className="absolute right-0.5 top-0.5 h-8 w-8">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {[
                    "Quais projetos correm risco de atraso?",
                    "Quem está sobrecarregado?",
                    "Aprovações pendentes hoje",
                    "Somente campanhas G",
                    "Entregas desta semana",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setAiQuery(q)}
                      className="flex w-full items-center justify-between rounded-md border bg-white/60 px-2.5 py-1.5 text-left text-[11.5px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground dark:bg-neutral-950"
                    >
                      <span className="truncate">{q}</span>
                      <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* TIMELINE + CARGA */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base">Timeline · Próximos 30 dias</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">Distribuição de lançamentos no calendário</p>
              </div>
              <div className="flex gap-2 text-[11px]">
                <Badge variant="outline">Hoje</Badge>
                <Badge variant="outline">7 dias</Badge>
                <Badge variant="secondary">30 dias</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-[900px] gap-1">
                  {timelineDays.map((d, i) => {
                    const iso = d.toISOString().slice(0, 10);
                    const items = filtered.filter((l) => l.data === iso);
                    const isToday = i === 0;
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={iso}
                        className={cn(
                          "flex min-w-[38px] flex-1 flex-col items-center rounded-md border p-1.5 text-center transition",
                          isToday && "border-primary bg-primary/5",
                          weekend && !isToday && "bg-neutral-50/60 dark:bg-neutral-900/30",
                        )}
                      >
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                          {d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                        </div>
                        <div className={cn("text-sm font-semibold tabular-nums", isToday && "text-primary")}>
                          {d.getDate()}
                        </div>
                        <div className="mt-1.5 flex min-h-[36px] flex-col items-center gap-1">
                          {items.slice(0, 3).map((it) => (
                            <Tooltip key={it.id}>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    "h-1.5 w-6 rounded-full",
                                    it.status === "Crítico"
                                      ? "bg-red-500"
                                      : it.status === "Atenção"
                                      ? "bg-amber-400"
                                      : it.status === "Concluído"
                                      ? "bg-emerald-500"
                                      : "bg-primary",
                                  )}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <div className="font-medium">{it.produto}</div>
                                <div className="text-muted-foreground">{it.campanha} · {it.responsavel}</div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {items.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{items.length - 3}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARGA DA EQUIPE */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" /> Carga da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cargaEquipe.map((c) => (
                <div key={c.nome} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <Avatar name={c.nome} />
                      <span className="font-medium">{c.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {c.atrasados > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertTriangle className="h-3 w-3" /> {c.atrasados}
                        </span>
                      )}
                      <span className="tabular-nums">{c.total} projetos</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        c.total / maxCarga > 0.8
                          ? "bg-red-500"
                          : c.total / maxCarga > 0.5
                          ? "bg-amber-400"
                          : "bg-emerald-500",
                      )}
                      style={{ width: `${(c.total / maxCarga) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* DEPENDÊNCIAS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dependências críticas</CardTitle>
            <p className="text-xs text-muted-foreground">Projetos com bloqueios ou pendências externas</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.filter((l) => l.status !== "Concluído").slice(0, 6).map((l) => (
                <div key={l.id} className="rounded-lg border p-4 transition hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{l.produto}</div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        l.status === "Crítico" && "border-red-300 text-red-600",
                        l.status === "Atenção" && "border-amber-300 text-amber-600",
                        l.status === "No prazo" && "border-emerald-300 text-emerald-600",
                      )}
                    >
                      {l.status}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {l.checklist.slice(0, 5).map((c) => (
                      <div key={c.label} className="flex items-center gap-2 text-[12px]">
                        {c.state === "done" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : c.state === "wip" ? (
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-neutral-300" />
                        )}
                        <span className={cn(c.state === "done" ? "text-muted-foreground line-through" : "")}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-fuchsia-500", "bg-rose-500", "bg-indigo-500"];
  const color = colors[name.length % colors.length];
  return (
    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white", color)}>
      {initials}
    </div>
  );
}
