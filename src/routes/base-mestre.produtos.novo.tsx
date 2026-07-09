import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Package, Image as ImageIcon, FileText, Video,
  Upload, X, Star, Plus, Sparkles, Layers, Search, Loader2, Trash2, GripVertical,
  Info, ListChecks, ClipboardCheck, Rocket, RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import { supabase } from "@/integrations/supabase/client";
import {
  criarProduto, adicionarImagem, adicionarVideo, adicionarDocumento,
} from "@/lib/produtos.functions";
import { vincularCompatibilidade } from "@/lib/compatibilidades.functions";
import { listarLinhas } from "@/lib/linhas.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import { listarFamilias } from "@/lib/familias.functions";
import { listarMateriais } from "@/lib/materiais.functions";

export const Route = createFileRoute("/base-mestre/produtos/novo")({
  head: () => ({
    meta: [
      { title: "Novo produto — JBL Trade Hub" },
      { name: "description", content: "Cadastre um novo produto passo a passo com imagens, materiais compatíveis e documentos." },
    ],
  }),
  component: NovoProdutoWizard,
});

// ---------- Types ----------
type Marca = "JBL" | "Harman Kardon" | "AKG" | "Mark Levinson" | "Infinity" | "Revel";
type StatusProd = "em_desenvolvimento" | "lancamento" | "ativo" | "descontinuado";
type Posicion = "entrada" | "intermediario" | "premium" | "hero";
type Tamanho = "P" | "M" | "G";

interface UploadItem {
  id: string;
  storage_path: string;
  url_local: string;
  nome: string;
  tipo: "imagem" | "video" | "documento";
  mime: string;
  tamanho: number;
  legenda?: string;
  tags?: string;
  principal?: boolean;
}

interface Dados {
  nome: string;
  codigo_jbl: string;
  sku: string;
  marca: Marca | "";
  categoria_id: string;
  familia_id: string;
  linha_id: string;
  posicionamento: Posicion | "";
  campanha_tamanho: Tamanho | "";
  status: StatusProd;
  hero_product: boolean;
  descricao_curta: string;
  descricao: string;
  features: string[];
  diferenciais: string;
  publico: string;
  observacoes: string;
}

const STEPS = [
  { n: 1, titulo: "Informações Gerais", icon: Info, hint: "Nome, marca, categoria" },
  { n: 2, titulo: "Mídia", icon: ImageIcon, hint: "Imagens e vídeos" },
  { n: 3, titulo: "Descrição", icon: Sparkles, hint: "Features e benefícios" },
  { n: 4, titulo: "Materiais Compatíveis", icon: Layers, hint: "PDV que combinam" },
  { n: 5, titulo: "Documentos", icon: FileText, hint: "PDF, guidelines" },
  { n: 6, titulo: "Revisão", icon: ClipboardCheck, hint: "Confirmar e salvar" },
] as const;

const MARCAS: Marca[] = ["JBL", "Harman Kardon", "AKG", "Mark Levinson", "Infinity", "Revel"];

const STATUS_LABEL: Record<StatusProd, { label: string; className: string }> = {
  em_desenvolvimento: { label: "Em desenvolvimento", className: "bg-amber-100 text-amber-800" },
  lancamento: { label: "Lançamento", className: "bg-blue-100 text-blue-800" },
  ativo: { label: "Ativo", className: "bg-emerald-100 text-emerald-800" },
  descontinuado: { label: "Descontinuado", className: "bg-rose-100 text-rose-800" },
};

const POSICION_LABEL: Record<Posicion, string> = {
  entrada: "Entrada",
  intermediario: "Intermediário",
  premium: "Premium",
  hero: "Hero",
};

function slugifySku(nome: string): string {
  const base = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return base ? `JBL-${base.slice(0, 40)}`.toUpperCase() : "";
}

function detectarTipo(file: File): UploadItem["tipo"] {
  if (file.type.startsWith("image/") || /\.(svg|heic)$/i.test(file.name)) return "imagem";
  if (file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name)) return "video";
  return "documento";
}

