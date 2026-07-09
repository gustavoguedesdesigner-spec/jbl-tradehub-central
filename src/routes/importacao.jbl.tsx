import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, Loader2, Download, Upload, CheckCircle2, XCircle, AlertTriangle,
  ImageIcon, Trash2, ExternalLink,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { previewJblUrls, importarJblProdutos, type JblPreview, type ImportLog } from "@/lib/importador-jbl.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import { listarFamilias } from "@/lib/familias.functions";

export const Route = createFileRoute("/importacao/jbl")({
  head: () => ({
    meta: [
      { title: "Importador de Imagens JBL · JBL Trade Hub" },
      { name: "description", content: "Importe imagens oficiais de produtos JBL diretamente do site jbl.com.br para a Base Mestre e Asset Center." },
    ],
  }),
  component: ImportadorJblPage,
});

type StatusProd = "ativo" | "inativo" | "descontinuado" | "lancamento" | "em_desenvolvimento";
type Posicion = "entrada" | "intermediario" | "premium" | "hero";
type Tamanho = "P" | "M" | "G";

interface ItemRevisao {
  url_origem: string;
  nome: string;
  sku: string;
  imagens_selecionadas: string[];
  imagens_manuais: { storage_path: string; nome: string }[];
  categoria_id: string | null;
  familia_id: string | null;
  posicionamento: Posicion | null;
  campanha_tamanho: Tamanho | null;
  status: StatusProd;
  bloqueado: boolean;
  erro?: string;
}

function slugifySku(nome: string, url: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (base) return `JBL-${base.slice(0, 40)}`.toUpperCase();
  const slug = url.split("?")[0].split("/").filter(Boolean).pop() ?? "produto";
  return `JBL-${slug.slice(0, 40)}`.toUpperCase();
}

