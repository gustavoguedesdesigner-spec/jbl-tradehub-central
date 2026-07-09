import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Rocket, Search, CalendarClock, User, Package, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-lancamentos.jpg";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  listarLancamentos, criarLancamento, listarCampanhas, listarResponsaveis, listarProdutosDisponiveis,
} from "@/lib/lancamentos.functions";

const opts = queryOptions({ queryKey: ["lancamentos"], queryFn: () => listarLancamentos({ data: {} }) });

export const Route = createFileRoute("/lancamentos/")({
  head: () => ({
    meta: [
      { title: "Central de Lançamentos — JBL Trade Hub" },
      { name: "description", content: "Gestão de projetos de lançamento, campanhas e cronograma." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: LancamentosPage,
});

const statusMap: Record<string, { l: string; v: "default" | "secondary" | "outline" | "destructive" }> = {
  planejado: { l: "Planejado", v: "outline" },
  em_andamento: { l: "Em andamento", v: "secondary" },
  lancado: { l: "Lançado", v: "default" },
  cancelado: { l: "Cancelado", v: "destructive" },
};

function LancamentosPage() {
  const qc = useQueryClient();
  const { data: lancamentos } = useSuspenseQuery(opts);
  const { data: campanhas = [] } = useQuery({ queryKey: ["campanhas"], queryFn: () => listarCampanhas() });
  const { data: responsaveis = [] } = useQuery({ queryKey: ["responsaveis"], queryFn: () => listarResponsaveis() });
  const { data: produtos = [] } = useQuery({ queryKey: ["produtos-disponiveis"], queryFn: () => listarProdutosDisponiveis() });
  const criarFn = useServerFn(criarLancamento);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("__all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    produto_id: "",
    campanha_id: "",
    responsavel_id: "",
    data_prevista: "",
    status: "planejado" as const,
  });

  const filtered = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtroStatus !== "__all" && l.status !== filtroStatus) return false;
      if (busca) {
        const t = busca.toLowerCase();
        return l.nome.toLowerCase().includes(t) || (l.codigo ?? "").toLowerCase().includes(t);
      }
      return true;
    });
  }, [lancamentos, busca, filtroStatus]);

  const criarMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => criarFn({ data: payload as never }),
    onSuccess: () => {
      toast.success("Lançamento criado");
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      setOpen(false);
      setForm({ nome: "", descricao: "", produto_id: "", campanha_id: "", responsavel_id: "", data_prevista: "", status: "planejado" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.nome.trim()) return toast.error("Informe o nome do lançamento");
    if (!form.produto_id) return toast.error("Selecione um produto");
    criarMut.mutate({
      nome: form.nome,
      descricao: form.descricao || null,
      produto_id: form.produto_id,
      campanha_id: form.campanha_id || null,
      responsavel_id: form.responsavel_id || null,
      data_prevista: form.data_prevista || null,
      status: form.status,
      prioridade: 2,
    });
  };

  return (
    <>
      <PageHero
        eyebrow="Central de Lançamentos"
        title="Projetos, campanhas e cronograma"
        description="Cada lançamento é um projeto vinculado a um produto da Base Mestre, uma campanha, um responsável e um prazo."
        image={heroImg}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 bg-[#FF6B00] text-white shadow-sm hover:bg-[#E85F00]"
                >
                  <Link to="/projeto-inteligente">
                    <Sparkles className="h-4 w-4" /> Novo Projeto Inteligente
                  </Link>
                </Button>
                <DialogTrigger asChild>
                  <Button size="lg" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Cadastro Manual
                  </Button>
                </DialogTrigger>
              </div>
              <p className="max-w-[380px] text-right text-[11px] leading-snug text-muted-foreground">
                Crie automaticamente um projeto a partir de briefing, PDF, apresentação, imagens ou URL.
              </p>
            </div>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Lançamento</DialogTitle>
                <DialogDescription>
                  O lançamento utiliza um produto existente da Base Mestre. Uma página exclusiva será criada ao confirmar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do lançamento *</Label>
                  <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Lançamento Flip 7 - Campanha Verão" />
                </div>

                <div className="grid gap-2">
                  <Label>Produto *</Label>
                  <Select value={form.produto_id} onValueChange={(v) => setForm({ ...form, produto_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um produto da Base Mestre" /></SelectTrigger>
                    <SelectContent>
                      {produtos.length === 0 && <div className="p-2 text-sm text-muted-foreground">Nenhum produto cadastrado.</div>}
                      {produtos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} {p.codigo_jbl ? `· ${p.codigo_jbl}` : `· ${p.sku}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Campanha</Label>
                    <Select value={form.campanha_id} onValueChange={(v) => setForm({ ...form, campanha_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {campanhas.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Responsável</Label>
                    <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {responsaveis.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.nome ?? r.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="prazo">Prazo previsto</Label>
                    <Input id="prazo" type="date" value={form.data_prevista} onChange={(e) => setForm({ ...form, data_prevista: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
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

                <div className="grid gap-2">
                  <Label htmlFor="desc">Descrição</Label>
                  <Textarea id="desc" rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Objetivos, contexto ou observações" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={criarMut.isPending}>
                  {criarMut.isPending ? "Criando..." : "Criar Lançamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou código..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os status</SelectItem>
              <SelectItem value="planejado">Planejado</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="lancado">Lançado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Rocket className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="font-medium">Nenhum lançamento encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">Crie o primeiro projeto para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => {
              const first = l.produtos?.[0];
              const thumb = (first as unknown as { thumb_url?: string | null })?.thumb_url ?? null;
              const s = statusMap[l.status] ?? { l: l.status, v: "outline" as const };
              return (
                <Link key={l.id} to="/lancamentos/$id" params={{ id: l.id }} className="group">
                  <Card className="overflow-hidden transition hover:shadow-lg hover:border-primary/40">
                    <div className="relative aspect-[16/10] bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={first?.produto?.nome ?? ""} className="h-full w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Package className="h-16 w-16 opacity-40" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge variant={s.v}>{s.l}</Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base line-clamp-1">{l.nome}</CardTitle>
                      {first?.produto && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {first.produto.nome}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      {l.campanha && (
                        <div className="flex items-center gap-2 text-xs">
                          <Rocket className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{l.campanha.nome}</span>
                        </div>
                      )}
                      {l.responsavel && (
                        <div className="flex items-center gap-2 text-xs">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{l.responsavel.nome ?? l.responsavel.email}</span>
                        </div>
                      )}
                      {l.data_prevista && (
                        <div className="flex items-center gap-2 text-xs">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{new Date(l.data_prevista).toLocaleDateString("pt-BR")}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
