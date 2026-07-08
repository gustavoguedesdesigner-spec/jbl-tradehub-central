import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, CalendarClock, User, Rocket, Package, Pencil, Trash2, History, Save,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  obterLancamento, atualizarLancamento, excluirLancamento,
  listarCampanhas, listarResponsaveis,
} from "@/lib/lancamentos.functions";

const detailOpts = (id: string) => queryOptions({
  queryKey: ["lancamento", id],
  queryFn: () => obterLancamento({ data: { id } }),
});

export const Route = createFileRoute("/lancamentos/$id")({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData && "nome" in loaderData ? `${(loaderData as { nome: string }).nome} — Lançamento — JBL` : "Lançamento — JBL" },
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

function LancamentoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: l } = useSuspenseQuery(detailOpts(id));
  const { data: campanhas = [] } = useQuery({ queryKey: ["campanhas"], queryFn: () => listarCampanhas() });
  const { data: responsaveis = [] } = useQuery({ queryKey: ["responsaveis"], queryFn: () => listarResponsaveis() });

  const atualizarFn = useServerFn(atualizarLancamento);
  const excluirFn = useServerFn(excluirLancamento);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nome: l.nome,
    descricao: l.descricao ?? "",
    campanha_id: l.campanha_id ?? "",
    responsavel_id: l.responsavel_id ?? "",
    data_prevista: l.data_prevista ?? "",
    data_lancamento: l.data_lancamento ?? "",
    status: l.status,
  });

  const salvar = useMutation({
    mutationFn: () =>
      atualizarFn({
        data: {
          id,
          dados: {
            nome: form.nome,
            descricao: form.descricao || null,
            campanha_id: form.campanha_id || null,
            responsavel_id: form.responsavel_id || null,
            data_prevista: form.data_prevista || null,
            data_lancamento: form.data_lancamento || null,
            status: form.status,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Lançamento atualizado");
      qc.invalidateQueries({ queryKey: ["lancamento", id] });
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Lançamento removido");
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      navigate({ to: "/lancamentos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = statusMap[l.status] ?? { l: l.status, v: "outline" as const };
  const produtos = l.produtos ?? [];
  const historico = (l as unknown as { historico: Array<{ id: string; acao: string; created_at: string }> }).historico ?? [];

  // hero image from first product
  type Img = { storage_path: string; principal: boolean; url_assinada?: string | null };
  const first = produtos[0];
  const firstImgs = (first?.produto?.imagens ?? []) as unknown as Img[];
  const heroImg = firstImgs.find((i) => i.principal)?.url_assinada
    ?? firstImgs[0]?.url_assinada
    ?? null;

  return (
    <>
      {/* HERO */}
      <section className="relative border-b border-neutral-200 bg-neutral-950 text-white">
        {heroImg && (
          <div className="absolute inset-0 opacity-30">
            <img src={heroImg} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent" />
          </div>
        )}
        <div className="container-page relative py-12 md:py-16">
          <Button asChild variant="ghost" size="sm" className="mb-6 text-white/70 hover:text-white hover:bg-white/10">
            <Link to="/lancamentos"><ArrowLeft className="h-4 w-4 mr-2" /> Central de Lançamentos</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge variant={s.v}>{s.l}</Badge>
            {l.codigo && <span className="text-sm text-white/60">{l.codigo}</span>}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl">{l.nome}</h1>
          {l.descricao && <p className="mt-4 max-w-2xl text-white/70">{l.descricao}</p>}

          <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-3xl">
            <InfoTile icon={Rocket} label="Campanha" value={l.campanha?.nome} />
            <InfoTile icon={User} label="Responsável" value={l.responsavel?.nome ?? l.responsavel?.email} />
            <InfoTile
              icon={CalendarClock}
              label="Prazo"
              value={l.data_prevista ? new Date(l.data_prevista).toLocaleDateString("pt-BR") : undefined}
            />
          </div>
        </div>
      </section>

      <div className="container-page py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="produtos">Produtos ({produtos.length})</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="editar">Editar</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Produto do lançamento</CardTitle></CardHeader>
                <CardContent>
                  {first?.produto ? (
                    <Link to="/base-mestre/produtos/$id" params={{ id: first.produto.id }} className="group flex gap-5">
                      <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-200">
                        {heroImg ? (
                          <img src={heroImg} alt={first.produto.nome} className="h-full w-full object-cover transition group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center"><Package className="h-10 w-10 text-muted-foreground opacity-40" /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {(first.produto as unknown as { linha?: { nome?: string } }).linha?.nome ?? ""}
                        </p>
                        <p className="font-semibold text-lg group-hover:text-primary line-clamp-2">{first.produto.nome}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {first.produto.codigo_jbl ?? first.produto.sku}
                        </p>
                        {first.produto.descricao_curta && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{first.produto.descricao_curta}</p>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum produto vinculado.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Cronograma</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Prazo previsto" value={l.data_prevista ? new Date(l.data_prevista).toLocaleDateString("pt-BR") : "—"} />
                  <Row label="Data de lançamento" value={l.data_lancamento ? new Date(l.data_lancamento).toLocaleDateString("pt-BR") : "—"} />
                  <Separator />
                  <Row label="Última atualização" value={new Date(l.updated_at).toLocaleDateString("pt-BR")} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PRODUTOS */}
          <TabsContent value="produtos">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {produtos.map((p) => {
                const imgs = (p.produto?.imagens ?? []) as unknown as Img[];
                const img = imgs.find((i) => i.principal)?.url_assinada
                  ?? imgs[0]?.url_assinada;
                return (
                  <Link key={p.id} to="/base-mestre/produtos/$id" params={{ id: p.produto!.id }} className="group">
                    <Card className="overflow-hidden hover:shadow-lg hover:border-primary/40 transition">
                      <div className="aspect-square bg-neutral-100 overflow-hidden">
                        {img ? <img src={img} alt={p.produto?.nome ?? ""} className="h-full w-full object-cover group-hover:scale-105 transition" /> : <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-muted-foreground/40" /></div>}
                      </div>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm line-clamp-2">{p.produto?.nome}</CardTitle>
                        <p className="text-xs text-muted-foreground">{p.produto?.codigo_jbl ?? p.produto?.sku}</p>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </TabsContent>

          {/* HISTÓRICO */}
          <TabsContent value="historico">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Linha do tempo</CardTitle></CardHeader>
              <CardContent>
                {historico.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
                ) : (
                  <ol className="relative border-l border-neutral-200 space-y-6 pl-6">
                    {historico.map((h) => (
                      <li key={h.id} className="relative">
                        <span className="absolute -left-[27px] flex h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                        <p className="text-sm font-medium capitalize">{h.acao.replaceAll("_", " ")}</p>
                        <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EDITAR */}
          <TabsContent value="editar">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> Editar lançamento</CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita. O produto vinculado não será removido.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => excluir.mutate()}>Confirmar exclusão</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value }); setEditing(true); }} />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Textarea rows={3} value={form.descricao} onChange={(e) => { setForm({ ...form, descricao: e.target.value }); setEditing(true); }} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Campanha</Label>
                    <Select value={form.campanha_id} onValueChange={(v) => { setForm({ ...form, campanha_id: v }); setEditing(true); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {campanhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Responsável</Label>
                    <Select value={form.responsavel_id} onValueChange={(v) => { setForm({ ...form, responsavel_id: v }); setEditing(true); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome ?? r.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Prazo previsto</Label>
                    <Input type="date" value={form.data_prevista ?? ""} onChange={(e) => { setForm({ ...form, data_prevista: e.target.value }); setEditing(true); }} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Data de lançamento</Label>
                    <Input type="date" value={form.data_lancamento ?? ""} onChange={(e) => { setForm({ ...form, data_lancamento: e.target.value }); setEditing(true); }} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => { setForm({ ...form, status: v as typeof form.status }); setEditing(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planejado">Planejado</SelectItem>
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                        <SelectItem value="lancado">Lançado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => salvar.mutate()} disabled={!editing || salvar.isPending} className="gap-2">
                    <Save className="h-4 w-4" /> {salvar.isPending ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Rocket; label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-white/5 backdrop-blur border border-white/10 p-4">
      <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-sm font-medium truncate">{value || "—"}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