function ImportadorJblPage() {
  const [urlsInput, setUrlsInput] = useState("");
  const [itens, setItens] = useState<ItemRevisao[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [manualUploading, setManualUploading] = useState<string | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [manualTargetUrl, setManualTargetUrl] = useState<string | null>(null);

  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });
  const { data: familias = [] } = useQuery({ queryKey: ["familias"], queryFn: () => listarFamilias() });

  const previewFn = useServerFn(previewJblUrls);
  const importFn = useServerFn(importarJblProdutos);

  const preview = useMutation({
    mutationFn: (urls: string[]) => previewFn({ data: { urls } }),
    onSuccess: (results: JblPreview[]) => {
      const novos: ItemRevisao[] = results.map((r) => ({
        url_origem: r.url,
        nome: r.nome ?? "Produto JBL",
        sku: slugifySku(r.nome ?? "", r.url),
        imagens_selecionadas: r.imagem_principal
          ? [r.imagem_principal, ...r.galeria]
          : r.galeria,
        imagens_manuais: [],
        categoria_id: null,
        familia_id: null,
        posicionamento: null,
        campanha_tamanho: null,
        status: "ativo",
        bloqueado: !!r.bloqueado || (!r.ok && r.galeria.length === 0),
        erro: r.erro,
      }));
      setItens(novos);
      const ok = novos.filter((n) => !n.bloqueado).length;
      toast.success(`${ok} de ${novos.length} URLs analisadas`);
      if (novos.some((n) => n.bloqueado)) {
        toast.warning("Alguns links não puderam ser lidos. Use o upload manual para essas URLs.");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro na análise"),
  });

  const importar = useMutation({
    mutationFn: () => {
      const payload = itens
        .filter((i) => i.imagens_selecionadas.length + i.imagens_manuais.length > 0)
        .map((i) => ({
          url_origem: i.url_origem,
          nome: i.nome,
          sku: i.sku,
          categoria_id: i.categoria_id,
          familia_id: i.familia_id,
          posicionamento: i.posicionamento,
          campanha_tamanho: i.campanha_tamanho,
          status: i.status,
          imagens: i.imagens_selecionadas,
          imagens_manuais: i.imagens_manuais.map((m) => ({ storage_path: m.storage_path, url_origem: undefined })),
        }));
      if (payload.length === 0) throw new Error("Nenhum item com imagens para importar");
      return importFn({ data: { itens: payload } });
    },
    onSuccess: (result: ImportLog[]) => {
      setLogs(result);
      const criados = result.filter((r) => r.criado).length;
      const atualizados = result.filter((r) => r.atualizado).length;
      const imgs = result.reduce((s, r) => s + r.imagens_importadas, 0);
      toast.success(`${criados} criados, ${atualizados} atualizados, ${imgs} imagens importadas`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro na importação"),
  });

  function analisar() {
    const urls = urlsInput
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\/.+/.test(s));
    if (urls.length === 0) {
      toast.error("Cole ao menos uma URL válida");
      return;
    }
    preview.mutate(urls);
  }

  function updateItem(url: string, patch: Partial<ItemRevisao>) {
    setItens((prev) => prev.map((i) => (i.url_origem === url ? { ...i, ...patch } : i)));
  }
  function toggleImagem(url: string, img: string) {
    setItens((prev) => prev.map((i) => {
      if (i.url_origem !== url) return i;
      const has = i.imagens_selecionadas.includes(img);
      return { ...i, imagens_selecionadas: has ? i.imagens_selecionadas.filter((x) => x !== img) : [...i.imagens_selecionadas, img] };
    }));
  }
  function removerItem(url: string) {
    setItens((prev) => prev.filter((i) => i.url_origem !== url));
  }

  async function handleManualUpload(files: FileList | null) {
    if (!files || !manualTargetUrl) return;
    setManualUploading(manualTargetUrl);
    try {
      const uploaded: { storage_path: string; nome: string }[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `_import_manual/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("produtos").upload(path, file, { contentType: file.type });
        if (error) throw error;
        uploaded.push({ storage_path: path, nome: file.name });
      }
      setItens((prev) => prev.map((i) => (i.url_origem === manualTargetUrl
        ? { ...i, imagens_manuais: [...i.imagens_manuais, ...uploaded] }
        : i)));
      toast.success(`${uploaded.length} imagem(ns) adicionada(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setManualUploading(null);
      setManualTargetUrl(null);
      if (manualInputRef.current) manualInputRef.current.value = "";
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Importação"
        title="Importador de Imagens JBL"
        description="Cole URLs de páginas de produto do jbl.com.br. O sistema extrai imagens oficiais, cria ou atualiza o produto na Base Mestre e vincula tudo automaticamente."
      />

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* Passo 1 - URLs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              1. Cole as URLs dos produtos JBL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="https://br.jbl.com/speakers/PARTYBOX-110.html&#10;https://br.jbl.com/headphones/TUNE-770NC.html"
              rows={5}
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Uma URL por linha. Até 20 por vez.</p>
              <Button onClick={analisar} disabled={preview.isPending}>
                {preview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Importar imagens oficiais JBL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Passo 2 - Revisão */}
        {itens.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">2. Revisar antes de importar ({itens.length})</CardTitle>
              <Button onClick={() => importar.mutate()} disabled={importar.isPending}>
                {importar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Confirmar importação
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {itens.map((item) => {
                const total = item.imagens_selecionadas.length + item.imagens_manuais.length;
                return (
                  <div key={item.url_origem} className="rounded-lg border bg-card">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <a href={item.url_origem} target="_blank" rel="noreferrer" className="truncate text-xs text-muted-foreground hover:text-primary">
                            {item.url_origem}
                          </a>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                        {item.bloqueado && (
                          <Alert variant="destructive" className="py-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="text-sm">Não foi possível ler esta página</AlertTitle>
                            <AlertDescription className="text-xs">
                              {item.erro ?? "Bloqueio do site."} Faça upload manual das imagens abaixo.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <Badge variant={total > 0 ? "default" : "outline"}>
                        <ImageIcon className="mr-1 h-3 w-3" />
                        {total} imagem(ns)
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => removerItem(item.url_origem)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Nome do produto</Label>
                          <Input value={item.nome} onChange={(e) => updateItem(item.url_origem, { nome: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">SKU</Label>
                          <Input value={item.sku} onChange={(e) => updateItem(item.url_origem, { sku: e.target.value })} className="font-mono" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Categoria</Label>
                            <Select value={item.categoria_id ?? "__none__"} onValueChange={(v) => updateItem(item.url_origem, { categoria_id: v === "__none__" ? null : v })}>
                              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">—</SelectItem>
                                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Família</Label>
                            <Select value={item.familia_id ?? "__none__"} onValueChange={(v) => updateItem(item.url_origem, { familia_id: v === "__none__" ? null : v })}>
                              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">—</SelectItem>
                                {familias.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Posicionamento</Label>
                            <Select value={item.posicionamento ?? "__none__"} onValueChange={(v) => updateItem(item.url_origem, { posicionamento: v === "__none__" ? null : (v as Posicion) })}>
                              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">—</SelectItem>
                                <SelectItem value="entrada">Entrada</SelectItem>
                                <SelectItem value="intermediario">Intermediário</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="hero">Hero</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Campanha</Label>
                            <Select value={item.campanha_tamanho ?? "__none__"} onValueChange={(v) => updateItem(item.url_origem, { campanha_tamanho: v === "__none__" ? null : (v as Tamanho) })}>
                              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">—</SelectItem>
                                <SelectItem value="P">P</SelectItem>
                                <SelectItem value="M">M</SelectItem>
                                <SelectItem value="G">G</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Status</Label>
                            <Select value={item.status} onValueChange={(v) => updateItem(item.url_origem, { status: v as StatusProd })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="lancamento">Lançamento</SelectItem>
                                <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
                                <SelectItem value="inativo">Inativo</SelectItem>
                                <SelectItem value="descontinuado">Descontinuado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Imagens ({item.imagens_selecionadas.length} remotas + {item.imagens_manuais.length} manuais)</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setManualTargetUrl(item.url_origem); manualInputRef.current?.click(); }}
                            disabled={manualUploading === item.url_origem}
                          >
                            {manualUploading === item.url_origem
                              ? <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              : <Upload className="mr-2 h-3 w-3" />}
                            Upload manual
                          </Button>
                        </div>
                        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded border p-2">
                          {item.imagens_selecionadas.length === 0 && item.imagens_manuais.length === 0 && (
                            <p className="col-span-3 py-8 text-center text-xs text-muted-foreground">
                              Nenhuma imagem selecionada.
                            </p>
                          )}
                          {[...item.imagens_selecionadas, ...item.imagens_manuais.map(() => null)].map((img, idx) => {
                            const isRemote = idx < item.imagens_selecionadas.length;
                            const remoteUrl = isRemote ? (img as string) : null;
                            const manual = !isRemote ? item.imagens_manuais[idx - item.imagens_selecionadas.length] : null;
                            const label = isRemote ? "remota" : "manual";
                            return (
                              <div
                                key={remoteUrl ?? manual?.storage_path ?? idx}
                                className="group relative aspect-square overflow-hidden rounded border bg-muted"
                                title={remoteUrl ?? manual?.nome ?? ""}
                              >
                                {remoteUrl && <img src={remoteUrl} alt="" className="h-full w-full object-cover" />}
                                {manual && (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                    {manual.nome.slice(0, 20)}
                                  </div>
                                )}
                                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-white">{label}</span>
                                {isRemote && (
                                  <button
                                    type="button"
                                    onClick={() => toggleImagem(item.url_origem, remoteUrl!)}
                                    className="absolute right-1 top-1 rounded bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <input
                ref={manualInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleManualUpload(e.target.files)}
              />
            </CardContent>
          </Card>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Log da importação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.map((log) => (
                <div key={log.url_origem} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {log.erros.length === 0
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="truncate font-mono text-xs">{log.url_origem}</span>
                    {log.criado && <Badge variant="default">Produto criado</Badge>}
                    {log.atualizado && <Badge variant="secondary">Produto atualizado</Badge>}
                    <Badge variant="outline">{log.imagens_importadas} importadas</Badge>
                    <Badge variant="outline">{log.imagens_encontradas} encontradas</Badge>
                    {log.imagens_ignoradas > 0 && <Badge variant="outline">{log.imagens_ignoradas} duplicadas</Badge>}
                  </div>
                  {log.erros.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
                      {log.erros.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
