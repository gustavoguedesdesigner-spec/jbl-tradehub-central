import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Brain, Sparkles, ShieldCheck, Wrench, Star, Loader2, Plus, ImageIcon,
  TrendingUp, Package, Megaphone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import {
  analisarLancamento,
  aplicarRecomendacao,
  aplicarRecomendacaoEspecial,
  type Recomendacao,
  type SugestaoEspecial,
} from "@/lib/decision-engine.functions";

export function DecisionEnginePanel({
  lancamentoId,
  onChanged,
}: {
  lancamentoId: string;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["decision-engine", lancamentoId],
    queryFn: () => analisarLancamento({ data: { lancamento_id: lancamentoId } }),
  });

  const invalidate = () => {
    void refetch();
    qc.invalidateQueries({ queryKey: ["lancamento", lancamentoId] });
    qc.invalidateQueries({ queryKey: ["materiais-especiais", lancamentoId] });
    onChanged();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-indigo-200/60">
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <Brain className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-tight">Decision Engine</h3>
                  <Badge variant="outline" className="border-white/40 bg-white/10 text-white">
                    {data?.provider === "ai" ? "IA" : "Heurístico"}
                  </Badge>
                </div>
                <p className="mt-1 max-w-xl text-sm text-white/85">
                  Análise automática de categoria, posicionamento, campanha e materiais existentes
                  para recomendar o kit ideal deste lançamento.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 bg-white text-indigo-700 hover:bg-white/90"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analisar novamente
            </Button>
          </div>

          {data?.contexto && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ContextChip icon={Megaphone} label="Campanha" value={data.contexto.campanha ?? "—"} />
              <ContextChip
                icon={Package}
                label="Produtos"
                value={String(data.contexto.produtos.length)}
                sub={data.contexto.produtos.map((p) => p.nome).slice(0, 2).join(", ")}
              />
              <ContextChip
                icon={TrendingUp}
                label="Materiais já vinculados"
                value={String(data.contexto.materiais_ja_vinculados)}
              />
            </div>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data ? null : (
        <div className="grid gap-6 xl:grid-cols-3">
          <RecomendacaoColuna
            icon={ShieldCheck}
            tone="emerald"
            titulo="Materiais Obrigatórios"
            descricao="Homologados na Base Mestre e compatíveis com o produto."
            itens={data.obrigatorios}
            onApply={(r) => r.material_id ? { lancamento_id: lancamentoId, material_id: r.material_id, categoria: "obrigatorio" as const } : null}
            onDone={invalidate}
          />
          <RecomendacaoColuna
            icon={Wrench}
            tone="amber"
            titulo="Materiais Opcionais"
            descricao="Peças que podem reforçar o mix, dependendo do plano de execução."
            itens={data.opcionais}
            onApply={(r) => r.material_id ? { lancamento_id: lancamentoId, material_id: r.material_id, categoria: "existente" as const } : null}
            onDone={invalidate}
          />
          <EspeciaisColuna
            itens={data.especiais}
            lancamentoId={lancamentoId}
            onDone={invalidate}
          />
        </div>
      )}
    </div>
  );
}

function ContextChip({
  icon: Icon, label, value, sub,
}: { icon: typeof Brain; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 backdrop-blur ring-1 ring-white/15">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
      {sub && <div className="truncate text-xs text-white/70">{sub}</div>}
    </div>
  );
}

const toneMap = {
  emerald: {
    ring: "border-emerald-200/70",
    icon: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  },
  amber: {
    ring: "border-amber-200/70",
    icon: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
  },
  violet: {
    ring: "border-violet-200/70",
    icon: "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
  },
} as const;