function bucketPara(tipo: UploadItem["tipo"]): string {
  if (tipo === "imagem") return "produtos";
  if (tipo === "video") return "produtos-videos";
  return "produtos-documentos";
}

function ext(nome: string): string {
  return nome.split(".").pop()?.toLowerCase() ?? "bin";
}

// ---------- Wizard ----------
function NovoProdutoWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [wizardId] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(1);
  const [dados, setDados] = useState<Dados>({
    nome: "", codigo_jbl: "", sku: "", marca: "JBL",
    categoria_id: "", familia_id: "", linha_id: "",
    posicionamento: "", campanha_tamanho: "", status: "em_desenvolvimento",
    hero_product: false,
    descricao_curta: "", descricao: "", features: [],
    diferenciais: "", publico: "", observacoes: "",
  });
  const [midias, setMidias] = useState<UploadItem[]>([]);
  const [docs, setDocs] = useState<UploadItem[]>([]);
  const [materiaisIds, setMateriaisIds] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });
  const { data: familias = [] } = useQuery({ queryKey: ["familias"], queryFn: () => listarFamilias() });
  const { data: linhas = [] } = useQuery({ queryKey: ["linhas"], queryFn: () => listarLinhas() });
  const { data: materiais = [] } = useQuery({ queryKey: ["materiais"], queryFn: () => listarMateriais() });

  const criarFn = useServerFn(criarProduto);
  const addImgFn = useServerFn(adicionarImagem);
  const addVidFn = useServerFn(adicionarVideo);
  const addDocFn = useServerFn(adicionarDocumento);
  const vincFn = useServerFn(vincularCompatibilidade);

  const imagens = useMemo(() => midias.filter((m) => m.tipo === "imagem"), [midias]);
  const videos = useMemo(() => midias.filter((m) => m.tipo === "video"), [midias]);

  function patch(p: Partial<Dados>) {
    setDados((d) => {
      const next = { ...d, ...p };
      if (p.nome !== undefined && !d.sku) next.sku = slugifySku(p.nome);
      return next;
    });
  }

  // ---------- Step navigation ----------
  function validarStep1() {
    if (!dados.nome.trim()) { toast.error("Informe o nome do produto"); return false; }
    if (!dados.sku.trim()) { toast.error("Informe o SKU"); return false; }
    return true;
  }
  function proximo() {
    if (step === 1 && !validarStep1()) return;
    setStep((s) => Math.min(6, s + 1));
  }
  function anterior() { setStep((s) => Math.max(1, s - 1)); }

  // ---------- Upload ----------
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
        setDocs((d) => [...d, ...novos]);
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
  function removerDoc(id: string) {
    const item = docs.find((m) => m.id === id);
    if (!item) return;
    supabase.storage.from("produtos-documentos").remove([item.storage_path]).catch(() => {});
    setDocs((d) => d.filter((x) => x.id !== id));
  }
  function definirHero(id: string) {
    setMidias((m) => m.map((x) => ({ ...x, principal: x.tipo === "imagem" && x.id === id })));
  }
  function atualizarMidia(id: string, patch: Partial<UploadItem>) {
    setMidias((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
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

  // ---------- Save ----------
  const salvarProduto = useMutation({
    mutationFn: async () => {
      setSalvando(true);
      const featuresLimpo = dados.features.map((f) => f.trim()).filter(Boolean);
      const { id: produtoId } = await criarFn({
        data: {
          sku: dados.sku,
          nome: dados.nome,
          codigo_jbl: dados.codigo_jbl || null,
          marca: dados.marca || null,
          descricao_curta: dados.descricao_curta || null,
          descricao: dados.descricao || null,
          linha_id: dados.linha_id || null,
          categoria_id: dados.categoria_id || null,
          familia_id: dados.familia_id || null,
          posicionamento: (dados.posicionamento || null) as Posicion | null,
          campanha_tamanho: (dados.campanha_tamanho || null) as Tamanho | null,
          hero_product: dados.hero_product,
          features: featuresLimpo,
          diferenciais: dados.diferenciais || null,
          observacoes: [dados.publico && `Público: ${dados.publico}`, dados.observacoes].filter(Boolean).join("\n\n") || null,
          status: dados.status,
        },
      });

      // Imagens
      for (const img of imagens) {
        await addImgFn({
          data: {
            produto_id: produtoId,
            storage_path: img.storage_path,
            url_publica: img.storage_path,
            principal: !!img.principal,
            legenda: img.legenda || null,
            tipo: img.tags || null,
          },
        });
      }
      // Vídeos
      for (const v of videos) {
        await addVidFn({
          data: {
            produto_id: produtoId,
            origem: "upload",
            titulo: v.nome,
            storage_path: v.storage_path,
            url: null,
          },
        });
      }
      // Documentos
      for (const d of docs) {
        await addDocFn({
          data: {
            produto_id: produtoId,
            nome: d.nome,
            storage_path: d.storage_path,
            mime_type: d.mime || null,
            tamanho_bytes: d.tamanho,
            guideline: /guideline|brand/i.test(d.nome),
          },
        });
      }
      // Materiais
      for (const mid of materiaisIds) {
        try { await vincFn({ data: { produto_id: produtoId, material_id: mid, observacao: null } }); } catch { /* skip dup */ }
      }
      return produtoId;
    },
    onSettled: () => setSalvando(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  async function salvarE(acao: "ver" | "outro" | "lancamento") {
    if (!validarStep1()) { setStep(1); return; }
    const id = await salvarProduto.mutateAsync();
    toast.success("Produto criado com sucesso!");
    if (acao === "outro") {
      setStep(1);
      setDados({
        nome: "", codigo_jbl: "", sku: "", marca: "JBL",
        categoria_id: "", familia_id: "", linha_id: "",
        posicionamento: "", campanha_tamanho: "", status: "em_desenvolvimento",
        hero_product: false,
        descricao_curta: "", descricao: "", features: [],
        diferenciais: "", publico: "", observacoes: "",
      });
      setMidias([]); setDocs([]); setMateriaisIds([]);
    } else if (acao === "lancamento") {
      navigate({ to: "/lancamentos" });
    } else {
      navigate({ to: "/base-mestre/produtos/$id", params: { id } });
    }
  }

  const heroImg = imagens.find((i) => i.principal) ?? imagens[0];
  const categoriaSel = categorias.find((c) => c.id === dados.categoria_id);
  const linhaSel = linhas.find((l) => l.id === dados.linha_id);
  const familiaSel = familias.find((f) => f.id === dados.familia_id);
  const materiaisSel = materiais.filter((m) => materiaisIds.includes(m.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Topbar */}
      <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">+ Novo Produto</p>
              <h1 className="truncate text-lg font-semibold">{dados.nome || "Sem título"}</h1>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate({ to: "/base-mestre/produtos" })}>
            Cancelar
          </Button>
        </div>

        {/* Progress */}
        <div className="mx-auto max-w-6xl px-6 pb-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Passo {step} de 6 — <span className="font-medium text-foreground">{STEPS[step - 1].titulo}</span></span>
            <span>{Math.round((step / 6) * 100)}%</span>
          </div>
          <Progress value={(step / 6) * 100} className="h-1.5" />
          <div className="mt-4 hidden gap-2 md:grid md:grid-cols-6">
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
                    <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.titulo}</span>
                  </div>
                  <span className="pl-8 text-[11px] text-muted-foreground">{s.hint}</span>
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
            categorias={categorias} familias={familias} linhas={linhas}
          />
        )}
        {step === 2 && (
          <Step2
            midias={midias} onUpload={(f) => uploadArquivos(f)}
            onRemove={removerMidia} onHero={definirHero} onUpdate={atualizarMidia}
            onMove={moverImagem}
          />
        )}
        {step === 3 && <Step3 dados={dados} onPatch={patch} />}
        {step === 4 && (
          <Step4
            materiais={materiais} selecionados={materiaisIds}
            onToggle={(id) => setMateriaisIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])}
          />
        )}
        {step === 5 && (
          <Step5 docs={docs} onUpload={(f) => uploadArquivos(f, "documento")} onRemove={removerDoc} />
        )}
        {step === 6 && (
          <Step6
            dados={dados}
            heroUrl={heroImg?.url_local}
            imagensCount={imagens.length} videosCount={videos.length} docsCount={docs.length}
            materiaisSel={materiaisSel}
            categoria={categoriaSel?.nome} linha={linhaSel?.nome} familia={familiaSel?.nome}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Button variant="outline" onClick={anterior} disabled={step === 1 || salvando}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {step < 6 ? (
            <Button onClick={proximo}>
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={salvando} onClick={() => salvarE("outro")}>
                <RotateCcw className="mr-2 h-4 w-4" /> Salvar e adicionar outro
              </Button>
              <Button variant="outline" disabled={salvando} onClick={() => salvarE("lancamento")}>
                <Rocket className="mr-2 h-4 w-4" /> Salvar e criar lançamento
              </Button>
              <Button disabled={salvando} onClick={() => salvarE("ver")}>
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Salvar produto
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
  dados, onPatch, categorias, familias, linhas,
}: {
  dados: Dados;
  onPatch: (p: Partial<Dados>) => void;
  categorias: { id: string; nome: string }[];
  familias: { id: string; nome: string }[];
  linhas: { id: string; nome: string }[];
}) {
  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Passo 1" titulo="Informações Gerais" descricao="Comece com o essencial. Você poderá enriquecer o produto nos próximos passos." />

      <div className="grid gap-6 rounded-2xl border bg-card p-8 shadow-sm">
        <FieldBig label="Nome do produto" required>
          <Input
            value={dados.nome}
            onChange={(e) => onPatch({ nome: e.target.value })}
            placeholder="Ex.: JBL PartyBox 110"
            className="h-12 border-0 border-b bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:border-primary focus-visible:ring-0"
          />
        </FieldBig>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Código JBL">
            <Input value={dados.codigo_jbl} onChange={(e) => onPatch({ codigo_jbl: e.target.value })} placeholder="JBLPARTYBOX110BR" className="font-mono" />
          </Field>
          <Field label="SKU interno" required>
            <Input value={dados.sku} onChange={(e) => onPatch({ sku: e.target.value })} className="font-mono" />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Marca</p>
        <div className="flex flex-wrap gap-2">
          {MARCAS.map((m) => (
            <ChipButton key={m} active={dados.marca === m} onClick={() => onPatch({ marca: m })}>{m}</ChipButton>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PickerCard titulo="Categoria" valor={categorias.find((c) => c.id === dados.categoria_id)?.nome}>
          <Select value={dados.categoria_id || "__none__"} onValueChange={(v) => onPatch({ categoria_id: v === "__none__" ? "" : v })}>
            <SelectTrigger className="border-0 p-0 shadow-none focus:ring-0"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </PickerCard>
        <PickerCard titulo="Família" valor={familias.find((f) => f.id === dados.familia_id)?.nome}>
          <Select value={dados.familia_id || "__none__"} onValueChange={(v) => onPatch({ familia_id: v === "__none__" ? "" : v })}>
            <SelectTrigger className="border-0 p-0 shadow-none focus:ring-0"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {familias.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </PickerCard>
        <PickerCard titulo="Linha" valor={linhas.find((l) => l.id === dados.linha_id)?.nome}>
          <Select value={dados.linha_id || "__none__"} onValueChange={(v) => onPatch({ linha_id: v === "__none__" ? "" : v })}>
            <SelectTrigger className="border-0 p-0 shadow-none focus:ring-0"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </PickerCard>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Posicionamento</p>
        <div className="grid gap-3 sm:grid-cols-4">
          {(Object.keys(POSICION_LABEL) as Posicion[]).map((p) => (
            <SelectCard
              key={p}
              active={dados.posicionamento === p}
              onClick={() => onPatch({ posicionamento: dados.posicionamento === p ? "" : p })}
              titulo={POSICION_LABEL[p]}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Campanha sugerida</p>
          <div className="grid grid-cols-3 gap-2">
            {(["P", "M", "G"] as Tamanho[]).map((t) => (
              <SelectCard
                key={t}
                active={dados.campanha_tamanho === t}
                onClick={() => onPatch({ campanha_tamanho: dados.campanha_tamanho === t ? "" : t })}
                titulo={t}
                grande
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STATUS_LABEL) as StatusProd[]).map((s) => (
              <SelectCard
                key={s}
                active={dados.status === s}
                onClick={() => onPatch({ status: s })}
                titulo={STATUS_LABEL[s].label}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPatch({ hero_product: !dados.hero_product })}
        className={`flex w-full items-center justify-between rounded-2xl border p-6 text-left shadow-sm transition ${
          dados.hero_product ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`grid h-12 w-12 place-items-center rounded-xl ${dados.hero_product ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <Star className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Hero Product</p>
            <p className="text-sm text-muted-foreground">Destacar em vitrines, materiais e campanhas.</p>
          </div>
        </div>
        <Switch checked={dados.hero_product} onCheckedChange={(v) => onPatch({ hero_product: v })} />
      </button>
    </div>
  );
}

// ==================== STEP 2 ====================
function Step2({
  midias, onUpload, onRemove, onHero, onUpdate, onMove,
}: {
  midias: UploadItem[];
  onUpload: (f: FileList | null) => void;
  onRemove: (id: string) => void;
  onHero: (id: string) => void;
  onUpdate: (id: string, p: Partial<UploadItem>) => void;
  onMove: (from: number, to: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<UploadItem | null>(null);

  const imagens = midias.filter((m) => m.tipo === "imagem");
  const videos = midias.filter((m) => m.tipo === "video");
  const pdfs = midias.filter((m) => m.tipo === "documento");

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 2" titulo="Mídia" descricao="Arraste imagens, vídeos ou PDFs. A primeira imagem vira automaticamente a hero." />

      <div className="flex flex-wrap gap-2">
        <StatChip icon={ImageIcon} n={imagens.length} label="imagens" />
        <StatChip icon={Video} n={videos.length} label="vídeos" />
        <StatChip icon={FileText} n={pdfs.length} label="PDFs" />
      </div>

      <input
        ref={inputRef} type="file" multiple hidden
        accept=".jpg,.jpeg,.png,.webp,.heic,.svg,.mp4,.mov,.webm,.pdf"
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
        <p className="text-lg font-medium">Arraste arquivos ou clique para selecionar</p>
        <p className="mt-2 text-sm text-muted-foreground">JPG · PNG · WEBP · HEIC · SVG · Vídeos · PDF</p>
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
                  <img src={img.url_local} alt={img.legenda ?? ""} className="h-full w-full object-cover" />
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
                  <div className="absolute left-2 bottom-2 rounded-md bg-background/80 p-1 opacity-0 transition group-hover:opacity-100">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  <Input placeholder="Legenda" value={img.legenda ?? ""} onChange={(e) => onUpdate(img.id, { legenda: e.target.value })} className="h-8 text-xs" />
                  <Input placeholder="Tags (ex: fundo branco, lifestyle)" value={img.tags ?? ""} onChange={(e) => onUpdate(img.id, { tags: e.target.value })} className="h-8 text-xs" />
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

      {pdfs.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">PDFs ({pdfs.length})</p>
          <div className="grid gap-3 md:grid-cols-2">
            {pdfs.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-red-100 text-red-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{(p.tamanho / 1024).toFixed(0)} KB</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => onRemove(p.id)}><X className="h-4 w-4" /></Button>
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
function Step3({ dados, onPatch }: { dados: Dados; onPatch: (p: Partial<Dados>) => void }) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 3" titulo="Descrição" descricao="Conte a história do produto. Você pode voltar e editar a qualquer momento." />

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição curta</Label>
        <Textarea
          rows={2}
          value={dados.descricao_curta}
          onChange={(e) => onPatch({ descricao_curta: e.target.value })}
          placeholder="Uma frase de impacto que resume o produto…"
          className="mt-2 resize-none border-0 border-b bg-transparent px-0 text-lg shadow-none focus-visible:border-primary focus-visible:ring-0"
        />
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição completa</Label>
        <Textarea
          rows={8}
          value={dados.descricao}
          onChange={(e) => onPatch({ descricao: e.target.value })}
          placeholder="Fale sobre a proposta, uso, ocasiões, diferenciais técnicos…"
          className="mt-2 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <FeaturesEditor features={dados.features} onChange={(features) => onPatch({ features })} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Benefícios / diferenciais</Label>
          <Textarea rows={4} value={dados.diferenciais} onChange={(e) => onPatch({ diferenciais: e.target.value })} className="mt-2" placeholder="O que torna esse produto especial?" />
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Público</Label>
          <Textarea rows={4} value={dados.publico} onChange={(e) => onPatch({ publico: e.target.value })} className="mt-2" placeholder="Para quem esse produto foi pensado?" />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observações internas</Label>
        <Textarea rows={3} value={dados.observacoes} onChange={(e) => onPatch({ observacoes: e.target.value })} className="mt-2" placeholder="Notas internas, restrições, informações do time…" />
      </div>
    </div>
  );
}

function FeaturesEditor({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [novo, setNovo] = useState("");
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Features</p>
          <p className="text-sm text-muted-foreground">Ex.: AI Sound Boost · IP68 · 24h · Bluetooth 5.4</p>
        </div>
        <Badge variant="outline">{features.length}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {features.map((f, i) => (
          <span key={i} className="group inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
            {f}
            <button onClick={() => onChange(features.filter((_, idx) => idx !== i))} className="opacity-40 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="inline-flex items-center gap-1 rounded-full border border-dashed bg-transparent pl-2">
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && novo.trim()) {
                onChange([...features, novo.trim()]);
                setNovo("");
              }
            }}
            placeholder="Adicionar feature (Enter)"
            className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 4 ====================
type Material = { id: string; nome: string; tipo?: string | null; codigo?: string | null; imagens?: { url_assinada?: string | null; principal?: boolean }[] };

function Step4({
  materiais, selecionados, onToggle,
}: { materiais: Material[]; selecionados: string[]; onToggle: (id: string) => void }) {
  const [busca, setBusca] = useState("");
  const filtrados = materiais.filter((m) => !busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || (m.codigo ?? "").toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 4" titulo="Materiais Compatíveis" descricao="Escolha os materiais de PDV que combinam com esse produto." />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar material por nome ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-12 pl-10" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <ListChecks className="h-4 w-4" />
        <span>{selecionados.length} selecionado(s) · {filtrados.length} disponível(is)</span>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-14 text-center text-sm text-muted-foreground">
          Nenhum material cadastrado. Cadastre em Base Mestre → Materiais.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((m) => {
            const active = selecionados.includes(m.id);
            const img = m.imagens?.find((i) => i.principal) ?? m.imagens?.[0];
            return (
              <button
                key={m.id}
                onClick={() => onToggle(m.id)}
                className={`group flex items-center gap-3 rounded-2xl border p-3 text-left shadow-sm transition ${
                  active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-card hover:border-primary/50"
                }`}
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                  {img?.url_assinada
                    ? <img src={img.url_assinada} alt="" className="h-full w-full object-cover" />
                    : <Layers className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.codigo ?? m.tipo ?? "—"}</p>
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
function Step5({
  docs, onUpload, onRemove,
}: { docs: UploadItem[]; onUpload: (f: FileList | null) => void; onRemove: (id: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const grupos = [
    { key: "brand", label: "Brand Book", regex: /brand/i, className: "bg-amber-100 text-amber-800" },
    { key: "guideline", label: "Guidelines", regex: /guideline/i, className: "bg-violet-100 text-violet-800" },
    { key: "design", label: "Arquivos AI / PSD", regex: /\.(ai|psd|indd)$/i, className: "bg-fuchsia-100 text-fuchsia-800" },
    { key: "office", label: "Excel / PowerPoint", regex: /\.(xlsx?|pptx?|docx?)$/i, className: "bg-emerald-100 text-emerald-800" },
    { key: "pdf", label: "PDFs", regex: /\.pdf$/i, className: "bg-red-100 text-red-800" },
    { key: "outros", label: "Outros", regex: /.*/, className: "bg-neutral-100 text-neutral-700" },
  ];

  function categorizar(nome: string): string {
    for (const g of grupos) if (g.regex.test(nome)) return g.key;
    return "outros";
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 5" titulo="Documentos" descricao="Anexe brand books, guidelines, planilhas, apresentações — vão direto para o Asset Center." />

      <input
        ref={inputRef} type="file" multiple hidden
        accept=".pdf,.ai,.psd,.indd,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov"
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
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <p className="text-lg font-medium">Solte documentos aqui</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF · AI · PSD · DOC · XLS · PPT · MP4</p>
      </div>

      {docs.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map((d) => {
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

// ==================== STEP 6 ====================
function Step6({
  dados, heroUrl, imagensCount, videosCount, docsCount, materiaisSel, categoria, linha, familia,
}: {
  dados: Dados; heroUrl?: string;
  imagensCount: number; videosCount: number; docsCount: number;
  materiaisSel: Material[]; categoria?: string; linha?: string; familia?: string;
}) {
  const status = STATUS_LABEL[dados.status];
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Passo 6" titulo="Revisão" descricao="Confira tudo antes de salvar. Você pode voltar em qualquer passo." />

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-[280px_1fr]">
          <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 md:aspect-auto">
            {heroUrl
              ? <img src={heroUrl} alt="" className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center text-muted-foreground"><Package className="h-12 w-12" /></div>}
          </div>
          <div className="space-y-4 p-8">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{dados.marca || "—"}</p>
                <h2 className="text-3xl font-bold tracking-tight">{dados.nome || "Sem título"}</h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{dados.sku}{dados.codigo_jbl ? ` · ${dados.codigo_jbl}` : ""}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
            </div>
            {dados.descricao_curta && <p className="text-muted-foreground">{dados.descricao_curta}</p>}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetaTile label="Categoria" valor={categoria ?? "—"} />
              <MetaTile label="Família" valor={familia ?? "—"} />
              <MetaTile label="Linha" valor={linha ?? "—"} />
              <MetaTile label="Posicionamento" valor={dados.posicionamento ? POSICION_LABEL[dados.posicionamento] : "—"} />
            </div>

            {dados.hero_product && (
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Star className="h-3 w-3 fill-current" /> Hero Product
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t bg-muted/30 p-6 sm:grid-cols-5">
          <StatTile icon={ImageIcon} n={imagensCount} label="Imagens" />
          <StatTile icon={Video} n={videosCount} label="Vídeos" />
          <StatTile icon={FileText} n={docsCount} label="Documentos" />
          <StatTile icon={Layers} n={materiaisSel.length} label="Materiais" />
          <StatTile icon={Sparkles} n={dados.features.length} label="Features" />
        </div>
      </div>

      {dados.features.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Features</p>
          <div className="flex flex-wrap gap-2">
            {dados.features.map((f, i) => (
              <span key={i} className="rounded-full bg-muted/40 px-3 py-1 text-sm">{f}</span>
            ))}
          </div>
        </div>
      )}

      {materiaisSel.length > 0 && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Materiais compatíveis ({materiaisSel.length})</p>
          <div className="flex flex-wrap gap-2">
            {materiaisSel.map((m) => (
              <span key={m.id} className="rounded-full border bg-background px-3 py-1 text-sm">{m.nome}</span>
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

function FieldBig({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
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

function SelectCard({ active, onClick, titulo, grande }: { active: boolean; onClick: () => void; titulo: string; grande?: boolean }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-xl border p-4 text-center transition ${
        active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "bg-card hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      <p className={`font-semibold ${grande ? "text-2xl" : "text-sm"}`}>{titulo}</p>
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
