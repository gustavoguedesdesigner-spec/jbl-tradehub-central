import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, Star, ImageIcon, Building2, DollarSign, Rocket,
  ShieldCheck, PenTool, Search, Lightbulb, TrendingUp, Trash2,
} from "lucide-react";

import { PageHero } from "@/components/layout/PageHero";
import heroImg from "@/assets/hero-materiais-especiais.jpg";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  listarTodosMateriaisEspeciais,
  excluirMaterialEspecial,
  homologarMaterialEspecial,
} from "@/lib/materiais-especiais.functions";

const opts = queryOptions({
  queryKey: ["materiais-especiais", "todos"],
  queryFn: () => listarTodosMateriaisEspeciais(),
});

export const Route = createFileRoute("/materiais-especiais")({
  head: () => ({
    meta: [
      { title: "Materiais Especiais — Inovação — JBL Trade Hub" },
      { name: "description", content: "Hub de inovação: cadastro de materiais especiais e homologação para a Base Mestre." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: MateriaisEspeciaisModulo,
});

type Especial = {
  id: string;
  lancamento_id: string;
  nome: string;
  objetivo: string | null;
  briefing: string | null;
  fornecedor_sugerido: string | null;
  fornecedor: { id: string; nome: string } | null;
  valor_estimado: number | null;
  status: string;
  observacoes: string | null;
  imagem_referencia_url: string | null;
  croqui_url: string | null;
  homologado_material_id: string | null;
  lancamento: { id: string; nome: string; codigo: string | null; status: string } | null;
  created_at: string;
};

const statusMeta: Record<string, { l: string; cls: string; dot: string }> = {
  ideia: { l: "Ideia", cls: "bg-neutral-100 text-neutral-700 border-neutral-200", dot: "bg-neutral-400" },
  em_desenvolvimento: { l: "Em desenvolvimento", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  aguardando_aprovacao: { l: "Aguardando aprovação", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  aprovado: { l: "Aprovado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejeitado: { l: "Rejeitado", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  homologado: { l: "Homologado", cls: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
};

const brl = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function MateriaisEspeciaisModulo() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(opts);
  const itens = data as unknown as Especial[];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["materiais-especiais", "todos"] });

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("__all");

  const filtered = useMemo(() => {
    return itens.filter((it) => {
      if (filtroStatus !== "__all" && it.status !== filtroStatus) return false;
      if (busca) {
        const t = busca.toLowerCase();
        return (
          it.nome.toLowerCase().includes(t) ||
          (it.objetivo ?? "").toLowerCase().includes(t) ||
          (it.lancamento?.nome ?? "").toLowerCase().includes(t) ||
          (it.fornecedor?.nome ?? it.fornecedor_sugerido ?? "").toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [itens, busca, filtroStatus]);

  const total = itens.length;
  const emDesenvolvimento = itens.filter((i) => i.status === "em_desenvolvimento" || i.status === "aguardando_aprovacao").length;
  const homologados = itens.filter((i) => i.status === "homologado").length;
  const investimento = itens.reduce((s, i) => s + (i.valor_estimado ?? 0), 0);

  return (
    <>
      <PageHero
        eyebrow="Inovação"
        title="Materiais Especiais"
        description="Hub de inovação da JBL Trade Hub. Cadastre materiais que ainda não existem na Base Mestre — cada ideia aprovada pode ser homologada e migrar automaticamente para o catálogo oficial."
      />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard icon={Lightbulb} label="Ideias no pipeline" value={String(total)} gradient="from-violet-500 to-fuchsia-500" />
          <KpiCard icon={Sparkles} label="Em desenvolvimento" value={String(emDesenvolvimento)} gradient="from-blue-500 to-cyan-500" />
          <KpiCard icon={ShieldCheck} label="Homologados" value={String(homologados)} gradient="from-emerald-500 to-teal-500" />
          <KpiCard icon={TrendingUp} label="Investimento estimado" value={brl(investimento)} gradient="from-amber-500 to-orange-500" />
        </div>

        {/* Sobre o módulo */}
        <Card className="overflow-hidden border-violet-200/60">
          <div className="grid md:grid-cols-[1fr_auto] items-center gap-6 bg-gradient-to-br from-violet-50 via-fuchsia-50/50 to-white p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center text-white shadow-lg shadow-violet-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Da ideia à Base Mestre</h3>
                <p className="mt-1 max-w-2xl text-sm text-neutral-600">
                  Materiais Especiais nascem dentro de um projeto de lançamento. Quando validados, um clique em <b>Homologar</b> cria o registro oficial em <b>Materiais de PDV</b> e o vincula ao lançamento — sem retrabalho de cadastro.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50">
              <Link to="/lancamentos">Ir para Lançamentos</Link>
            </Button>
          </div>
        </Card>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, objetivo, projeto ou fornecedor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os status</SelectItem>
              {Object.entries(statusMeta).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="rounded-full bg-violet-100 p-4 text-violet-600">
                <Star className="h-6 w-6" />
              </div>
              <p className="font-medium">Nenhum material especial encontrado</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Materiais Especiais são criados dentro de um projeto de lançamento — abra um lançamento e use a seção <b>Materiais Especiais</b>.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/lancamentos">Abrir Central de Lançamentos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((it) => (
              <EspecialCard key={it.id} item={it} onChanged={invalidate} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function KpiCard({
  icon: Icon, label, value, gradient,
}: { icon: typeof Rocket; label: string; value: string; gradient: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${gradient}`} />
      <CardContent className="relative pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${gradient} grid place-items-center text-white shadow-sm`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight tabular-nums truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

function EspecialCard({ item, onChanged }: { item: Especial; onChanged: () => void }) {
  const stat = statusMeta[item.status] ?? statusMeta.ideia;
  const excluirFn = useServerFn(excluirMaterialEspecial);
  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { id: item.id } }),
    onSuccess: () => { toast.success("Material removido"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="group overflow-hidden transition hover:border-violet-400/50 hover:shadow-xl">
      <div className="relative aspect-video w-full bg-gradient-to-br from-violet-100 via-fuchsia-50 to-neutral-100 overflow-hidden">
        {item.imagem_referencia_url ? (
          <img
            src={item.imagem_referencia_url}
            alt={item.nome}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-violet-300">
            <ImageIcon className="h-14 w-14" />
          </div>
        )}
        <Badge variant="outline" className={`absolute right-2 top-2 border ${stat.cls} shadow-sm`}>
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${stat.dot}`} />
          {stat.l}
        </Badge>
        {item.croqui_url && (
          <a
            href={item.croqui_url}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs text-neutral-700 backdrop-blur hover:bg-white shadow-sm"
          >
            <PenTool className="h-3 w-3" /> Croqui
          </a>
        )}
        {item.homologado_material_id && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-violet-900/80 to-transparent p-2 pt-8">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              <ShieldCheck className="h-3 w-3" /> Homologado na Base Mestre
            </span>
          </div>
        )}
      </div>

      <CardContent className="space-y-3 p-4">
        <CardTitle className="text-base leading-tight line-clamp-1">{item.nome}</CardTitle>
        {item.objetivo && <p className="line-clamp-2 text-sm text-neutral-600">{item.objetivo}</p>}

        <dl className="space-y-1.5 text-xs text-neutral-600">
          {item.lancamento && (
            <div className="flex items-center gap-1.5 truncate">
              <Rocket className="h-3 w-3 shrink-0 text-neutral-400" />
              <Link
                to="/lancamentos/$id"
                params={{ id: item.lancamento.id }}
                className="truncate hover:text-violet-700 hover:underline"
              >
                {item.lancamento.nome}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="h-3 w-3 shrink-0 text-neutral-400" />
            <span className="truncate">{item.fornecedor?.nome ?? item.fornecedor_sugerido ?? "Fornecedor a definir"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 shrink-0 text-neutral-400" />
            <span className="tabular-nums">{brl(item.valor_estimado)}</span>
          </div>
        </dl>

        <div className="flex items-center gap-1.5 pt-1">
          {!item.homologado_material_id && <HomologarButton item={item} onDone={onChanged} />}
          <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs">
            <Link to="/lancamentos/$id" params={{ id: item.lancamento_id }}>Abrir projeto →</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => excluir.mutate()}
            disabled={excluir.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HomologarButton({ item, onDone }: { item: Especial; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState("");
  const fn = useServerFn(homologarMaterialEspecial);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: item.id, codigo, tipo: tipo || null } }),
    onSuccess: () => {
      toast.success("Material homologado e enviado para a Base Mestre");
      setOpen(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 border-violet-300 text-violet-700 hover:bg-violet-50">
          <ShieldCheck className="h-3.5 w-3.5" /> Homologar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Homologar para a Base Mestre</DialogTitle>
          <DialogDescription>
            Este material passará a existir oficialmente em Materiais de PDV e poderá ser reutilizado em outros lançamentos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Código *</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: MAT-2026-001" />
          </div>
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ex: Display, Wobbler..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => codigo.trim() && m.mutate()} disabled={!codigo.trim() || m.isPending}>
            {m.isPending ? "Homologando..." : "Homologar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
