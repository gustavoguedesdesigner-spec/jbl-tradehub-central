import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Trash2, Upload, Maximize2, ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  adicionarImagem,
  atualizarImagem,
  definirImagemPrincipal,
  removerImagem,
  reordenarImagens,
} from "@/lib/produtos.functions";
import { registrarAssetVinculado } from "@/lib/biblioteca.functions";

interface Imagem {
  id: string;
  storage_path: string;
  url_publica?: string | null;
  url_assinada?: string | null;
  ordem: number;
  principal: boolean;
  legenda?: string | null;
  tipo?: string | null;
  asset_id?: string | null;
}

const TIPOS = [
  { v: "fundo_branco", l: "Fundo branco" },
  { v: "lifestyle", l: "Lifestyle" },
  { v: "render_3d", l: "Render 3D" },
  { v: "detalhe", l: "Detalhe" },
  { v: "em_uso", l: "Em uso" },
  { v: "loja", l: "Em loja" },
  { v: "campanha", l: "Campanha" },
  { v: "historica", l: "Histórica" },
];

export function ProdutoGaleria({ produtoId, imagens }: { produtoId: string; imagens: Imagem[] }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const adicionarFn = useServerFn(adicionarImagem);
  const removerFn = useServerFn(removerImagem);
  const atualizarFn = useServerFn(atualizarImagem);
  const principalFn = useServerFn(definirImagemPrincipal);
  const reordenarFn = useServerFn(reordenarImagens);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["produto", produtoId] });

  const remover = useMutation({
    mutationFn: (id: string) => removerFn({ data: { id } }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const setPrincipal = useMutation({
    mutationFn: (id: string) => principalFn({ data: { id, produto_id: produtoId } }),
    onSuccess: invalidate,
  });

  const salvarMeta = useMutation({
    mutationFn: (v: { id: string; legenda?: string | null; tipo?: string | null }) =>
      atualizarFn({ data: v }),
    onSuccess: invalidate,
  });

  const ordenadas = imagens.slice().sort((a, b) => a.ordem - b.ordem);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${produtoId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("produtos").upload(path, file, {
          contentType: file.type,
        });
        if (upErr) throw upErr;
        await adicionarFn({
          data: { produto_id: produtoId, storage_path: path, url_publica: path, principal: false },
        });
      }
      toast.success("Imagens adicionadas");
      invalidate();
      qc.invalidateQueries({ queryKey: ["produtos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = ordenadas.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reordenarFn({ data: { ordem: ids } }).then(invalidate);
    setDragId(null);
  }

  const preview = previewIndex != null ? ordenadas[previewIndex] : null;

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {ordenadas.length} {ordenadas.length === 1 ? "imagem" : "imagens"} · arraste para reordenar
        </p>
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Enviando..." : "Enviar imagens"}
        </Button>
      </div>

      {ordenadas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Nenhuma imagem ainda. Envie fotos em alta resolução, renders e lifestyle.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordenadas.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDragId(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(img.id)}
              className="group overflow-hidden rounded-xl border bg-card"
            >
              <div className="relative aspect-square bg-muted">
                {img.url_assinada && (
                  <img
                    src={img.url_assinada}
                    alt={img.legenda ?? ""}
                    className="h-full w-full object-cover"
                  />
                )}
                {img.principal && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    <Star className="h-3 w-3" /> Principal
                  </span>
                )}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="icon" variant="secondary" onClick={() => setPreviewIndex(idx)}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  {!img.principal && (
                    <Button size="icon" variant="secondary" onClick={() => setPrincipal.mutate(img.id)}>
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="destructive" onClick={() => remover.mutate(img.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 p-3">
                <Input
                  placeholder="Legenda"
                  defaultValue={img.legenda ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (img.legenda ?? ""))
                      salvarMeta.mutate({ id: img.id, legenda: e.target.value, tipo: img.tipo ?? null });
                  }}
                />
                <Select
                  value={img.tipo ?? "__none__"}
                  onValueChange={(v) =>
                    salvarMeta.mutate({ id: img.id, legenda: img.legenda ?? null, tipo: v === "__none__" ? null : v })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem tipo</SelectItem>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={preview != null} onOpenChange={(o) => !o && setPreviewIndex(null)}>
        <DialogContent className="max-w-6xl border-0 bg-black/95 p-0">
          {preview && (
            <div className="relative">
              <img
                src={preview.url_assinada ?? ""}
                alt={preview.legenda ?? ""}
                className="max-h-[85vh] w-full object-contain"
              />
              {preview.legenda && (
                <p className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 text-center text-sm text-white">
                  {preview.legenda}
                </p>
              )}
              {ordenadas.length > 1 && (
                <>
                  <button
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                    onClick={() => setPreviewIndex((i) => (i == null ? 0 : (i - 1 + ordenadas.length) % ordenadas.length))}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                    onClick={() => setPreviewIndex((i) => (i == null ? 0 : (i + 1) % ordenadas.length))}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
