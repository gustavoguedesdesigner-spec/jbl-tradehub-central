import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Globe,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  FolderOpen,
  MessageSquarePlus,
  PenSquare,
  Upload,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Plus,
  Rocket,
  Wand2,
  ShieldCheck,
  ListChecks,
  Package,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import {
  analisarBriefingIA,
  criarProjetoInteligente,
  type AnaliseIA,
} from "@/lib/projeto-inteligente.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import { listarFamilias } from "@/lib/familias.functions";
import { listarLinhas } from "@/lib/linhas.functions";
import { listarMateriais } from "@/lib/materiais.functions";
import { listarCampanhas } from "@/lib/lancamentos.functions";

const auxOpts = queryOptions({
  queryKey: ["pi-aux"],
  queryFn: async () => {
    const [categorias, familias, linhas, materiais, campanhas] = await Promise.all([
      listarCategorias(),
      listarFamilias(),
      listarLinhas(),
      listarMateriais(),
      listarCampanhas(),
    ]);
    return { categorias, familias, linhas, materiais, campanhas };
  },
});

export const Route = createFileRoute("/projeto-inteligente")({
  head: () => ({
    meta: [
      { title: "Novo Projeto Inteligente — JBL Trade Hub" },
      {
        name: "description",
        content:
          "Crie automaticamente Produtos, Materiais e Projetos de Lançamento com IA — a partir de briefings, URL, PDF ou apresentações.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(auxOpts),
  component: Wizard,
});

// ============================================================
// TIPOS
// ============================================================

type Origem = "url" | "pdf" | "excel" | "ppt" | "imagens" | "pasta" | "chat" | "manual";

interface OrigemDef {
  id: Origem;
  label: string;
  descricao: string;
  icone: typeof Globe;
  cor: string;
}

const ORIGENS: OrigemDef[] = [
  { id: "url", label: "Importar de URL", descricao: "Cole o endereço de uma página de produto.", icone: Globe, cor: "bg-orange-50 text-[#FF6B00]" },
  { id: "pdf", label: "Importar PDF", descricao: "Envie um briefing ou catálogo.", icone: FileText, cor: "bg-red-50 text-red-600" },
  { id: "excel", label: "Importar Excel", descricao: "Envie planilhas e listas.", icone: FileSpreadsheet, cor: "bg-emerald-50 text-emerald-600" },
  { id: "ppt", label: "Importar PowerPoint", descricao: "Envie apresentações completas.", icone: Presentation, cor: "bg-amber-50 text-amber-600" },
  { id: "imagens", label: "Importar Imagens", descricao: "Selecione uma ou várias imagens.", icone: ImageIcon, cor: "bg-sky-50 text-sky-600" },
  { id: "pasta", label: "Importar Pasta", descricao: "Selecione uma pasta com arquivos.", icone: FolderOpen, cor: "bg-violet-50 text-violet-600" },
  { id: "chat", label: "Conversar com a IA", descricao: "Descreva o projeto em texto natural.", icone: MessageSquarePlus, cor: "bg-fuchsia-50 text-fuchsia-600" },
  { id: "manual", label: "Cadastro Manual", descricao: "Preencha manualmente cada campo.", icone: PenSquare, cor: "bg-neutral-100 text-neutral-700" },
];

const ETAPAS = ["Origem", "Importação", "Análise IA", "Revisão", "Motor Estratégico", "Resumo"];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

function Wizard() {
  const navigate = useNavigate();
  const { data: aux } = useSuspenseQuery(auxOpts);

  const [etapa, setEtapa] = useState(0);
  const [origem, setOrigem] = useState<Origem | null>(null);

  // Etapa 2
  const [url, setUrl] = useState("");
  const [texto, setTexto] = useState("");
  const [uploadFake, setUploadFake] = useState(false);

  // Etapa 3
  const [analisando, setAnalisando] = useState(false);
  const [analise, setAnalise] = useState<AnaliseIA | null>(null);

  // Etapa 4 – produto editável
  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("JBL");
  const [descricaoCurta, setDescricaoCurta] = useState("");
  const [descricao, setDescricao] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [familiaId, setFamiliaId] = useState<string>("");
  const [linhaId, setLinhaId] = useState<string>("");
  const [posicionamento, setPosicionamento] =
    useState<"entrada" | "intermediario" | "premium" | "hero" | "">("");
  const [imagensSelecionadas, setImagensSelecionadas] = useState<string[]>([]);

  // Etapa 5 – decision engine
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<Set<string>>(new Set());
  const [querEspecial, setQuerEspecial] = useState<"nao" | "sim" | null>(null);
  const [objetivoEspecial, setObjetivoEspecial] = useState("");
  const [gerandoEspeciais, setGerandoEspeciais] = useState(false);
  const [especiaisAprovadas, setEspeciaisAprovadas] = useState<
    { nome: string; descricao: string; objetivo: string }[]
  >([]);

  // Etapa 6
  const [nomeLancamento, setNomeLancamento] = useState("");
  const [campanhaId, setCampanhaId] = useState<string>("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [salvando, setSalvando] = useState(false);

  const progressoPct = ((etapa + 1) / ETAPAS.length) * 100;

  // -------- helpers --------
  const preencherDaAnalise = (a: AnaliseIA) => {
    setNome(a.produto.nome);
    setMarca(a.produto.marca || "JBL");
    setDescricaoCurta(a.produto.descricao_curta);
    setDescricao(a.produto.descricao);
    setFeatures(a.produto.features);
    setPosicionamento(a.produto.posicionamento ?? "");
    setImagensSelecionadas(a.imagens);

    // sugestão de SKU
    const skuSug = (a.produto.marca || "JBL").slice(0, 3).toUpperCase() +
      "-" +
      a.produto.nome
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 10)
        .toUpperCase();
    setSku(skuSug);

    // match aproximado de categoria/família/linha
    const catMatch = aux.categorias.find((c) =>
      a.produto.categoria_sugerida.toLowerCase().includes(c.nome.toLowerCase()),
    );
    if (catMatch) setCategoriaId(catMatch.id);
    const famMatch = aux.familias.find((f) =>
      a.produto.familia_sugerida.toLowerCase().includes(f.nome.toLowerCase()),
    );
    if (famMatch) setFamiliaId(famMatch.id);
    const linMatch = aux.linhas.find((l) =>
      a.produto.linha_sugerida.toLowerCase().includes(l.nome.toLowerCase()),
    );
    if (linMatch) setLinhaId(linMatch.id);

    setNomeLancamento(`Lançamento ${a.produto.nome}`);
  };

  const rodarAnalise = async () => {
    setAnalisando(true);
    setEtapa(2);
    try {
      const fonte: AnaliseIA["fonte"] =
        origem === "url" ? "url" : origem === "chat" ? "chat" : "texto";
      const payload: {
        fonte: AnaliseIA["fonte"];
        url?: string;
        texto?: string;
      } = { fonte };
      if (origem === "url") payload.url = url;
      else payload.texto = texto;

      const res = await analisarBriefingIA({ data: payload });
      setAnalise(res);
      if (res.ok) {
        preencherDaAnalise(res);
        setEtapa(3);
      } else {
        toast.error(res.erro ?? "A IA não conseguiu processar. Ajuste manualmente.");
        setEtapa(3); // vai pra revisão mesmo assim
        preencherDaAnalise(res);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na análise");
    } finally {
      setAnalisando(false);
    }
  };

  const gerarEspeciais = async () => {
    setGerandoEspeciais(true);
    try {
      const res = await analisarBriefingIA({
        data: {
          fonte: "texto",
          texto: `Produto: ${nome}\nCategoria: ${aux.categorias.find((c) => c.id === categoriaId)?.nome ?? ""}\nDescrição: ${descricao}\nFeatures: ${features.join(", ")}`,
          objetivo_especial: objetivoEspecial,
        },
      });
      if (res.materiais_especiais_sugestoes.length > 0) {
        setAnalise((prev) =>
          prev ? { ...prev, materiais_especiais_sugestoes: res.materiais_especiais_sugestoes } : prev,
        );
        toast.success(`${res.materiais_especiais_sugestoes.length} ideias geradas`);
      } else {
        toast.info("Nenhuma sugestão retornada. Tente refinar o objetivo.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar sugestões");
    } finally {
      setGerandoEspeciais(false);
    }
  };

  const criarProjeto = async () => {
    setSalvando(true);
    try {
      const res = await criarProjetoInteligente({
        data: {
          produto: {
            sku,
            nome,
            marca,
            descricao_curta: descricaoCurta,
            descricao,
            features,
            categoria_id: categoriaId || null,
            familia_id: familiaId || null,
            linha_id: linhaId || null,
            posicionamento: (posicionamento || null) as never,
            url_origem: analise?.url_origem ?? null,
            status: "lancamento",
          },
          imagens_urls: imagensSelecionadas,
          criar_lancamento: true,
          lancamento: {
            nome: nomeLancamento,
            campanha_id: campanhaId || null,
            data_prevista: dataPrevista || null,
            status: "planejado",
          },
          materiais_ids: Array.from(materiaisSelecionados),
          materiais_especiais: especiaisAprovadas,
        },
      });
      toast.success("Projeto criado com sucesso");
      if (res.lancamento_id) navigate({ to: "/lancamentos/$id", params: { id: res.lancamento_id } });
      else navigate({ to: "/lancamentos" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar projeto");
    } finally {
      setSalvando(false);
    }
  };

  const pdvReady = useMemo(() => {
    let score = 0;
    if (nome) score += 15;
    if (imagensSelecionadas.length > 0) score += 15;
    if (categoriaId) score += 10;
    if (familiaId) score += 5;
    if (posicionamento) score += 10;
    if (features.length > 0) score += 10;
    if (materiaisSelecionados.size > 0) score += 20;
    if (campanhaId) score += 10;
    if (nomeLancamento) score += 5;
    return Math.min(100, score);
  }, [
    nome,
    imagensSelecionadas,
    categoriaId,
    familiaId,
    posicionamento,
    features,
    materiaisSelecionados,
    campanhaId,
    nomeLancamento,
  ]);

  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header fixo */}
      <div className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/85 backdrop-blur">
        <div className="container-page py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B00] text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Novo Projeto Inteligente</h1>
                <p className="text-xs text-muted-foreground">
                  Etapa {etapa + 1} de {ETAPAS.length} · {ETAPAS[etapa]}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
          <div className="mt-5">
            <Progress value={progressoPct} className="h-1.5" />
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
              {ETAPAS.map((n, i) => (
                <span
                  key={n}
                  className={
                    i === etapa
                      ? "font-medium text-[#FF6B00]"
                      : i < etapa
                        ? "text-neutral-500"
                        : ""
                  }
                >
                  {i + 1}. {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-page max-w-5xl py-12">
        {etapa === 0 && <Etapa1 origem={origem} onEscolher={setOrigem} onProsseguir={() => setEtapa(1)} />}
        {etapa === 1 && (
          <Etapa2
            origem={origem!}
            url={url}
            setUrl={setUrl}
            texto={texto}
            setTexto={setTexto}
            uploadFake={uploadFake}
            setUploadFake={setUploadFake}
            onVoltar={() => setEtapa(0)}
            onProsseguir={() => {
              if (origem === "manual") {
                preencherDaAnalise({
                  fonte: "texto",
                  ok: true,
                  produto: {
                    nome: "",
                    marca: "JBL",
                    categoria_sugerida: "",
                    familia_sugerida: "",
                    linha_sugerida: "",
                    posicionamento: null,
                    campanha_sugerida: "",
                    features: [],
                    descricao_curta: "",
                    descricao: "",
                  },
                  imagens: [],
                  imagem_principal: null,
                  documentos_sugeridos: [],
                  materiais_recomendados: [],
                  materiais_especiais_sugestoes: [],
                });
                setEtapa(3);
              } else {
                rodarAnalise();
              }
            }}
          />
        )}
        {etapa === 2 && <Etapa3 analisando={analisando} />}
        {etapa === 3 && (
          <Etapa4
            aux={aux}
            sku={sku}
            setSku={setSku}
            nome={nome}
            setNome={setNome}
            marca={marca}
            setMarca={setMarca}
            descricaoCurta={descricaoCurta}
            setDescricaoCurta={setDescricaoCurta}
            descricao={descricao}
            setDescricao={setDescricao}
            features={features}
            setFeatures={setFeatures}
            categoriaId={categoriaId}
            setCategoriaId={setCategoriaId}
            familiaId={familiaId}
            setFamiliaId={setFamiliaId}
            linhaId={linhaId}
            setLinhaId={setLinhaId}
            posicionamento={posicionamento}
            setPosicionamento={setPosicionamento}
            imagens={imagensSelecionadas}
            setImagens={setImagensSelecionadas}
            onVoltar={() => setEtapa(1)}
            onProsseguir={() => setEtapa(4)}
          />
        )}
        {etapa === 4 && (
          <Etapa5
            aux={aux}
            analise={analise}
            materiaisSelecionados={materiaisSelecionados}
            setMateriaisSelecionados={setMateriaisSelecionados}
            querEspecial={querEspecial}
            setQuerEspecial={setQuerEspecial}
            objetivoEspecial={objetivoEspecial}
            setObjetivoEspecial={setObjetivoEspecial}
            gerandoEspeciais={gerandoEspeciais}
            gerarEspeciais={gerarEspeciais}
            especiaisAprovadas={especiaisAprovadas}
            setEspeciaisAprovadas={setEspeciaisAprovadas}
            onVoltar={() => setEtapa(3)}
            onProsseguir={() => setEtapa(5)}
          />
        )}
        {etapa === 5 && (
          <Etapa6
            nome={nome}
            imagens={imagensSelecionadas}
            aux={aux}
            categoriaId={categoriaId}
            familiaId={familiaId}
            materiaisIds={materiaisSelecionados}
            especiais={especiaisAprovadas}
            nomeLancamento={nomeLancamento}
            setNomeLancamento={setNomeLancamento}
            campanhaId={campanhaId}
            setCampanhaId={setCampanhaId}
            dataPrevista={dataPrevista}
            setDataPrevista={setDataPrevista}
            pdvReady={pdvReady}
            salvando={salvando}
            onVoltar={() => setEtapa(4)}
            onCriar={criarProjeto}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ETAPA 1 – Como deseja começar?
// ============================================================
function Etapa1({
  origem,
  onEscolher,
  onProsseguir,
}: {
  origem: Origem | null;
  onEscolher: (o: Origem) => void;
  onProsseguir: () => void;
}) {
  return (
    <div>
      <SectionHead
        eyebrow="Etapa 1"
        title="Como deseja começar?"
        description="Escolha a origem do seu projeto. A IA se adapta ao formato que você preferir."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ORIGENS.map((o) => {
          const ativo = origem === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onEscolher(o.id)}
              className={`group relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all ${
                ativo
                  ? "border-[#FF6B00] bg-orange-50/40 shadow-md ring-1 ring-[#FF6B00]/40"
                  : "border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${o.cor}`}>
                <o.icone className="h-6 w-6" />
              </div>
              <p className="mt-1 text-[15px] font-semibold tracking-tight">{o.label}</p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">{o.descricao}</p>
              {ativo && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B00] text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-10 flex justify-end">
        <Button
          size="lg"
          onClick={onProsseguir}
          disabled={!origem}
          className="bg-[#FF6B00] hover:bg-[#E85F00]"
        >
          Prosseguir <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// ETAPA 2 – Importação
// ============================================================
function Etapa2({
  origem,
  url,
  setUrl,
  texto,
  setTexto,
  uploadFake,
  setUploadFake,
  onVoltar,
  onProsseguir,
}: {
  origem: Origem;
  url: string;
  setUrl: (v: string) => void;
  texto: string;
  setTexto: (v: string) => void;
  uploadFake: boolean;
  setUploadFake: (v: boolean) => void;
  onVoltar: () => void;
  onProsseguir: () => void;
}) {
  const isUrl = origem === "url";
  const isChat = origem === "chat";
  const isManual = origem === "manual";
  const isUpload = !isUrl && !isChat && !isManual;

  const podeProsseguir =
    isManual ||
    (isUrl && /^https?:\/\//.test(url)) ||
    (isChat && texto.trim().length > 10) ||
    (isUpload && uploadFake);

  return (
    <div>
      <SectionHead
        eyebrow="Etapa 2"
        title={
          isUrl
            ? "Cole a URL do produto"
            : isChat
              ? "Descreva o projeto para a IA"
              : isManual
                ? "Cadastro Manual"
                : "Faça o upload dos arquivos"
        }
        description={
          isManual
            ? "Você preencherá todos os campos manualmente na próxima etapa."
            : "A IA analisará automaticamente o conteúdo para preencher o cadastro."
        }
      />

      <div className="mt-8">
        {isUrl && (
          <Card className="border-neutral-200">
            <CardContent className="p-8">
              <Label htmlFor="url" className="text-xs uppercase tracking-wider text-muted-foreground">
                URL da página do produto
              </Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://br.jbl.com/…"
                className="mt-2 h-12 text-base"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                A IA irá extrair automaticamente nome, imagens, features, categoria e sugerir materiais.
              </p>
            </CardContent>
          </Card>
        )}

        {isChat && (
          <Card className="border-neutral-200">
            <CardContent className="p-8">
              <Label htmlFor="texto" className="text-xs uppercase tracking-wider text-muted-foreground">
                Conte à IA sobre o projeto
              </Label>
              <Textarea
                id="texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ex: Estamos lançando o novo JBL Flip 7 na campanha de verão, foco em portabilidade e som potente. Precisamos de displays e wobblers em PDV nas principais lojas..."
                rows={8}
                className="mt-2 text-base"
              />
            </CardContent>
          </Card>
        )}

        {isUpload && (
          <Card className="border-dashed border-2 border-neutral-300 bg-neutral-50/50">
            <CardContent className="flex flex-col items-center gap-4 p-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#FF6B00] shadow-sm">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-medium">
                  Arraste seus arquivos aqui ou clique para selecionar
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, WEBP, HEIC, SVG, PDF, DOC, XLSX, PPT, AI, PSD, EPS, INDD, ZIP, MP4, MOV — até 20MB cada
                </p>
              </div>
              <Button
                variant={uploadFake ? "default" : "outline"}
                onClick={() => setUploadFake(true)}
                className={uploadFake ? "bg-[#FF6B00] hover:bg-[#E85F00]" : ""}
              >
                {uploadFake ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Arquivos anexados
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Selecionar arquivos
                  </>
                )}
              </Button>
              {uploadFake && (
                <>
                  <div className="mt-2 w-full max-w-md">
                    <Progress value={100} className="h-1.5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Upload em memória — os arquivos serão processados pela IA. Para vincular assets
                    permanentemente, use também o Asset Center após a criação do projeto.
                  </p>
                </>
              )}
              <div className="mt-4 w-full max-w-md rounded-xl bg-white p-4 text-left">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Dica: descreva também o projeto por texto
                </Label>
                <Textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Ex: Briefing de PDV para o novo Flip 7…"
                  rows={4}
                  className="mt-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {isManual && (
          <Card>
            <CardContent className="flex items-start gap-4 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                <PenSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-medium">Cadastro Manual</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Você preencherá todos os campos manualmente. A IA ainda ajudará a recomendar materiais no motor estratégico.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onVoltar}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          size="lg"
          disabled={!podeProsseguir}
          onClick={onProsseguir}
          className="bg-[#FF6B00] hover:bg-[#E85F00]"
        >
          {isManual ? "Prosseguir" : "Analisar com IA"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// ETAPA 3 – Análise IA (animação)
// ============================================================
function Etapa3({ analisando }: { analisando: boolean }) {
  const itens = [
    "Produto",
    "Marca",
    "Categoria",
    "Família",
    "Linha",
    "Posicionamento",
    "Campanha sugerida",
    "Features",
    "Assets encontrados",
    "Documentos",
    "Imagens",
    "Vídeos",
    "Guideline",
    "Arquivos técnicos",
    "Materiais compatíveis",
    "Materiais especiais",
  ];
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center py-10">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FF6B00] to-[#FF9944] text-white shadow-xl">
          {analisando ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : (
            <Sparkles className="h-10 w-10" />
          )}
        </div>
        {analisando && (
          <div className="absolute inset-0 -z-10 animate-pulse rounded-3xl bg-[#FF6B00]/30 blur-2xl" />
        )}
      </div>
      <h2 className="mt-8 text-2xl font-semibold tracking-tight">
        {analisando ? "A IA está analisando seu conteúdo…" : "Pronto! Análise concluída."}
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Extraindo metadados, identificando padrões e cruzando com a Base Mestre JBL.
      </p>
      <div className="mt-10 grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
        {itens.map((label, i) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs"
            style={{ animation: `pulseIn 0.4s ${i * 90}ms both` }}
          >
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-3 w-3" />
            </div>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulseIn { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: none;}}`}</style>
    </div>
  );
}

// ============================================================
// ETAPA 4 – Revisão
// ============================================================
type Aux = {
  categorias: { id: string; nome: string }[];
  familias: { id: string; nome: string }[];
  linhas: { id: string; nome: string }[];
  materiais: Array<{
    id: string;
    nome: string;
    tipo: string | null;
    status: string | null;
    imagens?: Array<{ url_assinada?: string | null; principal?: boolean | null }>;
  }>;
  campanhas: { id: string; nome: string }[];
};

function Etapa4(props: {
  aux: Aux;
  sku: string;
  setSku: (v: string) => void;
  nome: string;
  setNome: (v: string) => void;
  marca: string;
  setMarca: (v: string) => void;
  descricaoCurta: string;
  setDescricaoCurta: (v: string) => void;
  descricao: string;
  setDescricao: (v: string) => void;
  features: string[];
  setFeatures: (v: string[]) => void;
  categoriaId: string;
  setCategoriaId: (v: string) => void;
  familiaId: string;
  setFamiliaId: (v: string) => void;
  linhaId: string;
  setLinhaId: (v: string) => void;
  posicionamento: string;
  setPosicionamento: (v: "entrada" | "intermediario" | "premium" | "hero" | "") => void;
  imagens: string[];
  setImagens: (v: string[]) => void;
  onVoltar: () => void;
  onProsseguir: () => void;
}) {
  const [novaFeature, setNovaFeature] = useState("");

  const hero = props.imagens[0];

  return (
    <div>
      <SectionHead
        eyebrow="Etapa 4"
        title="Revise o que a IA encontrou"
        description="Ajuste qualquer campo antes de rodar o Motor Estratégico."
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* coluna esquerda */}
        <div className="space-y-5">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <Campo label="Nome do produto *">
                <Input value={props.nome} onChange={(e) => props.setNome(e.target.value)} />
              </Campo>
              <Campo label="SKU *">
                <Input value={props.sku} onChange={(e) => props.setSku(e.target.value)} />
              </Campo>
              <Campo label="Marca">
                <Input value={props.marca} onChange={(e) => props.setMarca(e.target.value)} />
              </Campo>
              <Campo label="Posicionamento">
                <Select
                  value={props.posicionamento}
                  onValueChange={(v) => props.setPosicionamento(v as never)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="hero">Hero</SelectItem>
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Categoria">
                <Select value={props.categoriaId} onValueChange={props.setCategoriaId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {props.aux.categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Família">
                <Select value={props.familiaId} onValueChange={props.setFamiliaId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {props.aux.familias.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Linha">
                <Select value={props.linhaId} onValueChange={props.setLinhaId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {props.aux.linhas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Descrição curta">
                <Input
                  value={props.descricaoCurta}
                  onChange={(e) => props.setDescricaoCurta(e.target.value)}
                />
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Descrição completa">
                  <Textarea
                    value={props.descricao}
                    onChange={(e) => props.setDescricao(e.target.value)}
                    rows={4}
                  />
                </Campo>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium">Features identificadas</p>
              <p className="text-xs text-muted-foreground">
                Edite, remova ou adicione manualmente.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {props.features.map((f) => (
                  <Badge
                    key={f}
                    variant="secondary"
                    className="gap-1 px-3 py-1.5 text-[13px] font-normal"
                  >
                    {f}
                    <button
                      onClick={() => props.setFeatures(props.features.filter((x) => x !== f))}
                      className="ml-1 text-neutral-400 hover:text-red-500"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {props.features.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma feature ainda.</p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  value={novaFeature}
                  onChange={(e) => setNovaFeature(e.target.value)}
                  placeholder="Ex: Bluetooth 5.3, 12h de bateria…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && novaFeature.trim()) {
                      props.setFeatures([...props.features, novaFeature.trim()]);
                      setNovaFeature("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (novaFeature.trim()) {
                      props.setFeatures([...props.features, novaFeature.trim()]);
                      setNovaFeature("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* coluna direita - hero + galeria */}
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="aspect-square w-full bg-gradient-to-br from-neutral-100 to-neutral-50">
              {hero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero}
                  alt={props.nome}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-300">
                  <ImageIcon className="h-12 w-12" />
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Imagem hero
              </p>
              <p className="mt-1 text-sm">{props.imagens.length} imagens totais</p>
            </CardContent>
          </Card>

          {props.imagens.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Galeria
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {props.imagens.map((img, i) => (
                    <button
                      key={img}
                      onClick={() => {
                        const next = [...props.imagens];
                        [next[0], next[i]] = [next[i], next[0]];
                        props.setImagens(next);
                      }}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                      title={i === 0 ? "Imagem principal" : "Definir como hero"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="h-full w-full object-contain" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          props.setImagens(props.imagens.filter((x) => x !== img));
                        }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-neutral-500 opacity-0 shadow group-hover:opacity-100 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={props.onVoltar}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          size="lg"
          onClick={props.onProsseguir}
          disabled={!props.nome || !props.sku}
          className="bg-[#FF6B00] hover:bg-[#E85F00]"
        >
          Executar Motor Estratégico <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// ETAPA 5 – Decision Engine
// ============================================================
function Etapa5(props: {
  aux: Aux;
  analise: AnaliseIA | null;
  materiaisSelecionados: Set<string>;
  setMateriaisSelecionados: (v: Set<string>) => void;
  querEspecial: "nao" | "sim" | null;
  setQuerEspecial: (v: "nao" | "sim") => void;
  objetivoEspecial: string;
  setObjetivoEspecial: (v: string) => void;
  gerandoEspeciais: boolean;
  gerarEspeciais: () => void;
  especiaisAprovadas: { nome: string; descricao: string; objetivo: string }[];
  setEspeciaisAprovadas: (v: { nome: string; descricao: string; objetivo: string }[]) => void;
  onVoltar: () => void;
  onProsseguir: () => void;
}) {
  const rec = props.analise?.materiais_recomendados ?? [];

  const toggleMaterial = (id: string) => {
    const next = new Set(props.materiaisSelecionados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    props.setMateriaisSelecionados(next);
  };

  // Materiais existentes que casam com os tipos recomendados
  const materiaisCompativeis = useMemo(() => {
    const tipos = new Set(rec.map((r) => r.tipo.toLowerCase()));
    return props.aux.materiais
      .filter((m) => {
        const t = (m.tipo ?? "").toLowerCase();
        return tipos.size === 0 || Array.from(tipos).some((x) => t.includes(x) || x.includes(t));
      })
      .slice(0, 12);
  }, [rec, props.aux.materiais]);

  return (
    <div>
      <SectionHead
        eyebrow="Etapa 5"
        title="Motor Estratégico"
        description="Com base no produto, campanha e posicionamento, a IA recomenda materiais e sugere ideias especiais."
      />

      {/* Recomendações IA */}
      {rec.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recomendações da IA
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {rec.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  r.obrigatorio ? "border-[#FF6B00]/30 bg-orange-50/40" : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Package className="h-5 w-5 text-neutral-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{r.nome_sugerido}</p>
                    {r.obrigatorio && (
                      <Badge className="bg-[#FF6B00] text-[10px] uppercase tracking-wider">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Obrigatório
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.tipo}</p>
                  {r.motivo && (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {r.motivo}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biblioteca */}
      <div className="mt-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Vincular materiais existentes ({props.materiaisSelecionados.size} selecionados)
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materiaisCompativeis.map((m) => {
            const img = m.imagens?.find((i) => i.principal)?.url_assinada ?? m.imagens?.[0]?.url_assinada;
            const sel = props.materiaisSelecionados.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMaterial(m.id)}
                className={`group relative flex items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                  sel
                    ? "border-[#FF6B00] bg-orange-50/40 ring-1 ring-[#FF6B00]/30"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-300">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.tipo ?? "—"}</p>
                  {m.status && (
                    <Badge variant="outline" className="mt-1.5 text-[10px]">
                      {m.status}
                    </Badge>
                  )}
                </div>
                {sel && (
                  <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B00] text-white">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
          {materiaisCompativeis.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-neutral-200 py-6 text-center text-xs text-muted-foreground">
              Nenhum material compatível encontrado na biblioteca. Você pode adicionar materiais especiais abaixo.
            </p>
          )}
        </div>
      </div>

      {/* Material Especial */}
      <Separator className="my-10" />
      <div>
        <h3 className="text-lg font-semibold tracking-tight">
          Este lançamento merece algum Material Especial?
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ideias criativas de displays gigantes, iluminados, experiências e ativações.
        </p>
        <RadioGroup
          value={props.querEspecial ?? ""}
          onValueChange={(v) => props.setQuerEspecial(v as "nao" | "sim")}
          className="mt-4 flex gap-6"
        >
          <label className="flex items-center gap-2">
            <RadioGroupItem value="nao" /> <span className="text-sm">Não</span>
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="sim" /> <span className="text-sm">Sim</span>
          </label>
        </RadioGroup>

        {props.querEspecial === "sim" && (
          <div className="mt-6 space-y-6">
            <Card>
              <CardContent className="p-6">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Qual o principal objetivo?
                </Label>
                <RadioGroup
                  value={props.objetivoEspecial}
                  onValueChange={props.setObjetivoEspecial}
                  className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {[
                    "Chamar atenção",
                    "Demonstrar um feature",
                    "Criar experiência",
                    "Gerar desejo",
                    "Reforçar design",
                    "Outro",
                  ].map((op) => (
                    <label
                      key={op}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:border-neutral-300"
                    >
                      <RadioGroupItem value={op} /> {op}
                    </label>
                  ))}
                </RadioGroup>
                <Button
                  className="mt-4 gap-2 bg-[#FF6B00] hover:bg-[#E85F00]"
                  onClick={props.gerarEspeciais}
                  disabled={!props.objetivoEspecial || props.gerandoEspeciais}
                >
                  {props.gerandoEspeciais ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Gerar ideias com IA
                </Button>
              </CardContent>
            </Card>

            {(props.analise?.materiais_especiais_sugestoes ?? []).length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {props.analise!.materiais_especiais_sugestoes.map((s, i) => {
                  const aprovada = props.especiaisAprovadas.some((e) => e.nome === s.nome);
                  return (
                    <div
                      key={i}
                      className={`rounded-2xl border p-5 transition-all ${
                        aprovada
                          ? "border-emerald-300 bg-emerald-50/60"
                          : "border-neutral-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold tracking-tight">{s.nome}</p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                            {s.objetivo}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {s.descricao}
                          </p>
                        </div>
                        {aprovada ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              props.setEspeciaisAprovadas(
                                props.especiaisAprovadas.filter((e) => e.nome !== s.nome),
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-[#FF6B00] hover:bg-[#E85F00]"
                            onClick={() => props.setEspeciaisAprovadas([...props.especiaisAprovadas, s])}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={props.onVoltar}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          size="lg"
          onClick={props.onProsseguir}
          className="bg-[#FF6B00] hover:bg-[#E85F00]"
        >
          Ver Resumo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// ETAPA 6 – Resumo + Criar
// ============================================================
function Etapa6(props: {
  nome: string;
  imagens: string[];
  aux: Aux;
  categoriaId: string;
  familiaId: string;
  materiaisIds: Set<string>;
  especiais: { nome: string; descricao: string; objetivo: string }[];
  nomeLancamento: string;
  setNomeLancamento: (v: string) => void;
  campanhaId: string;
  setCampanhaId: (v: string) => void;
  dataPrevista: string;
  setDataPrevista: (v: string) => void;
  pdvReady: number;
  salvando: boolean;
  onVoltar: () => void;
  onCriar: () => void;
}) {
  const catNome = props.aux.categorias.find((c) => c.id === props.categoriaId)?.nome ?? "—";
  const famNome = props.aux.familias.find((f) => f.id === props.familiaId)?.nome ?? "—";

  return (
    <div>
      <SectionHead
        eyebrow="Etapa 6"
        title="Resumo do projeto"
        description="Uma última olhada antes de criar tudo automaticamente."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
                {props.imagens[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={props.imagens[0]} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-300">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Produto</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight">{props.nome || "—"}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{catNome}</Badge>
                  <Badge variant="outline">{famNome}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <ResumoStat label="Imagens" value={props.imagens.length} />
                  <ResumoStat label="Materiais" value={props.materiaisIds.size} />
                  <ResumoStat label="Especiais" value={props.especiais.length} />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Dados do lançamento
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Campo label="Nome do lançamento *">
                <Input
                  value={props.nomeLancamento}
                  onChange={(e) => props.setNomeLancamento(e.target.value)}
                />
              </Campo>
              <Campo label="Campanha">
                <Select value={props.campanhaId} onValueChange={props.setCampanhaId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {props.aux.campanhas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Data prevista">
                <Input
                  type="date"
                  value={props.dataPrevista}
                  onChange={(e) => props.setDataPrevista(e.target.value)}
                />
              </Campo>
              <Campo label="Status">
                <Input value="Planejado" disabled />
              </Campo>
            </div>

            {props.especiais.length > 0 && (
              <>
                <Separator className="my-6" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Materiais especiais aprovados
                </p>
                <ul className="mt-3 space-y-2">
                  {props.especiais.map((e) => (
                    <li key={e.nome} className="flex items-start gap-2 text-sm">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 text-[#FF6B00]" />
                      <span>
                        <span className="font-medium">{e.nome}</span> — <span className="text-muted-foreground">{e.objetivo}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* PDV Ready + ações */}
        <div className="space-y-5">
          <Card className="border-[#FF6B00]/30 bg-gradient-to-br from-orange-50/60 to-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#FF6B00]">
                <ListChecks className="h-4 w-4" /> PDV Ready
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight">{props.pdvReady}%</span>
                <span className="pb-1 text-xs text-muted-foreground">completo</span>
              </div>
              <Progress value={props.pdvReady} className="mt-3 h-2 bg-orange-100" />
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Indica o quanto o projeto está pronto para chegar ao ponto de venda.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button
              className="w-full gap-2 bg-[#FF6B00] hover:bg-[#E85F00]"
              size="lg"
              disabled={props.salvando || !props.nome || !props.nomeLancamento}
              onClick={props.onCriar}
            >
              {props.salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Criar Projeto
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled={props.salvando}
              onClick={props.onCriar}
            >
              Salvar como Rascunho
            </Button>
            <Button className="w-full" variant="ghost" onClick={props.onVoltar}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </div>

          <a
            href="/lancamentos"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Ver projetos existentes <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
function SectionHead({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#FF6B00]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ResumoStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

// Silencia unused imports
void Checkbox;
