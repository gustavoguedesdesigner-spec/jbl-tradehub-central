import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Brain, Sparkles, Search, Rocket, Megaphone, Package, ArrowLeft,
  CircuitBoard, Cpu, Zap,
} from "lucide-react";


import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { listarLancamentos } from "@/lib/lancamentos.functions";
import { DecisionEnginePanel } from "@/components/lancamentos/DecisionEnginePanel";

const opts = queryOptions({
  queryKey: ["lancamentos", "decision-engine"],
  queryFn: () => listarLancamentos({ data: {} }),
});

export const Route = createFileRoute("/decision-engine")({
  head: () => ({
    meta: [
      { title: "Decision Engine — Recomendação Inteligente — JBL Trade Hub" },
      {
        name: "description",
        content:
          "Motor de decisão que analisa categoria, posicionamento, campanha e materiais existentes para recomendar o kit ideal de PDV.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: DecisionEnginePage,
});

type Lanc = Awaited<ReturnType<typeof listarLancamentos>>[number];

function DecisionEnginePage() {
  const { data: lancamentos, refetch } = useSuspenseQuery(opts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const filtered = useMemo(() => {
    const t = busca.toLowerCase().trim();
    if (!t) return lancamentos;
    return lancamentos.filter(
      (l) =>
        l.nome?.toLowerCase().includes(t) ||
        l.codigo?.toLowerCase().includes(t) ||
        l.campanha?.nome?.toLowerCase().includes(t),
    );
  }, [lancamentos, busca]);

  const selected = lancamentos.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur ring-1 ring-white/20">
              <Brain className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Inteligência</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Decision Engine</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85">
                Análise automática de categoria, posicionamento, campanha, contexto, produtos e
                materiais existentes — recomendando o mix ideal de PDV. Arquitetado para plugar IA.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-white/40 bg-white/10 text-white">
            <Sparkles className="mr-1 h-3 w-3" /> Provider: Heurístico · pronto para IA
          </Badge>
        </div>
      </section>

      {/* Pipeline visual */}
      <div className="grid gap-3 md:grid-cols-3">
        <PipelineCard
          icon={CircuitBoard}
          tone="indigo"
          titulo="Sinais analisados"
          items={["Categoria", "Posicionamento", "Campanha", "Contexto", "Produtos", "Materiais existentes"]}
        />
        <PipelineCard
          icon={Cpu}
          tone="violet"
          titulo="Motor"
          items={["Regras heurísticas", "Base Mestre + Compatibilidades", "Pronto para IA (Lovable AI)"]}
        />
        <PipelineCard
          icon={Zap}
          tone="fuchsia"
          titulo="Recomendações"
          items={["Materiais obrigatórios", "Materiais opcionais", "Materiais especiais"]}
        />
      </div>

      {selected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-4 w-4" /> Voltar aos lançamentos
            </Button>
            <div className="flex flex-1 items-center gap-2">
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                <Rocket className="mr-1 h-3 w-3" /> {selected.codigo ?? "—"}
              </Badge>
              <h2 className="truncate text-lg font-semibold">{selected.nome}</h2>
              {selected.campanha?.nome && (
                <Badge variant="secondary" className="gap-1">
                  <Megaphone className="h-3 w-3" /> {selected.campanha.nome}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/lancamentos/$id" params={{ id: selected.id }}>Abrir projeto →</Link>
            </Button>
          </div>

          <DecisionEnginePanel lancamentoId={selected.id} onChanged={() => void refetch()} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar lançamento, código ou campanha…"
                className="pl-9"
              />
            </div>
            <Badge variant="outline">{filtered.length} lançamentos</Badge>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-neutral-500">
                Nenhum lançamento encontrado. Crie um na{" "}
                <Link to="/lancamentos" className="text-indigo-700 underline">
                  Central de Lançamentos
                </Link>{" "}
                para começar a receber recomendações.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((l) => (
                <LancamentoCard key={l.id} lanc={l} onSelect={() => setSelectedId(l.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LancamentoCard({ lanc, onSelect }: { lanc: Lanc; onSelect: () => void }) {
  const produtos = lanc.produtos ?? [];
  const thumbs = produtos
    .map((p) => (p as unknown as { thumb_url: string | null }).thumb_url)
    .filter((u): u is string => !!u)
    .slice(0, 4);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-70 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-neutral-500">
            {lanc.codigo ?? "sem código"}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-base font-semibold text-neutral-900">
            {lanc.nome}
          </h3>
        </div>
        <Badge variant="outline" className="shrink-0 border-indigo-200 bg-indigo-50 text-indigo-700">
          {lanc.status ?? "—"}
        </Badge>
      </div>

      {lanc.campanha?.nome && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-600">
          <Megaphone className="h-3.5 w-3.5" /> {lanc.campanha.nome}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {thumbs.length === 0 ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-neutral-50 text-neutral-400">
              <Package className="h-4 w-4" />
            </div>
          ) : (
            thumbs.map((u, i) => (
              <img
                key={i}
                src={u}
                alt=""
                className="h-9 w-9 rounded-full border-2 border-white object-cover"
              />
            ))
          )}
        </div>
        <div className="text-xs text-neutral-500">
          {produtos.length} produto{produtos.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 opacity-0 transition group-hover:opacity-100">
        <Sparkles className="h-3.5 w-3.5" /> Analisar recomendações
      </div>
    </button>
  );
}

const pipelineTone = {
  indigo: "from-indigo-500/10 to-indigo-500/0 text-indigo-700 border-indigo-200",
  violet: "from-violet-500/10 to-violet-500/0 text-violet-700 border-violet-200",
  fuchsia: "from-fuchsia-500/10 to-fuchsia-500/0 text-fuchsia-700 border-fuchsia-200",
} as const;

function PipelineCard({
  icon: Icon, tone, titulo, items,
}: {
  icon: typeof Brain;
  tone: keyof typeof pipelineTone;
  titulo: string;
  items: string[];
}) {
  return (
    <Card className={`overflow-hidden border ${pipelineTone[tone].split(" ").slice(-1)}`}>
      <div className={`bg-gradient-to-br ${pipelineTone[tone]} p-5`}>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/70 p-2 backdrop-blur">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">{titulo}</h3>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li
              key={i}
              className="rounded-full border border-white/60 bg-white/70 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur"
            >
              {i}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