function RecomendacaoColuna({
  icon: Icon, tone, titulo, descricao, itens, onApply, onDone,
}: {
  icon: typeof Brain;
  tone: keyof typeof toneMap;
  titulo: string;
  descricao: string;
  itens: Recomendacao[];
  onApply: (r: Recomendacao) => { lancamento_id: string; material_id: string; categoria: "obrigatorio" | "existente" } | null;
  onDone: () => void;
}) {
  const t = toneMap[tone];
  const applyFn = useServerFn(aplicarRecomendacao);
  const m = useMutation({
    mutationFn: (payload: { lancamento_id: string; material_id: string; categoria: "obrigatorio" | "existente" }) =>
      applyFn({ data: payload }),
    onSuccess: () => { toast.success("Material vinculado ao lançamento"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className={`${t.ring}`}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${t.icon}`}><Icon className="h-5 w-5" /></div>
          <div>
            <h4 className="text-sm font-semibold">{titulo}</h4>
            <p className="text-xs text-neutral-500">{descricao}</p>
          </div>
          <Badge variant="outline" className="ml-auto">{itens.length}</Badge>
        </div>

        {itens.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-neutral-500">
            Nenhuma recomendação nesta categoria.
          </p>
        ) : (
          <ul className="space-y-3">
            {itens.map((r, i) => {
              const payload = onApply(r);
              return (
                <li key={`${r.material_id ?? r.nome}-${i}`} className="group flex gap-3 rounded-xl border p-3 transition hover:border-neutral-300 hover:bg-neutral-50">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {r.imagem_url ? (
                      <img src={r.imagem_url} alt={r.nome} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-300">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs uppercase tracking-wide text-neutral-500">
                          {r.codigo ?? r.origem}
                        </p>
                        <CardTitle className="mt-0.5 truncate text-sm">{r.nome}</CardTitle>
                      </div>
                      <ScorePill score={r.score} tone={tone} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{r.motivo}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={r.score} className="h-1 flex-1" />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        disabled={!payload || m.isPending}
                        onClick={() => payload && m.mutate(payload)}
                      >
                        <Plus className="h-3 w-3" /> Aplicar
                      </Button>
                    </div>
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

function EspeciaisColuna({
  itens, lancamentoId, onDone,
}: {
  itens: SugestaoEspecial[];
  lancamentoId: string;
  onDone: () => void;
}) {
  const t = toneMap.violet;
  const applyFn = useServerFn(aplicarRecomendacaoEspecial);
  const m = useMutation({
    mutationFn: (payload: { lancamento_id: string; nome: string; objetivo: string; briefing: string }) =>
      applyFn({ data: payload }),
    onSuccess: () => { toast.success("Material especial criado"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className={t.ring}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${t.icon}`}><Star className="h-5 w-5" /></div>
          <div>
            <h4 className="text-sm font-semibold">Materiais Especiais</h4>
            <p className="text-xs text-neutral-500">Ideias sugeridas para inovação neste lançamento.</p>
          </div>
          <Badge variant="outline" className="ml-auto">{itens.length}</Badge>
        </div>

        {itens.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-neutral-500">
            Nenhuma sugestão especial no momento.
          </p>
        ) : (
          <ul className="space-y-3">
            {itens.map((r, i) => (
              <li key={`${r.nome}-${i}`} className="rounded-xl border p-3 transition hover:border-violet-300 hover:bg-violet-50/40">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{r.nome}</CardTitle>
                  <ScorePill score={r.score} tone="violet" />
                </div>
                <p className="mt-1 text-xs text-neutral-600">{r.objetivo}</p>
                <p className="mt-2 line-clamp-3 rounded-md bg-neutral-50 p-2 text-[11px] text-neutral-500">
                  {r.briefing}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={r.score} className="h-1 flex-1" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 border-violet-300 text-xs text-violet-700 hover:bg-violet-100"
                    onClick={() => m.mutate({ lancamento_id: lancamentoId, nome: r.nome, objetivo: r.objetivo, briefing: r.briefing })}
                    disabled={m.isPending}
                  >
                    <Plus className="h-3 w-3" /> Criar
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] italic text-neutral-500">{r.motivo}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ScorePill({ score, tone }: { score: number; tone: keyof typeof toneMap }) {
  const t = toneMap[tone];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.icon}`}>
      {score}
    </span>
  );
}
