import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Star, Plus, ImageIcon, Pencil, Trash2, Building2, DollarSign, Sparkles,
  Loader2, Upload, PenTool, ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import {
  listarMateriaisEspeciais,
  criarMaterialEspecial,
  atualizarMaterialEspecial,
  excluirMaterialEspecial,
  homologarMaterialEspecial,
} from "@/lib/materiais-especiais.functions";
import { listarFornecedoresBasico } from "@/lib/lancamentos.functions";

type Especial = {
  id: string;
  lancamento_id: string;
  nome: string;
  objetivo: string | null;
  briefing: string | null;
  fornecedor_sugerido: string | null;
  fornecedor_id: string | null;
  fornecedor: { id: string; nome: string } | null;
  valor_estimado: number | null;
  status: string;
  observacoes: string | null;
  imagem_referencia_path: string | null;
  croqui_path: string | null;
  imagem_referencia_url: string | null;
  croqui_url: string | null;
  homologado_material_id: string | null;
};

const statusMeta: Record<string, { l: string; cls: string }> = {
  ideia: { l: "Ideia", cls: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  em_desenvolvimento: { l: "Em desenvolvimento", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  aguardando_aprovacao: { l: "Aguardando aprovação", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  aprovado: { l: "Aprovado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejeitado: { l: "Rejeitado", cls: "bg-red-50 text-red-700 border-red-200" },
  homologado: { l: "Homologado", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

const brl = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MateriaisEspeciaisPanel({ lancamentoId }: { lancamentoId: string }) {
  const qc = useQueryClient();
  const { data: itens = [], refetch, isLoading } = useQuery({
    queryKey: ["materiais-especiais", lancamentoId],
    queryFn: () => listarMateriaisEspeciais({ data: { lancamento_id: lancamentoId } }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Especial | null>(null);

  const invalidate = () => {
    void refetch();
    qc.invalidateQueries({ queryKey: ["lancamento", lancamentoId] });
  };

  return (
    <div className="space-y-6">
      <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Materiais Especiais</h3>
                <p className="mt-1 max-w-xl text-sm text-neutral-600">
                  Espaço de inovação — cadastre materiais que ainda não existem na Base Mestre.
                  Uma vez aprovados, podem ser homologados e migrar automaticamente para o catálogo oficial.
                </p>
              </div>
            </div>
            <Button
              onClick={() => { setEditing(null); setOpen(true); }}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" /> Novo material especial
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : itens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-full bg-violet-100 p-4 text-violet-600">
              <Star className="h-6 w-6" />
            </div>
            <p className="text-sm text-neutral-600">
              Nenhum material especial cadastrado.
            </p>
            <p className="max-w-xs text-xs text-neutral-500">
              Registre ideias e materiais inovadores para este lançamento.
              Eles poderão ser homologados e viram Base Mestre.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {itens.map((it) => (
            <EspecialCard
              key={it.id}
              item={it as Especial}
              onEdit={() => { setEditing(it as Especial); setOpen(true); }}
              onChanged={invalidate}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <EspecialFormDialog
          lancamentoId={lancamentoId}
          editing={editing}
          onSaved={() => { setOpen(false); setEditing(null); invalidate(); }}
        />
      </Dialog>
    </div>
  );
}

function EspecialCard({
  item, onEdit, onChanged,
}: {
  item: Especial;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const excluirFn = useServerFn(excluirMaterialEspecial);
  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { id: item.id } }),
    onSuccess: () => { toast.success("Material especial removido"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const stat = statusMeta[item.status] ?? statusMeta.ideia;
  const img = item.imagem_referencia_url;

  return (
    <Card className="overflow-hidden transition hover:border-violet-400/50 hover:shadow-lg">
      <div className="relative aspect-video w-full bg-gradient-to-br from-violet-100 to-neutral-100">
        {img ? (
          <img src={img} alt={item.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-violet-300">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}
        <Badge variant="outline" className={`absolute right-2 top-2 border ${stat.cls}`}>
          {stat.l}
        </Badge>
        {item.croqui_url && (
          <a
            href={item.croqui_url}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs text-neutral-700 backdrop-blur hover:bg-white"
          >
            <PenTool className="h-3 w-3" /> Croqui
          </a>
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{item.nome}</CardTitle>
          {item.homologado_material_id && (
            <Badge variant="outline" className="gap-1 border-violet-200 bg-violet-50 text-violet-700">
              <ShieldCheck className="h-3 w-3" /> Base Mestre
            </Badge>
          )}
        </div>
        {item.objetivo && (
          <p className="line-clamp-2 text-sm text-neutral-600">{item.objetivo}</p>
        )}
        <dl className="grid grid-cols-2 gap-y-1.5 text-xs text-neutral-600">
          <div className="col-span-2 flex items-center gap-1.5 truncate">
            <Building2 className="h-3 w-3 text-neutral-400" />
            <span className="truncate">
              {item.fornecedor?.nome ?? item.fornecedor_sugerido ?? "Fornecedor a definir"}
            </span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-neutral-400" />
            <span>{brl(item.valor_estimado)}</span>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          {!item.homologado_material_id && (
            <HomologarButton item={item} onDone={onChanged} />
          )}
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
  const homologarFn = useServerFn(homologarMaterialEspecial);
  const m = useMutation({
    mutationFn: () => homologarFn({ data: { id: item.id, codigo, tipo: tipo || null } }),
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
            Este material passará a existir oficialmente na Base Mestre e poderá ser reutilizado
            em outros lançamentos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Código na Base Mestre</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: ESP-2026-001" />
          </div>
          <div>
            <Label>Tipo (opcional)</Label>
            <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ex.: display, wobbler, banner" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={!codigo.trim() || m.isPending}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Homologar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EspecialFormDialog({
  lancamentoId, editing, onSaved,
}: {
  lancamentoId: string;
  editing: Especial | null;
  onSaved: () => void;
}) {
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-basico"],
    queryFn: () => listarFornecedoresBasico(),
  });
  const criarFn = useServerFn(criarMaterialEspecial);
  const atualizarFn = useServerFn(atualizarMaterialEspecial);

  const [nome, setNome] = useState(editing?.nome ?? "");
  const [objetivo, setObjetivo] = useState(editing?.objetivo ?? "");
  const [briefing, setBriefing] = useState(editing?.briefing ?? "");
  const [fornecedorSugerido, setFornecedorSugerido] = useState(editing?.fornecedor_sugerido ?? "");
  const [fornecedorId, setFornecedorId] = useState<string>(editing?.fornecedor_id ?? "__none");
  const [valorEstimado, setValorEstimado] = useState<string>(
    editing?.valor_estimado != null ? String(editing.valor_estimado) : "",
  );
  const [status, setStatus] = useState<string>(editing?.status ?? "ideia");
  const [observacoes, setObservacoes] = useState(editing?.observacoes ?? "");
  const [imagemPath, setImagemPath] = useState<string | null>(editing?.imagem_referencia_path ?? null);
  const [imagemUrl, setImagemUrl] = useState<string | null>(editing?.imagem_referencia_url ?? null);
  const [croquiPath, setCroquiPath] = useState<string | null>(editing?.croqui_path ?? null);
  const [croquiUrl, setCroquiUrl] = useState<string | null>(editing?.croqui_url ?? null);
  const [uploading, setUploading] = useState<"img" | "croqui" | null>(null);

  async function upload(file: File, kind: "img" | "croqui") {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `especiais/${lancamentoId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("materiais").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("materiais").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (kind === "img") { setImagemPath(path); setImagemUrl(signed?.signedUrl ?? null); }
      else { setCroquiPath(path); setCroquiUrl(signed?.signedUrl ?? null); }
      toast.success("Arquivo enviado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(null);
    }
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: nome.trim(),
        objetivo: objetivo || null,
        briefing: briefing || null,
        fornecedor_sugerido: fornecedorSugerido || null,
        fornecedor_id: fornecedorId === "__none" ? null : fornecedorId,
        valor_estimado: valorEstimado ? Number(valorEstimado) : null,
        status,
        observacoes: observacoes || null,
        imagem_referencia_path: imagemPath,
        croqui_path: croquiPath,
      };
      if (editing) {
        await atualizarFn({ data: { id: editing.id, patch: payload } });
      } else {
        await criarFn({ data: { lancamento_id: lancamentoId, ...payload } });
      }
    },
    onSuccess: () => { toast.success(editing ? "Material atualizado" : "Material especial criado"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          {editing ? "Editar Material Especial" : "Novo Material Especial"}
        </DialogTitle>
        <DialogDescription>
          Cadastre um material que ainda não existe na Base Mestre. Após aprovação, ele poderá ser homologado.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Nome *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Display Iluminado JBL Flip 7" />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Objetivo</Label>
          <Textarea rows={2} value={objetivo} onChange={(e) => setObjetivo(e.target.value)}
            placeholder="Qual o propósito deste material no PDV?" />
        </div>

        <UploadField
          label="Imagem de referência"
          icon={<Upload className="h-4 w-4" />}
          previewUrl={imagemUrl}
          previewKind="image"
          uploading={uploading === "img"}
          onFile={(f) => upload(f, "img")}
          accept="image/*"
        />
        <UploadField
          label="Croqui"
          icon={<PenTool className="h-4 w-4" />}
          previewUrl={croquiUrl}
          previewKind="image"
          uploading={uploading === "croqui"}
          onFile={(f) => upload(f, "croqui")}
          accept="image/*,application/pdf"
        />

        <div className="space-y-1.5 md:col-span-2">
          <Label>Briefing</Label>
          <Textarea rows={4} value={briefing} onChange={(e) => setBriefing(e.target.value)}
            placeholder="Especificações técnicas, materiais, dimensões, acabamentos, mensagens…" />
        </div>

        <div className="space-y-1.5">
          <Label>Fornecedor sugerido (livre)</Label>
          <Input value={fornecedorSugerido} onChange={(e) => setFornecedorSugerido(e.target.value)}
            placeholder="Ex.: Nova ideia — pesquisar" />
        </div>
        <div className="space-y-1.5">
          <Label>Fornecedor cadastrado</Label>
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
          <Label>Valor estimado (R$)</Label>
          <Input type="number" step="0.01" min="0" value={valorEstimado}
            onChange={(e) => setValorEstimado(e.target.value)} placeholder="0,00" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusMeta)
                .filter(([k]) => k !== "homologado")
                .map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.l}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Observações</Label>
          <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={() => salvar.mutate()} disabled={!nome.trim() || salvar.isPending}>
          {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function UploadField({
  label, icon, previewUrl, previewKind, uploading, onFile, accept,
}: {
  label: string;
  icon: React.ReactNode;
  previewUrl: string | null;
  previewKind: "image";
  uploading: boolean;
  onFile: (f: File) => void;
  accept: string;
}) {
  const inputId = `up-${label.replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed bg-neutral-50">
        {previewUrl && previewKind === "image" ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="text-center text-neutral-400">
            <ImageIcon className="mx-auto h-8 w-8" />
            <p className="mt-1 text-xs">Nenhum arquivo</p>
          </div>
        )}
        <label
          htmlFor={inputId}
          className="absolute bottom-2 right-2 inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/95 px-2.5 py-1.5 text-xs shadow-sm ring-1 ring-neutral-200 hover:bg-white"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
          <span>{uploading ? "Enviando…" : previewUrl ? "Trocar" : "Enviar"}</span>
        </label>
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}
