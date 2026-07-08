import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, CalendarClock, User, Rocket, Package, Trash2, CheckCircle2, Circle,
  Plus, MessageSquare, FileText, Paperclip, ListChecks, Sparkles, Boxes, Wrench,
  Star, Factory, ClipboardCheck, Truck, ShieldCheck, ShieldAlert, Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  obterLancamento, excluirLancamento, atualizarLancamento, atualizarEtapas,
  adicionarChecklistItem, alternarChecklistItem, removerChecklistItem,
  vincularMaterial, desvincularMaterial, listarMateriaisDisponiveis,
  adicionarComentario, criarBriefingRapido,
  listarCampanhas, listarResponsaveis,
} from "@/lib/lancamentos.functions";
import { MateriaisObrigatoriosPanel } from "@/components/lancamentos/MateriaisObrigatoriosPanel";
import { MateriaisEspeciaisPanel } from "@/components/lancamentos/MateriaisEspeciaisPanel";

const detailOpts = (id: string) => queryOptions({
  queryKey: ["lancamento", id],
  queryFn: () => obterLancamento({ data: { id } }),
});

export const Route = createFileRoute("/lancamentos/$id")({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData && "nome" in loaderData ? `${(loaderData as { nome: string }).nome} — Projeto de Lançamento — JBL` : "Projeto de Lançamento — JBL" },
    ],
  }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(detailOpts(params.id)),
  component: LancamentoDetalhe,
});

const statusMap: Record<string, { l: string; v: "default" | "secondary" | "outline" | "destructive" }> = {
  planejado: { l: "Planejado", v: "outline" },
  em_andamento: { l: "Em andamento", v: "secondary" },
  lancado: { l: "Lançado", v: "default" },
  cancelado: { l: "Cancelado", v: "destructive" },
};

