import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Wrench, Sparkles, Package as PackageIcon, RefreshCw, XCircle, CheckCircle2,
  User, Building2, CalendarClock, FileText, Loader2, ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

import {
  carregarMateriaisObrigatorios,
  atualizarMaterialLancamento,
  desvincularMaterial,
  listarResponsaveis,
  listarFornecedoresBasico,
} from "@/lib/lancamentos.functions";

type Material = {
  id: string;
  quantidade: number;
  observacao: string | null;
  categoria: string;
  acao: string;
  status: string;
  prazo: string | null;
  briefing: string | null;
  origem: string;
  responsavel: { id: string; nome: string | null; email: string | null; avatar_url: string | null } | null;
  fornecedor: { id: string; nome: string } | null;
  material: {
    id: string;
    codigo: string | null;
    nome: string;
    tipo: string | null;
    status: string;
    imagem_principal_url: string | null;
    fornecedor: { id: string; nome: string } | null;
  } | null;
};

const acaoMeta: Record<string, { l: string; cls: string; icon: typeof Wrench }> = {
  produzir: { l: "Produzir", cls: "bg-blue-50 text-blue-700 border-blue-200", icon: Wrench },
  atualizar: { l: "Atualizar", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: RefreshCw },
  nao_utilizar: { l: "Não utilizar", cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  ja_existente: { l: "Já existente", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

const statusMeta: Record<string, { l: string; cls: string }> = {
  pendente: { l: "Pendente", cls: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  em_producao: { l: "Em produção", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  em_aprovacao: { l: "Em aprovação", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  aprovado: { l: "Aprovado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  entregue: { l: "Entregue", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  bloqueado: { l: "Bloqueado", cls: "bg-red-50 text-red-700 border-red-200" },
};

export function MateriaisObrigatoriosPanel({
  lancamentoId,
  itens,
  onChanged,
}: {
  lancamentoId: string;
  itens: Material[];
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const carregarFn = useServerFn(carregarMateriaisObrigatorios);
  const carregar = useMutation({
    mutationFn: () => carregarFn({ data: { lancamento_id: lancamentoId } }),
    onSuccess: (r) => {
      if (r.total_homologados === 0) {
        toast.info("Nenhum material homologado encontrado para o produto deste lançamento.");
      } else if (r.criados === 0) {
        toast.success(`Tudo em dia — ${r.ja_existentes} materiais já estavam carregados.`);
      } else {
        toast.success(`${r.criados} materiais obrigatórios carregados automaticamente.`);
      }
      onChanged();
      qc.invalidateQueries({ queryKey: ["lancamento", lancamentoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const total = itens.length;
    const entregues = itens.filter((i) => i.status === "entregue" || i.status === "aprovado").length;
    const bloqueados = itens.filter((i) => i.status === "bloqueado").length;
    const pct = total ? Math.round((entregues / total) * 100) : 0;
    return { total, entregues, bloqueados, pct };
  }, [itens]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Materiais Obrigatórios</h3>
                <p className="mt-1 max-w-lg text-sm text-neutral-600">
                  Materiais homologados para o produto deste lançamento. Carregue automaticamente da
                  Base Mestre e defina ação, responsável, fornecedor e prazo para cada peça.
                </p>
              </div>
            </div>
            <Button
              onClick={() => carregar.mutate()}
              disabled={carregar.isPending}
              className="gap-2"
            >
              {carregar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Carregar homologados
            </Button>
          </div>

          {stats.total > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <StatMini label="Materiais" value={String(stats.total)} />
              <StatMini label="Aprovados/entregues" value={`${stats.entregues}/${stats.total}`} />
              <StatMini label="Bloqueados" value={String(stats.bloqueados)} tone={stats.bloqueados ? "red" : "neutral"} />
            </div>
          )}
          {stats.total > 0 && (
            <div className="mt-4">
              <Progress value={stats.pct} className="h-2" />
              <p className="mt-2 text-xs text-neutral-500">{stats.pct}% homologados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {itens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-full bg-neutral-100 p-4 text-neutral-500">
              <Wrench className="h-6 w-6" />
            </div>
            <p className="text-sm text-neutral-600">
              Nenhum material obrigatório carregado ainda.
            </p>
            <p className="max-w-xs text-xs text-neutral-500">
              Clique em <strong>Carregar homologados</strong> para importar automaticamente os
              materiais compatíveis com o produto deste lançamento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {itens.map((it) => (
            <MaterialObrigCard key={it.id} item={it} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "red" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "red" ? "border-red-200 bg-red-50/60" : "border-neutral-200 bg-white"}`}>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === "red" ? "text-red-700" : "text-neutral-900"}`}>{value}</p>
    </div>
  );
}

function MaterialObrigCard({ item, onChanged }: { item: Material; onChanged: () => void }) {
  const updateFn = useServerFn(atualizarMaterialLancamento);
  const removerFn = useServerFn(desvincularMaterial);
  const [editOpen, setEditOpen] = useState(false);

  const acao = acaoMeta[item.acao] ?? acaoMeta.produzir;
  const stat = statusMeta[item.status] ?? statusMeta.pendente;
  const AcaoIcon = acao.icon;

  const patch = useMutation({
    mutationFn: (p: Record<string, unknown>) => updateFn({ data: { id: item.id, patch: p as never } }),
    onSuccess: () => { toast.success("Material atualizado"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => removerFn({ data: { id: item.id } }),
    onSuccess: () => { toast.success("Material removido"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const img = item.material?.imagem_principal_url;
  const prazoLabel = item.prazo ? new Date(item.prazo).toLocaleDateString("pt-BR") : "Sem prazo";

  return (
    <Card className="overflow-hidden transition hover:border-primary/40">
      <div className="flex">
        <div className="relative h-40 w-40 shrink-0 bg-neutral-100">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={item.material?.nome ?? ""} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
          {item.origem === "auto" && (
            <Badge className="absolute left-2 top-2 gap-1 bg-white/90 text-neutral-700 hover:bg-white">
              <Sparkles className="h-3 w-3" /> Auto
            </Badge>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-wide text-neutral-500">
                {item.material?.codigo ?? "—"}
              </p>
              <CardTitle className="mt-0.5 truncate text-base">{item.material?.nome ?? "Material"}</CardTitle>
            </div>
            <Badge variant="outline" className={`shrink-0 border ${acao.cls} gap-1`}>
              <AcaoIcon className="h-3 w-3" />
              {acao.l}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="outline" className={`border ${stat.cls}`}>{stat.l}</Badge>
            <span className="inline-flex items-center gap-1 text-neutral-500">
              <CalendarClock className="h-3 w-3" /> {prazoLabel}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-neutral-600">
            <div className="col-span-2 flex items-center gap-1.5 truncate">
              <User className="h-3 w-3 text-neutral-400" />
              <span className="truncate">
                {item.responsavel?.nome ?? item.responsavel?.email ?? "Sem responsável"}
              </span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 truncate">
              <Building2 className="h-3 w-3 text-neutral-400" />
              <span className="truncate">
                {item.fornecedor?.nome ?? item.material?.fornecedor?.nome ?? "Sem fornecedor"}
              </span>
            </div>
          </dl>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
            <AcaoQuick current={item.acao} onSelect={(v) => patch.mutate({ acao: v })} />
            <div className="ml-auto flex gap-1.5">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 gap-1">
                    <FileText className="h-3.5 w-3.5" /> Detalhes
                  </Button>
                </DialogTrigger>
                <EditDialog
                  item={item}
                  onSave={(p) => { patch.mutate(p, { onSuccess: () => setEditOpen(false) }); }}
                  saving={patch.isPending}
                />
              </Dialog>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AcaoQuick({ current, onSelect }: { current: string; onSelect: (v: string) => void }) {
  const opts: Array<{ v: string; l: string }> = [
    { v: "produzir", l: "Produzir" },
    { v: "atualizar", l: "Atualizar" },
    { v: "nao_utilizar", l: "Não utilizar" },
    { v: "ja_existente", l: "Já existente" },
  ];
  return (
    <Select value={current} onValueChange={onSelect}>
      <SelectTrigger className="h-8 w-[150px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opts.map((o) => (
          <SelectItem key={o.v} value={o.v} className="text-xs">{o.l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EditDialog({
  item, onSave, saving,
}: {
  item: Material;
  onSave: (p: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const { data: responsaveis = [] } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: () => listarResponsaveis(),
  });
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-basico"],
    queryFn: () => listarFornecedoresBasico(),
  });

  const [status, setStatus] = useState(item.status);
  const [responsavelId, setResponsavelId] = useState<string>(item.responsavel?.id ?? "__none");
  const [fornecedorId, setFornecedorId] = useState<string>(item.fornecedor?.id ?? "__none");
  const [prazo, setPrazo] = useState<string>(item.prazo ?? "");
  const [briefing, setBriefing] = useState<string>(item.briefing ?? "");
  const [observacao, setObservacao] = useState<string>(item.observacao ?? "");
  const [quantidade, setQuantidade] = useState<number>(item.quantidade ?? 1);

  const save = () => {
    onSave({
      status,
      responsavel_id: responsavelId === "__none" ? null : responsavelId,
      fornecedor_id: fornecedorId === "__none" ? null : fornecedorId,
      prazo: prazo || null,
      briefing: briefing || null,
      observacao: observacao || null,
      quantidade,
    });
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <PackageIcon className="h-4 w-4" />
          {item.material?.nome ?? "Material"}
        </DialogTitle>
        <DialogDescription>
          Configure o workflow deste material obrigatório dentro do lançamento.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusMeta).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Prazo</Label>
          <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Select value={responsavelId} onValueChange={setResponsavelId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Nenhum</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.nome ?? r.email ?? r.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Fornecedor</Label>
          <Select value={fornecedorId} onValueChange={setFornecedorId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Nenhum</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Quantidade</Label>
          <Input
            type="number" min={1} value={quantidade}
            onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Briefing</Label>
          <Textarea
            rows={4} value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            placeholder="Especificações, adaptações, referências, mensagens-chave…"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Observação interna</Label>
          <Textarea
            rows={2} value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Notas rápidas do time"
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
