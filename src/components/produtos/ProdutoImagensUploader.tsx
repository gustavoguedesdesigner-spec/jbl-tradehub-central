import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adicionarImagem, removerImagem } from "@/lib/produtos.functions";
import { registrarAssetVinculado } from "@/lib/biblioteca.functions";

interface Imagem {
  id: string;
  storage_path: string;
  url_publica: string | null;
  url_assinada?: string | null;
  ordem: number;
  principal: boolean;
  asset_id?: string | null;
}

export function ProdutoImagensUploader({ produtoId, imagens }: { produtoId: string; imagens: Imagem[] }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const adicionarFn = useServerFn(adicionarImagem);
  const removerFn = useServerFn(removerImagem);
  const registrarFn = useServerFn(registrarAssetVinculado);

  const remover = useMutation({
    mutationFn: (id: string) => removerFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produto", produtoId] }),
    onError: (e) => toast.error(e.message),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `produto/${produtoId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("assets").upload(path, file, {
          contentType: file.type,
        });
        if (upErr) throw upErr;
        const { asset_id } = await registrarFn({
          data: {
            nome: file.name,
            storage_path: path,
            tipo: "imagem",
            mime_type: file.type || null,
            peso_bytes: file.size,
            formato: ext,
            entidade_tipo: "produto",
            entidade_id: produtoId,
            papel: "imagem_produto",
          },
        });
        await adicionarFn({
          data: {
            produto_id: produtoId,
            storage_path: path,
            url_publica: path,
            principal: false,
            bucket: "assets",
            asset_id,
          },
        });
      }
      toast.success("Imagens adicionadas à Biblioteca de Mídia");
      qc.invalidateQueries({ queryKey: ["produto", produtoId] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Enviando..." : "Enviar imagens"}
      </Button>

      {imagens.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
          Nenhuma imagem ainda.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {imagens
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((img) => {
            const url = img.url_assinada ?? null;
            return (
              <div key={img.id} className="group relative overflow-hidden rounded-md border bg-muted">
                {url && <img src={url} alt="" className="aspect-square w-full object-cover" />}

                {img.principal && (
                  <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    <Star className="h-3 w-3" /> Principal
                  </span>
                )}
                {!img.asset_id && (
                  <span
                    title="Arquivo legado — ainda não migrado para a Biblioteca de Mídia"
                    className="absolute bottom-1 left-1 rounded bg-amber-500/95 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                  >
                    Legado
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remover.mutate(img.id)}
                  className="absolute right-1 top-1 rounded bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remover imagem"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