const etapaMap: Record<string, { l: string; cls: string }> = {
  pendente: { l: "Pendente", cls: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  em_andamento: { l: "Em andamento", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  concluido: { l: "Concluído", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  bloqueado: { l: "Bloqueado", cls: "bg-red-50 text-red-700 border-red-200" },
};

const sections = [
  { id: "resumo", label: "Resumo", icon: Sparkles },
  { id: "produto", label: "Produto", icon: Package },
  { id: "cronograma", label: "Cronograma", icon: CalendarClock },
  { id: "checklist", label: "Checklist", icon: ListChecks },
  { id: "materiais", label: "Materiais", icon: Boxes },
  { id: "briefings", label: "Briefings", icon: FileText },
  { id: "arquivos", label: "Arquivos", icon: Paperclip },
  { id: "comentarios", label: "Comentários", icon: MessageSquare },
  { id: "producao", label: "Produção", icon: Factory },
  { id: "aprovacao", label: "Aprovação", icon: ClipboardCheck },
  { id: "implantacao", label: "Implantação", icon: Truck },
];

function LancamentoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: l } = useSuspenseQuery(detailOpts(id));
  const invalidate = () => qc.invalidateQueries({ queryKey: ["lancamento", id] });

  const excluirFn = useServerFn(excluirLancamento);
  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { id } }),
    onSuccess: () => { toast.success("Lançamento removido"); navigate({ to: "/lancamentos" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const anyL = l as unknown as {
    id: string; nome: string; codigo: string | null; descricao: string | null; status: string;
    data_prevista: string | null; data_lancamento: string | null; updated_at: string; created_at: string;
    pdv_ready: boolean; producao_status: string; aprovacao_status: string; implantacao_status: string;
    producao_nota: string | null; aprovacao_nota: string | null; implantacao_nota: string | null;
    campanha: { id: string; nome: string } | null;
    responsavel: { id: string; nome: string | null; email: string | null; avatar_url: string | null } | null;
    produtos: Array<{ id: string; produto: { id: string; nome: string; sku: string; codigo_jbl: string | null; descricao_curta: string | null; linha: { nome: string } | null; categoria: { nome: string } | null; imagens: Array<{ storage_path: string; principal: boolean; url_assinada: string | null }> } | null }>;
    materiais: Array<{ id: string; quantidade: number; categoria: string; observacao: string | null; material: { id: string; codigo: string; nome: string; tipo: string | null; status: string; imagem_principal_url: string | null; fornecedor: { nome: string } | null } | null }>;
    checklist: Array<{ id: string; titulo: string; feito: boolean; ordem: number; categoria: string }>;
    briefings: Array<{ id: string; titulo: string; objetivo: string | null; publico_alvo: string | null; mensagem_chave: string | null; status: string; updated_at: string }>;
    arquivos: Array<{ id: string; arquivo: { id: string; nome: string; mime_type: string | null; tamanho_bytes: number | null; descricao: string | null; created_at: string } | null }>;
    comentarios: Array<{ id: string; corpo: string; created_at: string; autor: { id: string; nome: string | null; email: string | null; avatar_url: string | null } | null }>;
    historico: Array<{ id: string; acao: string; created_at: string }>;
  };

  const s = statusMap[anyL.status] ?? { l: anyL.status, v: "outline" as const };
  const produtos = anyL.produtos ?? [];
  const first = produtos[0];
  const heroImg = first?.produto?.imagens?.find((i) => i.principal)?.url_assinada
    ?? first?.produto?.imagens?.[0]?.url_assinada ?? null;

  const materiaisExistentes = anyL.materiais.filter((m) => m.categoria === "existente");
  const materiaisObrig = anyL.materiais.filter((m) => m.categoria === "obrigatorio");
  const materiaisEspeciais = anyL.materiais.filter((m) => m.categoria === "especial");

  const checklistFeitos = anyL.checklist.filter((c) => c.feito).length;
  const checklistTotal = anyL.checklist.length;
  const checklistPct = checklistTotal ? Math.round((checklistFeitos / checklistTotal) * 100) : 0;

  const etapasConcluidas =
    (anyL.producao_status === "concluido" ? 1 : 0) +
    (anyL.aprovacao_status === "concluido" ? 1 : 0) +
    (anyL.implantacao_status === "concluido" ? 1 : 0);
  const etapasPct = Math.round((etapasConcluidas / 3) * 100);
  const progressoGlobal = Math.round((checklistPct + etapasPct) / 2);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-neutral-200 bg-neutral-950 text-white">
        {heroImg && (
          <div className="absolute inset-0 opacity-25">
            <img src={heroImg} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-950/85 to-neutral-900" />
        <div className="container-page relative py-14 md:py-20">
          <Button asChild variant="ghost" size="sm" className="mb-8 text-white/70 hover:text-white hover:bg-white/10">
            <Link to="/lancamentos"><ArrowLeft className="h-4 w-4 mr-2" /> Central de Lançamentos</Link>
          </Button>

          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Badge variant={s.v} className="text-xs uppercase tracking-wider">{s.l}</Badge>
                {anyL.codigo && <span className="text-sm text-white/50 font-mono">{anyL.codigo}</span>}
                {anyL.campanha && (
                  <span className="text-sm text-white/60 flex items-center gap-1.5">
                    <Rocket className="h-3.5 w-3.5" /> {anyL.campanha.nome}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">{anyL.nome}</h1>
              {anyL.descricao && <p className="mt-5 max-w-2xl text-lg text-white/70 leading-relaxed">{anyL.descricao}</p>}

              <div className="mt-10 flex flex-wrap gap-6 text-sm">
                <MetaItem icon={User} label="Responsável" value={anyL.responsavel?.nome ?? anyL.responsavel?.email ?? "—"} />
                <MetaItem
                  icon={CalendarClock}
                  label="Prazo"
                  value={anyL.data_prevista ? new Date(anyL.data_prevista).toLocaleDateString("pt-BR") : "—"}
                />
                <MetaItem icon={Package} label="Produto" value={first?.produto?.nome ?? "—"} />
              </div>
            </div>

            {/* PDV READY panel */}
            <PdvReadyPanel lancamentoId={id} ready={anyL.pdv_ready} progresso={progressoGlobal} onChanged={invalidate} />
          </div>
        </div>
      </section>

      {/* STICKY SUB-NAV */}
      <nav className="sticky top-0 z-20 border-b border-neutral-200 bg-background/95 backdrop-blur">
        <div className="container-page flex gap-1 overflow-x-auto py-2">
          {sections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-neutral-100 hover:text-foreground"
            >
              <sec.icon className="h-3.5 w-3.5" />
              {sec.label}
            </a>
          ))}
          <div className="ml-auto flex items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => excluir.mutate()}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </nav>

      <div className="container-page py-12 space-y-16">
        {/* RESUMO */}
        <Section id="resumo" icon={Sparkles} title="Resumo do Projeto">
          <div className="grid gap-5 md:grid-cols-4">
            <StatCard icon={ListChecks} label="Checklist" value={`${checklistFeitos}/${checklistTotal}`} accent="text-indigo-600" progress={checklistPct} />
            <StatCard icon={Factory} label="Produção" value={etapaMap[anyL.producao_status]?.l ?? "—"} accent="text-amber-600" />
            <StatCard icon={ClipboardCheck} label="Aprovação" value={etapaMap[anyL.aprovacao_status]?.l ?? "—"} accent="text-emerald-600" />
            <StatCard icon={Truck} label="Implantação" value={etapaMap[anyL.implantacao_status]?.l ?? "—"} accent="text-blue-600" />
          </div>
          <div className="grid gap-5 md:grid-cols-3 mt-5">
            <StatCard icon={Boxes} label="Materiais totais" value={String(anyL.materiais.length)} accent="text-neutral-700" />
            <StatCard icon={FileText} label="Briefings" value={String(anyL.briefings.length)} accent="text-neutral-700" />
            <StatCard icon={MessageSquare} label="Comentários" value={String(anyL.comentarios.length)} accent="text-neutral-700" />
          </div>
        </Section>

        {/* PRODUTO */}
        <Section id="produto" icon={Package} title="Produto">
          {first?.produto ? (
            <Link to="/base-mestre/produtos/$id" params={{ id: first.produto.id }} className="group block">
              <Card className="overflow-hidden hover:shadow-xl hover:border-primary/40 transition">
                <div className="grid md:grid-cols-[minmax(0,1fr)_1.2fr]">
                  <div className="aspect-square md:aspect-auto bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
                    {heroImg ? (
                      <img src={heroImg} alt={first.produto.nome} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-24 w-24 text-neutral-400" /></div>
                    )}
                  </div>
                  <div className="p-8 md:p-10">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      {first.produto.linha?.nome ?? "Produto"} {first.produto.categoria?.nome ? `· ${first.produto.categoria.nome}` : ""}
                    </p>
                    <h3 className="text-3xl font-semibold tracking-tight group-hover:text-primary">{first.produto.nome}</h3>
                    <p className="mt-2 text-sm text-muted-foreground font-mono">{first.produto.codigo_jbl ?? first.produto.sku}</p>
                    {first.produto.descricao_curta && (
                      <p className="mt-6 text-base leading-relaxed text-muted-foreground">{first.produto.descricao_curta}</p>
                    )}
                    <div className="mt-8 flex items-center gap-2 text-sm text-primary group-hover:gap-3 transition-all">
                      Ver ficha completa do produto →
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ) : <EmptyCard text="Nenhum produto vinculado." />}
        </Section>

        {/* CRONOGRAMA */}
        <Section id="cronograma" icon={CalendarClock} title="Cronograma">
          <div className="grid gap-6 md:grid-cols-3">
            <TimelineCard icon={Sparkles} label="Criado em" value={new Date(anyL.created_at).toLocaleDateString("pt-BR")} tone="neutral" />
            <TimelineCard icon={CalendarClock} label="Prazo previsto" value={anyL.data_prevista ? new Date(anyL.data_prevista).toLocaleDateString("pt-BR") : "—"} tone="amber" />
            <TimelineCard icon={Rocket} label="Lançamento" value={anyL.data_lancamento ? new Date(anyL.data_lancamento).toLocaleDateString("pt-BR") : "—"} tone="primary" />
          </div>
        </Section>

        {/* CHECKLIST */}
        <Section id="checklist" icon={ListChecks} title="Checklist" right={
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{checklistFeitos}</span> de {checklistTotal} · {checklistPct}%
          </div>
        }>
          <Card>
            <CardContent className="pt-6 space-y-4">
              {checklistTotal > 0 && <Progress value={checklistPct} className="h-2" />}
              {anyL.checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum item no checklist ainda.</p>
              ) : (
                <ul className="space-y-1">
                  {anyL.checklist.map((c) => (
                    <ChecklistRow key={c.id} item={c} onChanged={invalidate} />
                  ))}
                </ul>
              )}
              <ChecklistAdder lancamentoId={id} onAdded={invalidate} />
            </CardContent>
          </Card>
        </Section>

        {/* MATERIAIS */}
        <Section id="materiais" icon={Boxes} title="Materiais">
          <div className="space-y-8">
            <MaterialGroup
              icon={Boxes}
              tone="neutral"
              titulo="Materiais Existentes"
              descricao="Materiais já cadastrados na Base Mestre e reutilizados neste lançamento."
              itens={materiaisExistentes}
              lancamentoId={id}
              categoria="existente"
              onChanged={invalidate}
            />
            <MateriaisObrigatoriosPanel
              lancamentoId={id}
              itens={materiaisObrig as never}
              onChanged={invalidate}
            />
            <MateriaisEspeciaisPanel lancamentoId={id} />
          </div>
        </Section>

        {/* BRIEFINGS */}
        <Section id="briefings" icon={FileText} title="Briefings" right={<BriefingAdder lancamentoId={id} onAdded={invalidate} />}>
          {anyL.briefings.length === 0 ? (
            <EmptyCard text="Nenhum briefing criado. Registre objetivos, público-alvo e mensagens-chave." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {anyL.briefings.map((b) => (
                <Card key={b.id} className="hover:border-primary/40 transition">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{b.titulo}</CardTitle>
                      <Badge variant="outline" className="capitalize">{b.status.replaceAll("_", " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {b.objetivo && <BriefLine label="Objetivo" text={b.objetivo} />}
                    {b.publico_alvo && <BriefLine label="Público-alvo" text={b.publico_alvo} />}
                    {b.mensagem_chave && <BriefLine label="Mensagem-chave" text={b.mensagem_chave} />}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {/* ARQUIVOS */}
        <Section id="arquivos" icon={Paperclip} title="Arquivos">
          {anyL.arquivos.length === 0 ? (
            <EmptyCard text="Nenhum arquivo vinculado ainda." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {anyL.arquivos.map((av) => av.arquivo && (
                <Card key={av.id} className="hover:border-primary/40 transition">
                  <CardContent className="pt-5 flex items-start gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-lg bg-primary/10 grid place-items-center text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{av.arquivo.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {av.arquivo.mime_type ?? "arquivo"} · {formatBytes(av.arquivo.tamanho_bytes)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {/* COMENTÁRIOS */}
        <Section id="comentarios" icon={MessageSquare} title="Comentários">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <ComentarioComposer lancamentoId={id} onSent={invalidate} />
              <Separator />
              {anyL.comentarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há comentários. Seja o primeiro a compartilhar uma atualização.</p>
              ) : (
                <ul className="space-y-5">
                  {anyL.comentarios.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-200 grid place-items-center text-xs font-medium">
                        {(c.autor?.nome ?? c.autor?.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{c.autor?.nome ?? c.autor?.email ?? "Usuário"}</span>
                          <span className="text-muted-foreground">· {new Date(c.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        <p className="mt-1 text-sm whitespace-pre-wrap">{c.corpo}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </Section>

        {/* ETAPAS */}
        <div className="grid gap-6 md:grid-cols-3">
          <EtapaCard
            id="producao"
            icon={Factory}
            title="Produção"
            status={anyL.producao_status}
            nota={anyL.producao_nota}
            lancamentoId={id}
            field="producao"
            onChanged={invalidate}
          />
          <EtapaCard
            id="aprovacao"
            icon={ClipboardCheck}
            title="Aprovação"
            status={anyL.aprovacao_status}
            nota={anyL.aprovacao_nota}
            lancamentoId={id}
            field="aprovacao"
            onChanged={invalidate}
          />
          <EtapaCard
            id="implantacao"
            icon={Truck}
            title="Implantação"
            status={anyL.implantacao_status}
            nota={anyL.implantacao_nota}
            lancamentoId={id}
            field="implantacao"
            onChanged={invalidate}
          />
        </div>

        {/* AJUSTES BÁSICOS */}
        <LancamentoQuickEdit lancamento={anyL} onSaved={invalidate} />
      </div>
    </>
  );
}

/* ============ SUBCOMPONENTS ============ */

function MetaItem({ icon: Icon, label, value }: { icon: typeof Rocket; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-white/10 grid place-items-center">
        <Icon className="h-4 w-4 text-white/80" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/50">{label}</p>
        <p className="text-sm font-medium truncate max-w-[220px]">{value}</p>
      </div>
    </div>
  );
}

function PdvReadyPanel({ lancamentoId, ready, progresso, onChanged }: { lancamentoId: string; ready: boolean; progresso: number; onChanged: () => void }) {
  const fn = useServerFn(atualizarEtapas);
  const mut = useMutation({
    mutationFn: (v: boolean) => fn({ data: { id: lancamentoId, pdv_ready: v } }),
    onSuccess: (_d, v) => { toast.success(v ? "Marcado como PDV Ready" : "PDV Ready removido"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-8 ${ready ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 to-emerald-700/20" : "border-white/15 bg-white/5"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Indicador</p>
          <h3 className="mt-1 text-2xl font-semibold">PDV READY</h3>
        </div>
        {ready ? (
          <div className="h-14 w-14 rounded-2xl bg-emerald-500 grid place-items-center shadow-lg shadow-emerald-500/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
        ) : (
          <div className="h-14 w-14 rounded-2xl bg-white/10 grid place-items-center">
            <ShieldAlert className="h-7 w-7 text-white/70" />
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-white/60">Progresso geral</span>
          <span className="text-2xl font-semibold tabular-nums">{progresso}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <Button
        onClick={() => mut.mutate(!ready)}
        disabled={mut.isPending}
        variant={ready ? "secondary" : "default"}
        className="mt-6 w-full"
      >
        {ready ? "Desmarcar PDV Ready" : "Marcar como PDV Ready"}
      </Button>
    </div>
  );
}

function Section({ id, icon: Icon, title, right, children }: { id: string; icon: typeof Rocket; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, accent, progress }: { icon: typeof Rocket; label: string; value: string; accent: string; progress?: number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <p className="text-2xl font-semibold truncate">{value}</p>
        {typeof progress === "number" && <Progress value={progress} className="mt-3 h-1.5" />}
      </CardContent>
    </Card>
  );
}

function TimelineCard({ icon: Icon, label, value, tone }: { icon: typeof Rocket; label: string; value: string; tone: "neutral" | "amber" | "primary" }) {
  const cls = tone === "primary" ? "from-primary/10 to-primary/5 text-primary" :
              tone === "amber" ? "from-amber-500/10 to-amber-500/5 text-amber-600" :
              "from-neutral-500/10 to-neutral-500/5 text-neutral-700";
  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-br ${cls} p-6`}>
        <Icon className="h-8 w-8 mb-3" />
        <p className="text-xs uppercase tracking-widest opacity-70">{label}</p>
        <p className="text-2xl font-semibold mt-1 text-foreground">{value}</p>
      </div>
    </Card>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{text}</CardContent></Card>
  );
}

function ChecklistRow({ item, onChanged }: { item: { id: string; titulo: string; feito: boolean }; onChanged: () => void }) {
  const toggleFn = useServerFn(alternarChecklistItem);
  const removeFn = useServerFn(removerChecklistItem);
  const toggle = useMutation({ mutationFn: () => toggleFn({ data: { id: item.id, feito: !item.feito } }), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: () => removeFn({ data: { id: item.id } }), onSuccess: onChanged });
  return (
    <li className="group flex items-center gap-3 py-2 rounded-lg hover:bg-neutral-50 -mx-2 px-2 transition">
      <Checkbox checked={item.feito} onCheckedChange={() => toggle.mutate()} />
      <span className={`flex-1 text-sm ${item.feito ? "line-through text-muted-foreground" : ""}`}>{item.titulo}</span>
      <button
        onClick={() => remove.mutate()}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition"
        aria-label="Remover"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function ChecklistAdder({ lancamentoId, onAdded }: { lancamentoId: string; onAdded: () => void }) {
  const [titulo, setTitulo] = useState("");
  const addFn = useServerFn(adicionarChecklistItem);
  const add = useMutation({
    mutationFn: () => addFn({ data: { lancamento_id: lancamentoId, titulo, categoria: "geral" } }),
    onSuccess: () => { setTitulo(""); onAdded(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex gap-2 pt-2">
      <Input placeholder="Adicionar item ao checklist..." value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && titulo.trim()) add.mutate(); }} />
      <Button onClick={() => titulo.trim() && add.mutate()} disabled={!titulo.trim() || add.isPending} className="gap-2"><Plus className="h-4 w-4" /> Adicionar</Button>
    </div>
  );
}

function MaterialGroup({
  icon: Icon, tone, titulo, descricao, itens, lancamentoId, categoria, onChanged,
}: {
  icon: typeof Rocket;
  tone: "neutral" | "amber" | "primary";
  titulo: string;
  descricao: string;
  itens: Array<{ id: string; quantidade: number; material: { id: string; codigo: string; nome: string; tipo: string | null; status: string; imagem_principal_url: string | null; fornecedor: { nome: string } | null } | null }>;
  lancamentoId: string;
  categoria: "existente" | "obrigatorio" | "especial";
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<string>("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const { data: disponiveis = [] } = useQuery({ queryKey: ["materiais-disponiveis"], queryFn: () => listarMateriaisDisponiveis() });
  const vincularFn = useServerFn(vincularMaterial);
  const desvFn = useServerFn(desvincularMaterial);
  const vincular = useMutation({
    mutationFn: () => vincularFn({ data: { lancamento_id: lancamentoId, material_id: selecionado, categoria, quantidade } }),
    onSuccess: () => { toast.success("Material vinculado"); setOpen(false); setSelecionado(""); setQuantidade(1); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const desvincular = useMutation({ mutationFn: (id: string) => desvFn({ data: { id } }), onSuccess: () => { toast.success("Removido"); onChanged(); } });

  const toneClasses = tone === "primary" ? "bg-primary/10 text-primary" : tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-700";

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className={`h-11 w-11 rounded-xl grid place-items-center ${toneClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{titulo} <span className="text-muted-foreground font-normal">· {itens.length}</span></h3>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Adicionar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar material · {titulo}</DialogTitle>
              <DialogDescription>Selecione um material da Biblioteca de Materiais.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Material</Label>
                <Select value={selecionado} onValueChange={setSelecionado}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {disponiveis.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome} · {m.codigo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value) || 1)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => selecionado && vincular.mutate()} disabled={!selecionado || vincular.isPending}>Vincular</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {itens.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum material nesta categoria.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {itens.map((mv) => mv.material && (
            <Card key={mv.id} className="group overflow-hidden hover:shadow-lg hover:border-primary/40 transition">
              <div className="aspect-square bg-neutral-100 overflow-hidden relative">
                {mv.material.imagem_principal_url ? (
                  <img src={mv.material.imagem_principal_url} alt={mv.material.nome} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Boxes className="h-14 w-14 text-neutral-300" /></div>
                )}
                {mv.quantidade > 1 && (
                  <div className="absolute top-2 right-2 h-8 min-w-[2rem] rounded-full bg-neutral-900 text-white text-xs font-semibold px-2 grid place-items-center">×{mv.quantidade}</div>
                )}
              </div>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground truncate">{mv.material.codigo}</p>
                <Link to="/base-mestre/materiais/$id" params={{ id: mv.material.id }} className="block text-sm font-medium line-clamp-2 hover:text-primary mt-0.5">{mv.material.nome}</Link>
                <div className="mt-3 flex items-center justify-between">
                  {mv.material.tipo && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{mv.material.tipo}</span>}
                  <button onClick={() => desvincular.mutate(mv.id)} className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BriefingAdder({ lancamentoId, onAdded }: { lancamentoId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ titulo: "", objetivo: "", publico_alvo: "", mensagem_chave: "" });
  const fn = useServerFn(criarBriefingRapido);
  const mut = useMutation({
    mutationFn: () => fn({ data: { lancamento_id: lancamentoId, ...f } }),
    onSuccess: () => { toast.success("Briefing criado"); onAdded(); setOpen(false); setF({ titulo: "", objetivo: "", publico_alvo: "", mensagem_chave: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Novo briefing</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo briefing</DialogTitle>
          <DialogDescription>Registre objetivos, público-alvo e mensagem-chave.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
          <Textarea rows={2} placeholder="Objetivo" value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} />
          <Textarea rows={2} placeholder="Público-alvo" value={f.publico_alvo} onChange={(e) => setF({ ...f, publico_alvo: e.target.value })} />
          <Textarea rows={2} placeholder="Mensagem-chave" value={f.mensagem_chave} onChange={(e) => setF({ ...f, mensagem_chave: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => f.titulo.trim() && mut.mutate()} disabled={!f.titulo.trim() || mut.isPending}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BriefLine({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function ComentarioComposer({ lancamentoId, onSent }: { lancamentoId: string; onSent: () => void }) {
  const [corpo, setCorpo] = useState("");
  const fn = useServerFn(adicionarComentario);
  const mut = useMutation({
    mutationFn: () => fn({ data: { lancamento_id: lancamentoId, corpo } }),
    onSuccess: () => { toast.success("Comentário publicado"); setCorpo(""); onSent(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <Textarea rows={3} placeholder="Escreva uma atualização, dúvida ou observação..." value={corpo} onChange={(e) => setCorpo(e.target.value)} />
      <div className="flex justify-end">
        <Button onClick={() => corpo.trim() && mut.mutate()} disabled={!corpo.trim() || mut.isPending} className="gap-2">
          <Send className="h-4 w-4" /> Publicar
        </Button>
      </div>
    </div>
  );
}

function EtapaCard({ id, icon: Icon, title, status, nota, lancamentoId, field, onChanged }: {
  id: string;
  icon: typeof Rocket;
  title: string;
  status: string;
  nota: string | null;
  lancamentoId: string;
  field: "producao" | "aprovacao" | "implantacao";
  onChanged: () => void;
}) {
  const [notaLocal, setNotaLocal] = useState(nota ?? "");
  const fn = useServerFn(atualizarEtapas);
  const salvar = useMutation({
    mutationFn: (patch: Record<string, unknown>) => fn({ data: { id: lancamentoId, ...patch } }),
    onSuccess: () => { toast.success(`${title} atualizada`); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const tone = etapaMap[status] ?? etapaMap.pendente;

  return (
    <section id={id} className="scroll-mt-20">
      <Card className="overflow-hidden">
        <div className={`px-6 py-5 border-b flex items-center justify-between ${tone.cls}`}>
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <h3 className="font-semibold">{title}</h3>
          </div>
          <span className="text-xs font-medium uppercase tracking-wider">{tone.l}</span>
        </div>
        <CardContent className="pt-5 space-y-4">
          <Select
            value={status}
            onValueChange={(v) => salvar.mutate({ [`${field}_status`]: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            rows={3}
            placeholder={`Observações sobre ${title.toLowerCase()}...`}
            value={notaLocal}
            onChange={(e) => setNotaLocal(e.target.value)}
            onBlur={() => notaLocal !== (nota ?? "") && salvar.mutate({ [`${field}_nota`]: notaLocal || null })}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function LancamentoQuickEdit({ lancamento, onSaved }: {
  lancamento: { id: string; nome: string; descricao: string | null; status: string; data_prevista: string | null; data_lancamento: string | null; campanha: { id: string } | null; responsavel: { id: string } | null };
  onSaved: () => void;
}) {
  const { data: campanhas = [] } = useQuery({ queryKey: ["campanhas"], queryFn: () => listarCampanhas() });
  const { data: responsaveis = [] } = useQuery({ queryKey: ["responsaveis"], queryFn: () => listarResponsaveis() });
  const [f, setF] = useState({
    nome: lancamento.nome,
    descricao: lancamento.descricao ?? "",
    status: lancamento.status,
    data_prevista: lancamento.data_prevista ?? "",
    data_lancamento: lancamento.data_lancamento ?? "",
    campanha_id: lancamento.campanha?.id ?? "",
    responsavel_id: lancamento.responsavel?.id ?? "",
  });
  const fn = useServerFn(atualizarLancamento);
  const salvar = useMutation({
    mutationFn: () => fn({
      data: {
        id: lancamento.id,
        dados: {
          nome: f.nome,
          descricao: f.descricao || null,
          status: f.status as "planejado",
          data_prevista: f.data_prevista || null,
          data_lancamento: f.data_lancamento || null,
          campanha_id: f.campanha_id || null,
          responsavel_id: f.responsavel_id || null,
        },
      },
    }),
    onSuccess: () => { toast.success("Salvo"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ajustes rápidos</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label>Nome</Label>
          <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label>Descrição</Label>
          <Textarea rows={2} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Campanha</Label>
          <Select value={f.campanha_id} onValueChange={(v) => setF({ ...f, campanha_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {campanhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Responsável</Label>
          <Select value={f.responsavel_id} onValueChange={(v) => setF({ ...f, responsavel_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome ?? r.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Prazo previsto</Label>
          <Input type="date" value={f.data_prevista} onChange={(e) => setF({ ...f, data_prevista: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Data de lançamento</Label>
          <Input type="date" value={f.data_lancamento} onChange={(e) => setF({ ...f, data_lancamento: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="planejado">Planejado</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="lancado">Lançado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar alterações</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatBytes(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
