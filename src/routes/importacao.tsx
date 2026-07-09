import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Zap, Upload, FolderUp, FileImage, FileVideo, FileText, FileSpreadsheet,
  Presentation, Palette, Box, HelpCircle, CheckCircle2, Loader2, History,
  ArrowLeft, ArrowRight, RotateCcw, Sparkles, Package, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  classificarArquivo, criarImportBatch, executarImportacao,
  listarImportBatches, atualizarImportItem, reverterImportacao,
  type AnaliseItem,
} from "@/lib/importacao.functions";

export const Route = createFileRoute("/importacao")({
  head: () => ({
    meta: [
      { title: "Importação Inteligente · JBL Trade Hub" },
      { name: "description", content: "Importe milhares de arquivos e alimente automaticamente Base Mestre, Asset Center, Lançamentos e Merchandising." },
    ],
  }),
  component: ImportacaoPage,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const ACEITOS = ".jpg,.jpeg,.png,.webp,.heic,.pdf,.ai,.eps,.psd,.indd,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.mp4,.mov,.obj,.stl,.svg";

const TIPO_ICONS: Record<string, { icon: typeof FileImage; color: string; label: string }> = {
  imagem: { icon: FileImage, color: "text-emerald-600 bg-emerald-50", label: "Imagens" },
  video: { icon: FileVideo, color: "text-rose-600 bg-rose-50", label: "Vídeos" },
  pdf: { icon: FileText, color: "text-red-600 bg-red-50", label: "PDF" },
  powerpoint: { icon: Presentation, color: "text-orange-600 bg-orange-50", label: "PowerPoint" },
  excel: { icon: FileSpreadsheet, color: "text-green-600 bg-green-50", label: "Excel" },
  word: { icon: FileText, color: "text-blue-600 bg-blue-50", label: "Word" },
  adobe: { icon: Palette, color: "text-fuchsia-600 bg-fuchsia-50", label: "Adobe" },
  "3d": { icon: Box, color: "text-indigo-600 bg-indigo-50", label: "3D" },
  zip: { icon: Package, color: "text-amber-600 bg-amber-50", label: "ZIP" },
  svg: { icon: Palette, color: "text-violet-600 bg-violet-50", label: "SVG" },
  desconhecido: { icon: HelpCircle, color: "text-neutral-600 bg-neutral-100", label: "Desconhecidos" },
};

function ImportacaoPage() {
  const [step, setStep] = useState<Step>(1);
  const [batchNome, setBatchNome] = useState("");
  const [analises, setAnalises] = useState<AnaliseItem[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<{ criados_produtos: number; criados_materiais: number; criados_assets: number; relacionamentos: number; ignorados: number; duplicados: number } | null>(null);
  const [tab, setTab] = useState<"assistente" | "historico">("assistente");
  const inputRef = useRef<HTMLInputElement>(null);

  const criarBatchFn = useServerFn(criarImportBatch);
  const executarFn = useServerFn(executarImportacao);
  const atualizarFn = useServerFn(atualizarImportItem);

  const contagens = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of analises) c[a.tipo_detectado] = (c[a.tipo_detectado] ?? 0) + 1;
    return c;
  }, [analises]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setBatchNome(`Importação · ${new Date().toLocaleString("pt-BR")}`);
    setStep(2);
    // Simula análise progressiva
    const total = arr.length;
    const parciais: AnaliseItem[] = [];
    for (let i = 0; i < total; i++) {
      const f = arr[i];
      const caminho = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      parciais.push(
        classificarArquivo({
          nome_arquivo: f.name,
          caminho_original: caminho,
          mime: f.type || null,
          tamanho: f.size,
        }),
      );
      if (i % 25 === 0 || i === total - 1) {
        setProgresso(Math.round(((i + 1) / total) * 100));
        setAnalises([...parciais]);
        await new Promise((r) => setTimeout(r, 5));
      }
    }
    setAnalises(parciais);
    setProgresso(100);
    setTimeout(() => setStep(3), 400);
  }

  async function irParaValidacao() {
    const res = await criarBatchFn({
      data: { nome: batchNome, origem: "upload local", itens: analises },
    });
    setBatchId(res.batch_id);
    setStep(4);
  }

  const validacaoQuery = useQuery({
    queryKey: ["import-batch", batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const { obterImportBatch } = await import("@/lib/importacao.functions");
      const fn = obterImportBatch;
      return fn({ data: { batch_id: batchId } });
    },
    enabled: !!batchId && (step === 4 || step === 6),
  });

  async function confirmarImportacao() {
    if (!batchId) return;
    setStep(5);
    try {
      const r = await executarFn({ data: { batch_id: batchId } });
      setResultado(r);
      setStep(6);
    } catch (e) {
      toast.error((e as Error).message);
      setStep(4);
    }
  }

  function resetar() {
    setStep(1);
    setAnalises([]);
    setBatchId(null);
    setResultado(null);
    setProgresso(0);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Zap}
        title="Importação Inteligente"
        description="Assistente que analisa, classifica e importa toda a biblioteca de arquivos da JBL."
        breadcrumbs={[{ label: "Importação Inteligente" }]}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="assistente"><Sparkles className="h-4 w-4 mr-1.5" />Assistente</TabsTrigger>
          <TabsTrigger value="historico"><History className="h-4 w-4 mr-1.5" />Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="assistente" className="mt-6">
          <StepIndicator step={step} />

          {step === 1 && (
            <UploadInicial
              onPickFiles={() => inputRef.current?.click()}
              inputRef={inputRef}
              onFiles={handleFiles}
            />
          )}

          {step === 2 && (
            <AnaliseProgress progresso={progresso} total={analises.length} />
          )}

          {step === 3 && (
            <ClassificacaoAutomatica
              analises={analises}
              contagens={contagens}
              onBack={() => setStep(1)}
              onNext={irParaValidacao}
            />
          )}

          {step === 4 && (
            <ValidacaoTabela
              itens={(validacaoQuery.data?.itens as unknown as ImportItemRow[]) ?? []}
              onEdit={async (id, patch) => {
                await atualizarFn({ data: { id, patch } });
                validacaoQuery.refetch();
              }}
              onBack={() => setStep(3)}
              onConfirm={confirmarImportacao}
            />
          )}

          {step === 5 && <ExecutandoImportacao />}

          {step === 6 && resultado && (
            <RelatorioFinal resultado={resultado} onResetar={resetar} />
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoImportacoes />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Sub componentes ----------

function StepIndicator({ step }: { step: Step }) {
  const passos = ["Upload", "Análise", "Classificação", "Validação", "Executando", "Relatório"];
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {passos.map((p, i) => {
        const n = (i + 1) as Step;
        const ativo = step === n;
        const feito = step > n;
        return (
          <div key={p} className="flex items-center gap-2 shrink-0">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border ${
                feito ? "bg-emerald-500 text-white border-emerald-500" :
                ativo ? "bg-neutral-900 text-white border-neutral-900" :
                "bg-white text-neutral-400 border-neutral-200"
              }`}
            >{feito ? <CheckCircle2 className="h-4 w-4" /> : n}</div>
            <span className={`text-xs ${ativo ? "text-neutral-900 font-medium" : "text-muted-foreground"}`}>{p}</span>
            {i < passos.length - 1 && <div className="w-6 h-px bg-neutral-200" />}
          </div>
        );
      })}
    </div>
  );
}

function UploadInicial({
  onPickFiles, inputRef, onFiles,
}: {
  onPickFiles: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (f: FileList | null) => void;
}) {
  return (
    <Card className="relative overflow-hidden border-dashed border-2 border-neutral-200 bg-gradient-to-br from-neutral-50 to-white">
      <CardContent className="py-24 flex flex-col items-center justify-center text-center gap-6">
        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/20">
          <FolderUp className="h-12 w-12 text-white" />
        </div>
        <div className="space-y-2 max-w-lg">
          <h2 className="text-3xl font-bold tracking-tight">Importar Pasta</h2>
          <p className="text-muted-foreground">
            Selecione uma ou várias pastas. Nós analisamos, classificamos e distribuímos os arquivos automaticamente na Base Mestre, Asset Center, Lançamentos e Merchandising.
          </p>
        </div>
        <Button size="lg" className="h-14 px-10 text-base gap-3" onClick={onPickFiles}>
          <Upload className="h-5 w-5" /> Selecionar Pastas
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACEITOS}
          onChange={(e) => onFiles(e.target.files)}
          className="hidden"
          // @ts-expect-error atributos não-standard
          webkitdirectory=""
          directory=""
        />
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl text-[10px]">
          {["JPG","PNG","WEBP","HEIC","PDF","AI","EPS","PSD","INDD","DOC","DOCX","XLS","XLSX","PPT","PPTX","ZIP","MP4","MOV","OBJ","STL","SVG"].map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AnaliseProgress({ progresso, total }: { progresso: number; total: number }) {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center gap-6">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-900" />
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold">Analisando arquivos…</p>
          <p className="text-sm text-muted-foreground">{total} arquivos detectados</p>
        </div>
        <div className="w-full max-w-md">
          <Progress value={progresso} className="h-2" />
          <p className="text-xs text-muted-foreground text-right mt-1">{progresso}%</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassificacaoAutomatica({
  analises, contagens, onBack, onNext,
}: {
  analises: AnaliseItem[];
  contagens: Record<string, number>;
  onBack: () => void;
  onNext: () => void;
}) {
  const tipos = Object.keys(TIPO_ICONS);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="col-span-2 md:col-span-4 lg:col-span-2 bg-neutral-900 text-white">
          <CardContent className="py-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400">Total</p>
            <p className="text-5xl font-bold mt-1">{analises.length}</p>
            <p className="text-xs text-neutral-400 mt-1">arquivos analisados</p>
          </CardContent>
        </Card>
        {tipos.map((t) => {
          const { icon: Icon, color, label } = TIPO_ICONS[t];
          const n = contagens[t] ?? 0;
          if (n === 0) return null;
          return (
            <Card key={t}>
              <CardContent className="py-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-tight">{n}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-amber-500" /> Classificação Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            O sistema inferiu produto, categoria, família e destino a partir do nome e da pasta de cada arquivo. Você poderá revisar tudo na próxima etapa.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {analises.slice(0, 60).map((a, i) => (
              <div key={i} className="border rounded-lg p-3 bg-white hover:border-neutral-300 transition">
                <p className="text-xs font-medium truncate">{a.nome_arquivo}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="secondary" className="text-[10px]">{TIPO_ICONS[a.tipo_detectado]?.label ?? a.tipo_detectado}</Badge>
                  {a.produto_sugerido && <Badge className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{a.produto_sugerido}</Badge>}
                  {a.material_sugerido && <Badge className="text-[10px] bg-violet-100 text-violet-800 hover:bg-violet-100">{a.material_sugerido}</Badge>}
                  {a.categoria_sugerida && <Badge variant="outline" className="text-[10px]">{a.categoria_sugerida}</Badge>}
                </div>
              </div>
            ))}
          </div>
          {analises.length > 60 && (
            <p className="text-xs text-muted-foreground mt-3">+ {analises.length - 60} arquivos adicionais</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <Button onClick={onNext}>Revisar e validar <ArrowRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  );
}

type ImportItemRow = {
  id: string; nome_arquivo: string; tipo_detectado: string;
  produto_sugerido: string | null; material_sugerido: string | null;
  categoria_sugerida: string | null; destino: string;
};

function ValidacaoTabela({
  itens, onEdit, onBack, onConfirm,
}: {
  itens: ImportItemRow[];
  onEdit: (id: string, patch: Partial<ImportItemRow>) => Promise<void> | void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validação — {itens.length} arquivos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="max-w-[240px] truncate text-xs">{it.nome_arquivo}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{TIPO_ICONS[it.tipo_detectado]?.label ?? it.tipo_detectado}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={it.produto_sugerido ?? ""}
                        className="h-8 text-xs"
                        onBlur={(e) => e.target.value !== (it.produto_sugerido ?? "") && onEdit(it.id, { produto_sugerido: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={it.material_sugerido ?? ""}
                        className="h-8 text-xs"
                        onBlur={(e) => e.target.value !== (it.material_sugerido ?? "") && onEdit(it.id, { material_sugerido: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={it.categoria_sugerida ?? ""}
                        className="h-8 text-xs"
                        onBlur={(e) => e.target.value !== (it.categoria_sugerida ?? "") && onEdit(it.id, { categoria_sugerida: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={it.destino}
                        onValueChange={(v) => onEdit(it.id, { destino: v })}
                      >
                        <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset_generico">Asset Center</SelectItem>
                          <SelectItem value="produto_galeria">Galeria Produto</SelectItem>
                          <SelectItem value="material_galeria">Galeria Material</SelectItem>
                          <SelectItem value="documento_produto">Documento</SelectItem>
                          <SelectItem value="guideline">Guideline</SelectItem>
                          <SelectItem value="ignorar">Ignorar</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <Button onClick={onConfirm} className="gap-2"><CheckCircle2 className="h-4 w-4" /> Confirmar e Importar</Button>
      </div>
    </div>
  );
}

function ExecutandoImportacao() {
  return (
    <Card>
      <CardContent className="py-20 flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-neutral-900" />
        <p className="text-lg font-semibold">Importando…</p>
        <p className="text-sm text-muted-foreground">Criando Produtos, Materiais, Assets e Relacionamentos.</p>
      </CardContent>
    </Card>
  );
}

function RelatorioFinal({
  resultado, onResetar,
}: {
  resultado: { criados_produtos: number; criados_materiais: number; criados_assets: number; relacionamentos: number; ignorados: number; duplicados: number };
  onResetar: () => void;
}) {
  const items = [
    { label: "Produtos", value: resultado.criados_produtos, icon: Package, color: "from-emerald-500 to-teal-500" },
    { label: "Materiais", value: resultado.criados_materiais, icon: Layers, color: "from-violet-500 to-fuchsia-500" },
    { label: "Assets", value: resultado.criados_assets, icon: FileImage, color: "from-amber-500 to-orange-500" },
    { label: "Relacionamentos", value: resultado.relacionamentos, icon: Sparkles, color: "from-sky-500 to-indigo-500" },
    { label: "Duplicados", value: resultado.duplicados, icon: RotateCcw, color: "from-neutral-500 to-neutral-700" },
    { label: "Ignorados", value: resultado.ignorados, icon: HelpCircle, color: "from-rose-400 to-red-500" },
  ];
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
        <CardContent className="py-10 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Importação concluída</h2>
            <p className="text-emerald-50 text-sm">Todos os arquivos foram processados e distribuídos.</p>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <Card key={it.label} className="overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${it.color}`} />
            <CardContent className="py-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{it.label}</p>
                <p className="text-4xl font-bold mt-1">{it.value}</p>
              </div>
              <it.icon className="h-8 w-8 text-neutral-300" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" asChild><Link to="/asset-center">Abrir Asset Center</Link></Button>
        <Button onClick={onResetar}>Nova importação</Button>
      </div>
    </div>
  );
}

function HistoricoImportacoes() {
  const qc = useQueryClient();
  const listar = useServerFn(listarImportBatches);
  const reverter = useServerFn(reverterImportacao);
  const q = useQuery({ queryKey: ["import-batches"], queryFn: () => listar() });
  const mut = useMutation({
    mutationFn: (batch_id: string) => reverter({ data: { batch_id } }),
    onSuccess: () => { toast.success("Importação revertida"); qc.invalidateQueries({ queryKey: ["import-batches"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const batches = (q.data as unknown as Array<{
    id: string; nome: string; origem: string | null; status: string;
    total_arquivos: number; criados_assets: number; tempo_ms: number | null;
    created_at: string;
  }>) ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Histórico de Importações</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Arquivos</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-xs">{new Date(b.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs">{b.nome}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{b.origem ?? "—"}</TableCell>
                <TableCell className="text-xs">{b.total_arquivos}</TableCell>
                <TableCell className="text-xs">{b.criados_assets}</TableCell>
                <TableCell className="text-xs">{b.tempo_ms ? `${(b.tempo_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "concluido" ? "default" : b.status === "revertido" ? "outline" : "secondary"} className="text-[10px]">
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {b.status === "concluido" && (
                    <Button size="sm" variant="ghost" onClick={() => mut.mutate(b.id)} disabled={mut.isPending}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reverter
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {batches.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">Nenhuma importação ainda.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
