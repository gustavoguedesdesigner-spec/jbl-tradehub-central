import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Trash2, Upload, BookOpen } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { adicionarDocumento, removerDocumento } from "@/lib/produtos.functions";
import { registrarAssetVinculado } from "@/lib/biblioteca.functions";

interface Documento {
  id: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  versao: string | null;
  autor: string | null;
  storage_path: string;
  url_assinada?: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  guideline: boolean;
  data_documento: string | null;
  created_at: string;
  asset_id?: string | null;
}

const CATEGORIAS = [
  "Técnico",
  "Impressão",
  "3D",
  "Apresentação",
  "Planilha",
  "Contrato",
  "Brand Book",
  "Product Guidelines",
  "Quantum Guide",
  "Manual",
  "Outro",
];

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProdutoDocumentos({
  produtoId,
  documentos,
  apenasGuidelines = false,
}: {
  produtoId: string;
  documentos: Documento[];
  apenasGuidelines?: boolean;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState({
    categoria: apenasGuidelines ? "Brand Book" : "Técnico",
    versao: "",
    autor: "",
    descricao: "",
    guideline: apenasGuidelines,
  });

  const adicionarFn = useServerFn(adicionarDocumento);
  const removerFn = useServerFn(removerDocumento);
  const registrarFn = useServerFn(registrarAssetVinculado);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["produto", produtoId] });

  const remover = useMutation({
    mutationFn: (id: string) => removerFn({ data: { id } }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${produtoId}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage
          .from("produtos-documentos")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        await adicionarFn({
          data: {
            produto_id: produtoId,
            nome: file.name,
            storage_path: path,
            mime_type: file.type || null,
            tamanho_bytes: file.size,
            categoria: meta.categoria || null,
            descricao: meta.descricao || null,
            versao: meta.versao || null,
            autor: meta.autor || null,
            guideline: meta.guideline,
          },
        });
      }
      toast.success("Documentos enviados");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const lista = useMemo(
    () => documentos.filter((d) => (apenasGuidelines ? d.guideline : !d.guideline)),
    [documentos, apenasGuidelines],
  );

  const agrupados = useMemo(() => {
    const map = new Map<string, Documento[]>();
    for (const d of lista) {
      const key = d.categoria ?? "Sem categoria";
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [lista]);

  return (
    <div className="space-y-6">
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <Label className="text-xs">Categoria</Label>
            <Select value={meta.categoria} onValueChange={(v) => setMeta((m) => ({ ...m, categoria: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Versão</Label>
            <Input value={meta.versao} onChange={(e) => setMeta((m) => ({ ...m, versao: e.target.value }))} placeholder="1.0" />
          </div>
          <div>
            <Label className="text-xs">Autor</Label>
            <Input value={meta.autor} onChange={(e) => setMeta((m) => ({ ...m, autor: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Descrição</Label>
            <Input value={meta.descricao} onChange={(e) => setMeta((m) => ({ ...m, descricao: e.target.value }))} />
          </div>
          {!apenasGuidelines && (
            <div className="flex items-center gap-2 md:col-span-2">
              <Switch checked={meta.guideline} onCheckedChange={(v) => setMeta((m) => ({ ...m, guideline: v }))} />
              <Label className="text-xs">Marcar como Guideline</Label>
            </div>
          )}
          <div className={apenasGuidelines ? "md:col-span-6" : "md:col-span-4 md:col-start-3"}>
            <Button onClick={() => inputRef.current?.click()} disabled={uploading} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Enviando..." : "Enviar documentos"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {apenasGuidelines
            ? "Nenhum guideline anexado. Envie brand book, product guidelines ou manuais."
            : "Nenhum documento anexado ainda."}
        </div>
      ) : (
        <div className="space-y-6">
          {agrupados.map(([cat, itens]) => (
            <div key={cat}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {itens.map((d) => (
                  <Card key={d.id} className="group">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        {d.guideline ? <BookOpen className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.nome}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {d.versao && <span>v{d.versao}</span>}
                          {d.autor && <span>· {d.autor}</span>}
                          {d.tamanho_bytes && <span>· {formatBytes(d.tamanho_bytes)}</span>}
                          {d.guideline && <Badge variant="secondary" className="ml-1">Guideline</Badge>}
                        </div>
                        {d.descricao && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">{d.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {d.url_assinada && (
                          <Button size="icon" variant="ghost" asChild>
                            <a href={d.url_assinada} target="_blank" rel="noreferrer" download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => remover.mutate(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
