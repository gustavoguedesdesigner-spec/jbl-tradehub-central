import { createFileRoute, Link } from "@tanstack/react-router";
import {
  queryOptions,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Box,
  Upload,
  Star,
  Trash2,
  FileText,
  Download,
  Camera,
  MessageSquare,
  Clock,
  Package,
  Save,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  obterMaterial,
  atualizarMaterial,
  adicionarImagemMaterial,
  definirImagemPrincipalMaterial,
  removerImagemMaterial,
  adicionarDocumentoMaterial,
  removerDocumentoMaterial,
  adicionarComentarioMaterial,
} from "@/lib/materiais.functions";
import { listarFornecedores } from "@/lib/fornecedores.functions";
import { listarCategorias } from "@/lib/categorias.functions";

const opts = (id: string) =>
  queryOptions({ queryKey: ["material", id], queryFn: () => obterMaterial({ data: { id } }) });

export const Route = createFileRoute("/base-mestre/materiais/$id")({
  head: () => ({ meta: [{ title: "Material — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(opts(params.id)),
  component: MaterialDetalhe,
});

const statusMap: Record<string, { l: string; v: "default" | "secondary" | "outline" | "destructive" }> = {
  ativo: { l: "Ativo", v: "default" },
  em_desenvolvimento: { l: "Em desenvolvimento", v: "secondary" },
  rascunho: { l: "Rascunho", v: "outline" },
  descontinuado: { l: "Descontinuado", v: "destructive" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MaterialDetalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: material } = useSuspenseQuery(opts(id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m: any = material;

  const galeria = (m.imagens ?? []).filter((i: any) => i.tipo === "galeria");
  const fotosReais = (m.imagens ?? []).filter((i: any) => i.tipo === "foto_real");
  const principal = galeria.find((i: any) => i.principal) ?? galeria[0];

  const status = statusMap[m.status] ?? { l: m.status, v: "outline" as const };

  return (
    <>
      {/* HERO estilo e-commerce */}
      <div className="border-b bg-gradient-to-b from-muted/40 to-background">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
            <Link to="/base-mestre/materiais">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à biblioteca
            </Link>
          </Button>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            {/* Imagem principal + thumbs */}
            <div className="space-y-3">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted">
                {principal?.url_assinada ? (
                  <img
                    src={principal.url_assinada}
                    alt={m.nome}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Box className="h-16 w-16" />
                    Sem imagem principal
                  </div>
                )}
              </div>
              {galeria.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {galeria.slice(0, 5).map((img: any) => (
                    <div
                      key={img.id}
                      className="aspect-square overflow-hidden rounded-xl border bg-muted"
                    >
                      {img.url_assinada && (
                        <img
                          src={img.url_assinada}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-col justify-center gap-6">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {m.codigo}
                </p>
                <h1 className="text-4xl font-semibold leading-tight tracking-tight">{m.nome}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={status.v}>{status.l}</Badge>
                  {m.tipo && <Badge variant="outline">{m.tipo}</Badge>}
                  {m.categoria?.nome && <Badge variant="outline">{m.categoria.nome}</Badge>}
                </div>
              </div>

              {m.descricao && (
                <p className="text-lg leading-relaxed text-muted-foreground">{m.descricao}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InfoCard label="Fornecedor" value={m.fornecedor?.nome ?? "—"} />
                <InfoCard label="Dimensões" value={m.dimensoes ?? "—"} />
                <InfoCard label="Categoria" value={m.categoria?.nome ?? "—"} />
                <InfoCard label="Tipo" value={m.tipo ?? "—"} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Tabs defaultValue="visao">
          <TabsList className="mb-8 flex-wrap">
            <TabsTrigger value="visao">Visão geral</TabsTrigger>
            <TabsTrigger value="galeria">Galeria</TabsTrigger>
            <TabsTrigger value="fotos">Fotos reais</TabsTrigger>
            <TabsTrigger value="downloads">Downloads</TabsTrigger>
            <TabsTrigger value="compat">Produtos compatíveis</TabsTrigger>
            <TabsTrigger value="briefing">Briefing</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="editar">Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="grid gap-6 lg:grid-cols-2">
            <BigCard title="Descrição">
              {m.descricao ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{m.descricao}</p>
              ) : (
                <Empty label="Sem descrição" />
              )}
            </BigCard>
            <BigCard title="Observações">
              {m.observacoes ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{m.observacoes}</p>
              ) : (
                <Empty label="Sem observações" />
              )}
            </BigCard>
          </TabsContent>

          <TabsContent value="galeria">
            <ImagensSection materialId={id} imagens={galeria} tipo="galeria" onChange={() => qc.invalidateQueries({ queryKey: ["material", id] })} />
          </TabsContent>

          <TabsContent value="fotos">
            <ImagensSection materialId={id} imagens={fotosReais} tipo="foto_real" onChange={() => qc.invalidateQueries({ queryKey: ["material", id] })} />
          </TabsContent>

          <TabsContent value="downloads">
            <DocumentosSection materialId={id} documentos={m.documentos ?? []} onChange={() => qc.invalidateQueries({ queryKey: ["material", id] })} />
          </TabsContent>

          <TabsContent value="compat">
            <CompatProdutosDoMaterial materialId={id} />
          </TabsContent>

          <TabsContent value="briefing">
            <BigCard title="Briefing do material">
              {m.briefing ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{m.briefing}</p>
              ) : (
                <Empty label="Sem briefing cadastrado" />
              )}
            </BigCard>
          </TabsContent>

          <TabsContent value="comentarios">
            <ComentariosSection materialId={id} comentarios={m.comentarios ?? []} onChange={() => qc.invalidateQueries({ queryKey: ["material", id] })} />
          </TabsContent>

          <TabsContent value="historico">
            <HistoricoSection itens={m.historico ?? []} />
          </TabsContent>

          <TabsContent value="editar">
            <EditarSection material={m} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}

function BigCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ImagensSection({ materialId, imagens, tipo, onChange }: { materialId: string; imagens: any[]; tipo: "galeria" | "foto_real"; onChange: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const addFn = useServerFn(adicionarImagemMaterial);
  const setPrincipalFn = useServerFn(definirImagemPrincipalMaterial);
  const removeFn = useServerFn(removerImagemMaterial);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${materialId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("materiais").upload(path, file);
        if (error) throw error;
        await addFn({ data: { material_id: materialId, storage_path: path, tipo, url_publica: null } });
      }
      toast.success("Imagens enviadas");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {tipo === "galeria" ? "Galeria oficial" : "Fotos reais no PDV"}
          <span className="ml-2 text-sm text-muted-foreground">({imagens.length})</span>
        </h2>
        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando…" : "Enviar imagens"}
          </Button>
        </div>
      </div>
      {imagens.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Camera className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {tipo === "galeria" ? "Nenhuma imagem na galeria." : "Nenhuma foto real cadastrada."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {imagens.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                {img.url_assinada && (
                  <img src={img.url_assinada} alt="" className="h-full w-full object-cover" />
                )}
                {img.principal && (
                  <Badge className="absolute left-2 top-2" variant="default">
                    <Star className="mr-1 h-3 w-3" /> Principal
                  </Badge>
                )}
              </div>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                {tipo === "galeria" && !img.principal && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    await setPrincipalFn({ data: { id: img.id, material_id: materialId } });
                    toast.success("Definida como principal");
                    onChange();
                  }}>
                    <Star className="mr-1 h-3 w-3" /> Principal
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={async () => {
                  if (!confirm("Remover imagem?")) return;
                  await removeFn({ data: { id: img.id, storage_path: img.storage_path } });
                  toast.success("Imagem removida");
                  onChange();
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DocumentosSection({ materialId, documentos, onChange }: { materialId: string; documentos: any[]; onChange: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState("outro");
  const addFn = useServerFn(adicionarDocumentoMaterial);
  const removeFn = useServerFn(removerDocumentoMaterial);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${materialId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("materiais-documentos").upload(path, file);
        if (error) throw error;
        await addFn({ data: {
          material_id: materialId,
          nome: file.name,
          storage_path: path,
          mime_type: file.type || null,
          tamanho_bytes: file.size,
          categoria,
        }});
      }
      toast.success("Arquivos enviados");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Downloads e arquivos <span className="ml-2 text-sm text-muted-foreground">({documentos.length})</span></h2>
        <div className="flex items-center gap-2">
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="arte">Arte final</SelectItem>
              <SelectItem value="dieline">Dieline / Faca</SelectItem>
              <SelectItem value="manual">Manual de montagem</SelectItem>
              <SelectItem value="ficha_tecnica">Ficha técnica</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando…" : "Enviar arquivos"}
          </Button>
        </div>
      </div>
      {documentos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum arquivo disponível para download.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documentos.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-muted p-3"><FileText className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.categoria ?? "—"}{doc.tamanho_bytes ? ` · ${(doc.tamanho_bytes / 1024).toFixed(0)} KB` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {doc.url_assinada && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={doc.url_assinada} download target="_blank" rel="noreferrer">
                        <Download className="mr-1 h-3 w-3" /> Baixar
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                    if (!confirm("Remover arquivo?")) return;
                    await removeFn({ data: { id: doc.id, storage_path: doc.storage_path } });
                    toast.success("Removido");
                    onChange();
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CompatSection({ itens }: { itens: any[] }) {
  if (itens.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum produto compatível vinculado. Vincule na aba <strong>Compatibilidades</strong> da Base Mestre.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((c) => {
        const p = c.produto;
        const img = p?.imagens?.find((i: any) => i.principal) ?? p?.imagens?.[0];
        return (
          <Link key={c.id} to="/base-mestre/produtos/$id" params={{ id: p.id }}>
            <Card className="overflow-hidden transition hover:shadow-lg">
              <div className="aspect-[4/3] bg-muted">
                {img?.url_assinada ? (
                  <img src={img.url_assinada} alt={p.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Package className="h-10 w-10" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <p className="font-medium">{p.nome}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.codigo_jbl ?? p.sku}</p>
                {c.observacao && <p className="mt-2 text-sm text-muted-foreground">{c.observacao}</p>}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComentariosSection({ materialId, comentarios, onChange }: { materialId: string; comentarios: any[]; onChange: () => void }) {
  const [texto, setTexto] = useState("");
  const addFn = useServerFn(adicionarComentarioMaterial);
  const m = useMutation({
    mutationFn: () => addFn({ data: { material_id: materialId, corpo: texto } }),
    onSuccess: () => { setTexto(""); toast.success("Comentário publicado"); onChange(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-5">
          <Label>Novo comentário</Label>
          <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma observação, ajuste ou pergunta…" />
          <Button disabled={!texto.trim() || m.isPending} onClick={() => m.mutate()}>
            <MessageSquare className="mr-2 h-4 w-4" /> Publicar
          </Button>
        </CardContent>
      </Card>
      {comentarios.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">Sem comentários ainda.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {comentarios.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <p className="whitespace-pre-wrap text-sm">{c.corpo}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoricoSection({ itens }: { itens: any[] }) {
  if (itens.length === 0) return <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">Sem histórico registrado.</CardContent></Card>;
  return (
    <div className="grid gap-3">
      {itens.map((h) => (
        <Card key={h.id}>
          <CardContent className="flex items-start gap-3 p-4">
            <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{h.acao.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EditarSection({ material }: { material: any }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(atualizarMaterial);
  const { data: fornecedores = [] } = useQuery({ queryKey: ["fornecedores"], queryFn: () => listarFornecedores() });
  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });

  const [f, setF] = useState({
    codigo: material.codigo ?? "",
    nome: material.nome ?? "",
    tipo: material.tipo ?? "",
    dimensoes: material.dimensoes ?? "",
    descricao: material.descricao ?? "",
    briefing: material.briefing ?? "",
    observacoes: material.observacoes ?? "",
    fornecedor_id: material.fornecedor_id ?? "",
    categoria_id: material.categoria_id ?? "",
    status: material.status ?? "rascunho",
  });

  const mut = useMutation({
    mutationFn: () => updateFn({ data: { id: material.id, dados: {
      codigo: f.codigo, nome: f.nome,
      tipo: f.tipo || null, dimensoes: f.dimensoes || null,
      descricao: f.descricao || null, briefing: f.briefing || null, observacoes: f.observacoes || null,
      fornecedor_id: f.fornecedor_id || null, categoria_id: f.categoria_id || null,
      status: f.status as "rascunho" | "em_desenvolvimento" | "ativo" | "descontinuado",
    }}}),
    onSuccess: () => { toast.success("Material atualizado"); qc.invalidateQueries({ queryKey: ["material", material.id] }); qc.invalidateQueries({ queryKey: ["materiais"] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2"><Label>Código</Label><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Tipo</Label><Input value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} placeholder="Display, wobbler…" /></div>
            <div className="grid gap-2"><Label>Dimensões</Label><Input value={f.dimensoes} onChange={(e) => setF({ ...f, dimensoes: e.target.value })} /></div>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="descontinuado">Descontinuado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Fornecedor</Label>
            <Select value={f.fornecedor_id || "__none"} onValueChange={(v) => setF({ ...f, fornecedor_id: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Nenhum —</SelectItem>
                {fornecedores.map((x) => (<SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Select value={f.categoria_id || "__none"} onValueChange={(v) => setF({ ...f, categoria_id: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Nenhuma —</SelectItem>
                {categorias.map((x) => (<SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Conteúdo</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2"><Label>Descrição</Label><Textarea rows={4} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Briefing</Label><Textarea rows={6} value={f.briefing} onChange={(e) => setF({ ...f, briefing: e.target.value })} placeholder="Objetivo, público, mensagens-chave…" /></div>
          <div className="grid gap-2"><Label>Observações</Label><Textarea rows={3} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
          <Button className="w-fit" disabled={mut.isPending} onClick={() => mut.mutate()}>
            <Save className="mr-2 h-4 w-4" /> Salvar alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
