import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Layers, Image as ImageIcon, FileText, Video,
  Upload, X, Star, Search, Loader2, Trash2, GripVertical, Info, Ruler, Package,
  Rocket, RotateCcw, ClipboardCheck, Sparkles, Boxes, FolderOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import {
  criarMaterial, adicionarImagemMaterial, adicionarDocumentoMaterial,
} from "@/lib/materiais.functions";
import { vincularCompatibilidade } from "@/lib/compatibilidades.functions";
import { vincularMaterial as vincularMaterialLancamento } from "@/lib/lancamentos.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import { listarFornecedores } from "@/lib/fornecedores.functions";
import { listarProdutos } from "@/lib/produtos.functions";
import { listarLancamentos } from "@/lib/lancamentos.functions";

export const Route = createFileRoute("/base-mestre/materiais/novo")({
  head: () => ({
    meta: [
      { title: "Novo material — JBL Trade Hub" },
      { name: "description", content: "Cadastre uma nova peça de PDV passo a passo: informações, galeria, especificações e projetos." },
    ],
  }),
  component: NovoMaterialWizard,
});

// ---------- Types ----------
type MaterialStatus = "rascunho" | "em_desenvolvimento" | "ativo" | "descontinuado";

interface UploadItem {
  id: string;
  storage_path: string;
  url_local: string;
  nome: string;
  tipo: "imagem" | "video" | "documento";
  mime: string;
  tamanho: number;
  legenda?: string;
  principal?: boolean;
}

interface Dados {
  nome: string;
  codigo: string;
  tipo: string;
  categoria_id: string;
  fornecedor_id: string;
  status: MaterialStatus;
  material_construcao: string;
  observacoes: string;
  // Specs
  dimensoes: string;
  peso: string;
  prazo_producao: string;
  valor_estimado: string;
  quantidade_minima: string;
  tipo_impressao: string;
  acabamento: string;
}

const STEPS = [
  { n: 1, titulo: "Informações Gerais", icon: Info, hint: "Nome, tipo, fornecedor" },
  { n: 2, titulo: "Galeria", icon: ImageIcon, hint: "Imagens e vídeos" },
  { n: 3, titulo: "Especificações", icon: Ruler, hint: "Dimensões e produção" },
  { n: 4, titulo: "Compatibilidade", icon: Boxes, hint: "Produtos que combinam" },
  { n: 5, titulo: "Projetos", icon: Rocket, hint: "Lançamentos vinculados" },
  { n: 6, titulo: "Arquivos", icon: FolderOpen, hint: "AI · PSD · PDF · Corte" },
  { n: 7, titulo: "Revisão", icon: ClipboardCheck, hint: "Confirmar e salvar" },
] as const;

const TIPOS: string[] = [
  "Display", "Wobbler", "Totem", "Cubo", "Banner",
  "Testeira", "Faixa", "Adesivo", "Mockup", "Ilha",
  "Ponta de gôndola", "Backlight", "Sinalizador",
];

const MATERIAIS_CONSTR: string[] = [
  "MDF", "PS", "Acrílico", "PVC", "Metal", "Tecido", "Papel", "Vinil", "Lona",
];

const STATUS_LABEL: Record<MaterialStatus, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-neutral-100 text-neutral-700" },
  em_desenvolvimento: { label: "Em desenvolvimento", className: "bg-amber-100 text-amber-800" },
  ativo: { label: "Homologado", className: "bg-emerald-100 text-emerald-800" },
  descontinuado: { label: "Descontinuado", className: "bg-rose-100 text-rose-800" },
};

function slugifyCodigo(nome: string): string {
  const base = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return base ? `MAT-${base.slice(0, 40)}`.toUpperCase() : "";
}

function detectarTipo(file: File): UploadItem["tipo"] {
  if (file.type.startsWith("image/") || /\.(svg|heic)$/i.test(file.name)) return "imagem";
  if (file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name)) return "video";
  return "documento";
}

function bucketPara(tipo: UploadItem["tipo"]): string {
  if (tipo === "imagem") return "materiais";
  return "materiais-documentos";
}

function ext(nome: string): string {
  return nome.split(".").pop()?.toLowerCase() ?? "bin";
}

// ---------- Wizard ----------
function NovoMaterialWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [wizardId] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(1);
  const [dados, setDados] = useState<Dados>({
    nome: "", codigo: "", tipo: "", categoria_id: "", fornecedor_id: "",
    status: "rascunho", material_construcao: "", observacoes: "",
    dimensoes: "", peso: "", prazo_producao: "", valor_estimado: "",
    quantidade_minima: "", tipo_impressao: "", acabamento: "",
  });
  const [midias, setMidias] = useState<UploadItem[]>([]);
  const [arquivos, setArquivos] = useState<UploadItem[]>([]);
  const [produtosIds, setProdutosIds] = useState<string[]>([]);
  const [lancamentosIds, setLancamentosIds] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });
  const { data: fornecedores = [] } = useQuery({ queryKey: ["fornecedores"], queryFn: () => listarFornecedores() });
  const { data: produtos = [] } = useQuery({ queryKey: ["produtos"], queryFn: () => listarProdutos({ data: {} }) });
  const { data: lancamentos = [] } = useQuery({ queryKey: ["lancamentos"], queryFn: () => listarLancamentos({ data: {} }) });

  const criarFn = useServerFn(criarMaterial);
  const addImgFn = useServerFn(adicionarImagemMaterial);
  const addDocFn = useServerFn(adicionarDocumentoMaterial);
  const vincCompatFn = useServerFn(vincularCompatibilidade);
  const vincLancFn = useServerFn(vincularMaterialLancamento);

  const imagens = useMemo(() => midias.filter((m) => m.tipo === "imagem"), [midias]);
  const videos = useMemo(() => midias.filter((m) => m.tipo === "video"), [midias]);

  function patch(p: Partial<Dados>) {
    setDados((d) => {
      const next = { ...d, ...p };
      if (p.nome !== undefined && !d.codigo) next.codigo = slugifyCodigo(p.nome);
      return next;
    });
  }

  function validarStep1() {
    if (!dados.nome.trim()) { toast.error("Informe o nome do material"); return false; }
    if (!dados.codigo.trim()) { toast.error("Informe o código"); return false; }
    return true;
  }
  function proximo() {
    if (step === 1 && !validarStep1()) return;
    setStep((s) => Math.min(7, s + 1));
  }
  function anterior() { setStep((s) => Math.max(1, s - 1)); }

  async function uploadArquivos(files: FileList | null, forcarTipo?: UploadItem["tipo"]) {
    if (!files || files.length === 0) return;
    const toastId = toast.loading(`Enviando ${files.length} arquivo(s)...`);
    try {
      const novos: UploadItem[] = [];
      for (const file of Array.from(files)) {
        const tipo = forcarTipo ?? detectarTipo(file);
        const bucket = bucketPara(tipo);
        const path = `_wizard/${wizardId}/${crypto.randomUUID()}.${ext(file.name)}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
        if (error) throw error;
        novos.push({
          id: crypto.randomUUID(),
          storage_path: path,
          url_local: URL.createObjectURL(file),
          nome: file.name,
          tipo, mime: file.type, tamanho: file.size,
        });
      }
      if (forcarTipo === "documento") {
        setArquivos((d) => [...d, ...novos]);
      } else {
        setMidias((m) => {
          const merged = [...m, ...novos];
          if (!merged.some((x) => x.tipo === "imagem" && x.principal)) {
            const first = merged.find((x) => x.tipo === "imagem");
            if (first) first.principal = true;
          }
          return [...merged];
        });
      }
      toast.success(`${files.length} arquivo(s) enviados`, { id: toastId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload", { id: toastId });
    }
  }

  function removerMidia(id: string) {
    const item = midias.find((m) => m.id === id);
    if (!item) return;
    supabase.storage.from(bucketPara(item.tipo)).remove([item.storage_path]).catch(() => {});
    setMidias((m) => m.filter((x) => x.id !== id));
  }
  function removerArquivo(id: string) {
    const item = arquivos.find((m) => m.id === id);
    if (!item) return;
    supabase.storage.from("materiais-documentos").remove([item.storage_path]).catch(() => {});
    setArquivos((d) => d.filter((x) => x.id !== id));
  }
  function definirHero(id: string) {
    setMidias((m) => m.map((x) => ({ ...x, principal: x.tipo === "imagem" && x.id === id })));
  }
  function moverImagem(from: number, to: number) {
    setMidias((m) => {
      const imgs = m.filter((x) => x.tipo === "imagem");
      const outros = m.filter((x) => x.tipo !== "imagem");
      const arr = [...imgs];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return [...arr, ...outros];
    });
  }

  const salvarMaterial = useMutation({
    mutationFn: async () => {
      setSalvando(true);
      const valor = dados.valor_estimado ? Number(dados.valor_estimado.replace(",", ".")) : null;
      const qtd = dados.quantidade_minima ? parseInt(dados.quantidade_minima, 10) : null;
      const { id: materialId } = await criarFn({
        data: {
          codigo: dados.codigo,
          nome: dados.nome,
          tipo: dados.tipo || null,
          categoria_id: dados.categoria_id || null,
          fornecedor_id: dados.fornecedor_id || null,
          status: dados.status,
          descricao: null,
          briefing: null,
          observacoes: dados.observacoes || null,
          dimensoes: dados.dimensoes || null,
          imagem_principal_url: null,
          material_construcao: dados.material_construcao || null,
          peso: dados.peso || null,
          prazo_producao: dados.prazo_producao || null,
          valor_estimado: valor,
          quantidade_minima: qtd,
          tipo_impressao: dados.tipo_impressao || null,
          acabamento: dados.acabamento || null,
        },
      });

      for (const img of imagens) {
        await addImgFn({
          data: {
            material_id: materialId,
            storage_path: img.storage_path,
            url_publica: null,
            legenda: img.legenda || null,
            tipo: "galeria",
            principal: !!img.principal,
          },
        });
      }
      for (const d of arquivos) {
        await addDocFn({
          data: {
            material_id: materialId,
            nome: d.nome,
            storage_path: d.storage_path,
            mime_type: d.mime || null,
            tamanho_bytes: d.tamanho,
            descricao: null,
            categoria: null,
            versao: null,
          },
        });
      }
      // Vídeos entram como documentos técnicos (não há bucket materiais-videos)
      for (const v of videos) {
        await addDocFn({
          data: {
            material_id: materialId,
            nome: v.nome,
            storage_path: v.storage_path,
            mime_type: v.mime || null,
            tamanho_bytes: v.tamanho,
            descricao: null,
            categoria: "video",
            versao: null,
          },
        });
      }
      for (const pid of produtosIds) {
        try { await vincCompatFn({ data: { produto_id: pid, material_id: materialId, observacao: null } }); } catch { /* skip */ }
      }
      for (const lid of lancamentosIds) {
        try { await vincLancFn({ data: { lancamento_id: lid, material_id: materialId, categoria: "existente", quantidade: 1, observacao: null } }); } catch { /* skip */ }
      }
      return materialId;
    },
    onSettled: () => setSalvando(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materiais"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  async function salvarE(acao: "ver" | "outro") {
    if (!validarStep1()) { setStep(1); return; }
    const id = await salvarMaterial.mutateAsync();
    toast.success("Material criado com sucesso!");
    if (acao === "outro") {
      setStep(1);
      setDados({
        nome: "", codigo: "", tipo: "", categoria_id: "", fornecedor_id: "",
        status: "rascunho", material_construcao: "", observacoes: "",
        dimensoes: "", peso: "", prazo_producao: "", valor_estimado: "",
        quantidade_minima: "", tipo_impressao: "", acabamento: "",
      });
      setMidias([]); setArquivos([]); setProdutosIds([]); setLancamentosIds([]);
    } else {
      navigate({ to: "/base-mestre/materiais/$id", params: { id } });
    }
  }

  const heroImg = imagens.find((i) => i.principal) ?? imagens[0];
  const categoriaSel = categorias.find((c) => c.id === dados.categoria_id);
  const fornecedorSel = fornecedores.find((f) => f.id === dados.fornecedor_id);
  const produtosSel = produtos.filter((p) => produtosIds.includes(p.id));
  const lancamentosSel = lancamentos.filter((l) => lancamentosIds.includes(l.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Topbar */}
      <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">+ Novo Material</p>
              <h1 className="truncate text-lg font-semibold">{dados.nome || "Sem título"}</h1>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate({ to: "/base-mestre/materiais" })}>Cancelar</Button>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Passo {step} de 7 — <span className="font-medium text-foreground">{STEPS[step - 1].titulo}</span></span>
            <span>{Math.round((step / 7) * 100)}%</span>
          </div>
          <Progress value={(step / 7) * 100} className="h-1.5" />
          <div className="mt-4 hidden gap-2 md:grid md:grid-cols-7">
            {STEPS.map((s) => {
              const active = s.n === step;
              const done = s.n < step;
              return (
                <button
                  key={s.n}
                  onClick={() => setStep(s.n)}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                    active ? "border-primary bg-primary/5" : done ? "border-emerald-200 bg-emerald-50/50" : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${
                      done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : s.n}
                    </div>
                    <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.titulo}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        {step === 1 && (
          <Step1
            dados={dados} onPatch={patch}
            categorias={categorias} fornecedores={fornecedores}
          />
        )}
        {step === 2 && (
          <Step2
            midias={midias} onUpload={(f) => uploadArquivos(f)}
            onRemove={removerMidia} onHero={definirHero}
            onMove={moverImagem}
          />
        )}
        {step === 3 && (
          <Step3 dados={dados} onPatch={patch} fornecedores={fornecedores} />
        )}
        {step === 4 && (
          <Step4
            produtos={produtos} selecionados={produtosIds}
            onToggle={(id) => setProdutosIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])}
          />
        )}
        {step === 5 && (
          <Step5
            lancamentos={lancamentos} selecionados={lancamentosIds}
            onToggle={(id) => setLancamentosIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])}
          />
        )}
        {step === 6 && (
          <Step6 arquivos={arquivos} onUpload={(f) => uploadArquivos(f, "documento")} onRemove={removerArquivo} />
        )}
        {step === 7 && (
          <Step7
            dados={dados}
            heroUrl={heroImg?.url_local}
            imagensCount={imagens.length} videosCount={videos.length} arquivosCount={arquivos.length}
            produtosSel={produtosSel} lancamentosSel={lancamentosSel}
            categoria={categoriaSel?.nome} fornecedor={fornecedorSel?.nome}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Button variant="outline" onClick={anterior} disabled={step === 1 || salvando}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {step < 7 ? (
            <Button onClick={proximo}>
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={salvando} onClick={() => salvarE("outro")}>
                <RotateCcw className="mr-2 h-4 w-4" /> Salvar e criar outro
              </Button>
              <Button disabled={salvando} onClick={() => salvarE("ver")}>
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Salvar material
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 1 ====================
function Step1({
  dados, onPatch, categorias, fornecedores,
}: {
  dados: Dados;
  onPatch: (p: Partial<Dados>) => void;
  categorias: { id: string; nome: string }[];
  fornecedores: { id: string; nome: string }[];
}) {
  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Passo 1" titulo="Informações Gerais" descricao="Comece com o essencial. Você poderá enriquecer o material nos próximos passos." />

      <div className="grid gap-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome do material <span className="ml-1 text-primary">*</span></Label>
          <Input
            value={dados.nome}
            onChange={(e) => onPatch({ nome: e.target.value })}
            placeholder="Ex.: Display de balcão Charge 6"
            className="h-12 border-0 border-b bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Código" required>
            <Input value={dados.codigo} onChange={(e) => onPatch({ codigo: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Material de construção">
            <Select value={dados.material_construcao || "__none"} onValueChange={(v) => onPatch({ material_construcao: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {MATERIAIS_CONSTR.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo de peça</p>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <ChipButton key={t} active={dados.tipo === t} onClick={() => onPatch({ tipo: dados.tipo === t ? "" : t })}>{t}</ChipButton>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PickerCard titulo="Categoria" valor={categorias.find((c) => c.id === dados.categoria_id)?.nome}>
          <Select value={dados.categoria_id || "__none__"} onValueChange={(v) => onPatch({ categoria_id: v === "__none__" ? "" : v })}>
            <SelectTrigger className="border-0 p-0 shadow-none focus:ring-0"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </PickerCard>
        <PickerCard titulo="Fornecedor" valor={fornecedores.find((f) => f.id === dados.fornecedor_id)?.nome}>
          <Select value={dados.fornecedor_id || "__none__"} onValueChange={(v) => onPatch({ fornecedor_id: v === "__none__" ? "" : v })}>
            <SelectTrigger className="border-0 p-0 shadow-none focus:ring-0"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </PickerCard>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(Object.keys(STATUS_LABEL) as MaterialStatus[]).map((s) => (
            <SelectCard key={s} active={dados.status === s} onClick={() => onPatch({ status: s })} titulo={STATUS_LABEL[s].label} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observações</Label>
        <Textarea
          rows={3}
          value={dados.observacoes}
          onChange={(e) => onPatch({ observacoes: e.target.value })}
          className="mt-2"
          placeholder="Notas internas, restrições, informações do time…"
        />
      </div>
    </div>
  );
}

// ==================== STEP 2 ====================
function Step2({
  midias, onUpload, onRemove, onHero, onMove,
}: {
  midias: UploadItem[];
  onUpload: (f: FileList | null) => void;
  onRemove: (id: string) => void;
  onHero: (id: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<UploadItem | null>(null);

  const imagens = midias.filter((m) => m.tipo === "imagem");
  const videos = midias.filter((m) => m.tipo === "video");

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 2" titulo="Galeria" descricao="Arraste imagens e vídeos. A primeira imagem vira automaticamente a hero." />

      <div className="flex flex-wrap gap-2">
        <StatChip icon={ImageIcon} n={imagens.length} label="imagens" />
        <StatChip icon={Video} n={videos.length} label="vídeos" />
      </div>

      <input
        ref={inputRef} type="file" multiple hidden
        accept=".jpg,.jpeg,.png,.webp,.heic,.svg,.mp4,.mov,.webm"
        onChange={(e) => { onUpload(e.target.files); if (inputRef.current) inputRef.current.value = ""; }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onUpload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-14 text-center transition ${
          drag ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-card hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="text-lg font-medium">Arraste imagens ou vídeos aqui</p>
        <p className="mt-2 text-sm text-muted-foreground">JPG · PNG · WEBP · HEIC · SVG · MP4 · MOV</p>
      </div>

      {imagens.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Imagens ({imagens.length})</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {imagens.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragId(img.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragId || dragId === img.id) return;
                  const from = imagens.findIndex((x) => x.id === dragId);
                  if (from >= 0) onMove(from, idx);
                  setDragId(null);
                }}
                className="group overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <div className="relative aspect-square bg-muted">
                  <img src={img.url_local} alt="" className="h-full w-full object-cover" />
                  {img.principal && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                      <Star className="h-3 w-3 fill-current" /> HERO
                    </span>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button className="rounded-md bg-background/90 p-1.5 hover:bg-background" onClick={() => setZoom(img)}>
                      <Search className="h-3.5 w-3.5" />
                    </button>
                    {!img.principal && (
                      <button className="rounded-md bg-background/90 p-1.5 hover:bg-background" onClick={() => onHero(img.id)}>
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button className="rounded-md bg-destructive/90 p-1.5 text-destructive-foreground hover:bg-destructive" onClick={() => onRemove(img.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 rounded-md bg-background/80 p-1 opacity-0 transition group-hover:opacity-100">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Vídeos ({videos.length})</p>
          <div className="grid gap-3 md:grid-cols-2">
            {videos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-700">
                  <Video className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.nome}</p>
                  <p className="text-xs text-muted-foreground">{(v.tamanho / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => onRemove(v.id)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-6" onClick={() => setZoom(null)}>
          <img src={zoom.url_local} alt="" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ==================== STEP 3 ====================
function Step3({
  dados, onPatch, fornecedores,
}: {
  dados: Dados;
  onPatch: (p: Partial<Dados>) => void;
  fornecedores: { id: string; nome: string }[];
}) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 3" titulo="Especificações" descricao="Dados técnicos e comerciais da peça — usados por produção e compras." />

      <div className="grid gap-4 md:grid-cols-2">
        <SpecCard label="Dimensões">
          <Input placeholder="Ex.: 30 × 40 × 20 cm" value={dados.dimensoes} onChange={(e) => onPatch({ dimensoes: e.target.value })} />
        </SpecCard>
        <SpecCard label="Peso">
          <Input placeholder="Ex.: 1,2 kg" value={dados.peso} onChange={(e) => onPatch({ peso: e.target.value })} />
        </SpecCard>
        <SpecCard label="Prazo de produção">
          <Input placeholder="Ex.: 15 dias úteis" value={dados.prazo_producao} onChange={(e) => onPatch({ prazo_producao: e.target.value })} />
        </SpecCard>
        <SpecCard label="Valor estimado (R$)">
          <Input inputMode="decimal" placeholder="Ex.: 89,90" value={dados.valor_estimado} onChange={(e) => onPatch({ valor_estimado: e.target.value })} />
        </SpecCard>
        <SpecCard label="Quantidade mínima">
          <Input inputMode="numeric" placeholder="Ex.: 100" value={dados.quantidade_minima} onChange={(e) => onPatch({ quantidade_minima: e.target.value })} />
        </SpecCard>
        <SpecCard label="Tipo de impressão">
          <Input placeholder="Ex.: Digital, offset, silk…" value={dados.tipo_impressao} onChange={(e) => onPatch({ tipo_impressao: e.target.value })} />
        </SpecCard>
        <SpecCard label="Acabamento">
          <Input placeholder="Ex.: Fosco, verniz, laminado…" value={dados.acabamento} onChange={(e) => onPatch({ acabamento: e.target.value })} />
        </SpecCard>
        <SpecCard label="Fornecedor">
          <Select value={dados.fornecedor_id || "__none__"} onValueChange={(v) => onPatch({ fornecedor_id: v === "__none__" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </SpecCard>
      </div>
    </div>
  );
}

// ==================== STEP 4 ====================
type ProdutoLite = { id: string; nome: string; sku?: string | null; codigo_jbl?: string | null; imagens?: { storage_path?: string | null; url_assinada?: string | null; principal?: boolean | null }[] };

function Step4({
  produtos, selecionados, onToggle,
}: { produtos: ProdutoLite[]; selecionados: string[]; onToggle: (id: string) => void }) {
  const [busca, setBusca] = useState("");
  const filtrados = produtos.filter((p) => !busca ||
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (p.codigo_jbl ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 4" titulo="Compatibilidade" descricao="Selecione os produtos JBL que este material é compatível." />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome, SKU ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-12 pl-10" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Boxes className="h-4 w-4" />
        <span>{selecionados.length} selecionado(s) · {filtrados.length} disponível(is)</span>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-14 text-center text-sm text-muted-foreground">
          Nenhum produto cadastrado. Cadastre em Base Mestre → Produtos.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => {
            const active = selecionados.includes(p.id);
            const img = p.imagens?.find((i) => i.principal) ?? p.imagens?.[0];
            return (
              <button
                key={p.id}
                onClick={() => onToggle(p.id)}
                className={`group flex items-center gap-3 rounded-2xl border p-3 text-left shadow-sm transition ${
                  active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-card hover:border-primary/50"
                }`}
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                  {img?.url_assinada
                    ? <img src={img.url_assinada} alt="" className="h-full w-full object-cover" />
                    : <Package className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.sku ?? p.codigo_jbl ?? "—"}</p>
                </div>
                <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                }`}>
                  {active && <Check className="h-3.5 w-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== STEP 5 ====================
type LancamentoLite = { id: string; nome: string; codigo?: string | null; status?: string | null; data_prevista?: string | null };

function Step5({
  lancamentos, selecionados, onToggle,
}: { lancamentos: LancamentoLite[]; selecionados: string[]; onToggle: (id: string) => void }) {
  const [busca, setBusca] = useState("");
  const filtrados = lancamentos.filter((l) => !busca ||
    l.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (l.codigo ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 5" titulo="Projetos" descricao="Vincule este material aos lançamentos onde ele será usado." />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar projeto…" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-12 pl-10" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Rocket className="h-4 w-4" />
        <span>{selecionados.length} selecionado(s) · {filtrados.length} disponível(is)</span>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-14 text-center text-sm text-muted-foreground">
          Nenhum lançamento cadastrado ainda.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtrados.map((l) => {
            const active = selecionados.includes(l.id);
            return (
              <button
                key={l.id}
                onClick={() => onToggle(l.id)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition ${
                  active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-card hover:border-primary/50"
                }`}
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Rocket className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.codigo ?? "—"}{l.status ? ` · ${l.status}` : ""}
                  </p>
                </div>
                <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                }`}>
                  {active && <Check className="h-3.5 w-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== STEP 6 ====================
function Step6({
  arquivos, onUpload, onRemove,
}: { arquivos: UploadItem[]; onUpload: (f: FileList | null) => void; onRemove: (id: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const grupos = [
    { key: "ai", label: "AI / EPS", regex: /\.(ai|eps)$/i, className: "bg-fuchsia-100 text-fuchsia-800" },
    { key: "psd", label: "PSD", regex: /\.psd$/i, className: "bg-violet-100 text-violet-800" },
    { key: "corte", label: "Faca / Corte", regex: /corte|faca|dieline/i, className: "bg-amber-100 text-amber-800" },
    { key: "manual", label: "Manual", regex: /manual|instru/i, className: "bg-emerald-100 text-emerald-800" },
    { key: "pdf", label: "PDF", regex: /\.pdf$/i, className: "bg-red-100 text-red-800" },
    { key: "fotos", label: "Fotos", regex: /\.(jpg|jpeg|png|webp)$/i, className: "bg-sky-100 text-sky-800" },
    { key: "videos", label: "Vídeos", regex: /\.(mp4|mov|webm)$/i, className: "bg-rose-100 text-rose-800" },
    { key: "outros", label: "Outros", regex: /.*/, className: "bg-neutral-100 text-neutral-700" },
  ];

  function categorizar(nome: string): string {
    for (const g of grupos) if (g.regex.test(nome)) return g.key;
    return "outros";
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 6" titulo="Arquivos" descricao="Anexe AI, PSD, PDF, faca de corte, manual, fotos ou vídeos — vão para o Asset Center." />

      <input
        ref={inputRef} type="file" multiple hidden
        accept=".ai,.eps,.psd,.pdf,.indd,.jpg,.jpeg,.png,.webp,.mp4,.mov,.zip,.doc,.docx"
        onChange={(e) => { onUpload(e.target.files); if (inputRef.current) inputRef.current.value = ""; }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onUpload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition ${
          drag ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-card hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
          <FolderOpen className="h-6 w-6 text-primary" />
        </div>
        <p className="text-lg font-medium">Solte arquivos aqui</p>
        <p className="mt-1 text-sm text-muted-foreground">AI · EPS · PSD · PDF · Faca · Fotos · Vídeos</p>
      </div>

      {arquivos.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {arquivos.map((d) => {
            const cat = categorizar(d.nome);
            const meta = grupos.find((g) => g.key === cat)!;
            return (
              <div key={d.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${meta.className}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.nome}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                    <span>{(d.tamanho / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => onRemove(d.id)}><X className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== STEP 7 ====================
function Step7({
  dados, heroUrl, imagensCount, videosCount, arquivosCount,
  produtosSel, lancamentosSel, categoria, fornecedor,
}: {
  dados: Dados; heroUrl?: string;
  imagensCount: number; videosCount: number; arquivosCount: number;
  produtosSel: ProdutoLite[]; lancamentosSel: LancamentoLite[];
  categoria?: string; fornecedor?: string;
}) {
  const status = STATUS_LABEL[dados.status];
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 7" titulo="Revisão" descricao="Confira tudo antes de salvar. Você pode voltar em qualquer passo." />

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-[320px_1fr]">
          <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 md:aspect-auto">
            {heroUrl
              ? <img src={heroUrl} alt="" className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center text-muted-foreground"><Layers className="h-12 w-12" /></div>}
          </div>
          <div className="space-y-4 p-8">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{dados.tipo || "—"}</p>
                <h2 className="text-3xl font-bold tracking-tight">{dados.nome || "Sem título"}</h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{dados.codigo}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetaTile label="Categoria" valor={categoria ?? "—"} />
              <MetaTile label="Fornecedor" valor={fornecedor ?? "—"} />
              <MetaTile label="Material" valor={dados.material_construcao || "—"} />
              <MetaTile label="Dimensões" valor={dados.dimensoes || "—"} />
              <MetaTile label="Peso" valor={dados.peso || "—"} />
              <MetaTile label="Prazo" valor={dados.prazo_producao || "—"} />
              <MetaTile label="Qtd. mínima" valor={dados.quantidade_minima || "—"} />
              <MetaTile label="Valor est." valor={dados.valor_estimado ? `R$ ${dados.valor_estimado}` : "—"} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t bg-muted/30 p-6 sm:grid-cols-5">
          <StatTile icon={ImageIcon} n={imagensCount} label="Imagens" />
          <StatTile icon={Video} n={videosCount} label="Vídeos" />
          <StatTile icon={FileText} n={arquivosCount} label="Arquivos" />
          <StatTile icon={Boxes} n={produtosSel.length} label="Produtos" />
          <StatTile icon={Rocket} n={lancamentosSel.length} label="Projetos" />
        </div>
      </div>

      {produtosSel.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Produtos compatíveis ({produtosSel.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {produtosSel.map((p) => (
              <span key={p.id} className="rounded-full border bg-background px-3 py-1 text-sm">{p.nome}</span>
            ))}
          </div>
        </div>
      )}

      {lancamentosSel.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Rocket className="h-3.5 w-3.5" /> Projetos ({lancamentosSel.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {lancamentosSel.map((l) => (
              <span key={l.id} className="rounded-full border bg-background px-3 py-1 text-sm">{l.nome}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Building blocks ====================
function SectionHeader({ eyebrow, titulo, descricao }: { eyebrow: string; titulo: string; descricao: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight">{titulo}</h2>
      <p className="text-sm text-muted-foreground">{descricao}</p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="ml-1 text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

function SelectCard({ active, onClick, titulo }: { active: boolean; onClick: () => void; titulo: string }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-xl border p-4 text-center transition ${
        active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "bg-card hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      <p className="text-sm font-semibold">{titulo}</p>
    </button>
  );
}

function PickerCard({ titulo, valor, children }: { titulo: string; valor?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-sm font-medium">{valor || <span className="text-muted-foreground">Selecionar</span>}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SpecCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StatChip({ icon: Icon, n, label }: { icon: React.ComponentType<{ className?: string }>; n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-semibold">{n}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function StatTile({ icon: Icon, n, label }: { icon: React.ComponentType<{ className?: string }>; n: number; label: string }) {
  return (
    <div className="text-center">
      <Icon className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-1 text-2xl font-bold">{n}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function MetaTile({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{valor}</p>
    </div>
  );
}
