import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Upload, Youtube, Link2, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { adicionarVideo, removerVideo } from "@/lib/produtos.functions";

interface Video {
  id: string;
  origem: "upload" | "youtube" | "vimeo";
  titulo: string | null;
  url: string | null;
  storage_path: string | null;
  url_assinada?: string | null;
  ordem: number;
}

function embedFromUrl(v: Video): string | null {
  if (v.origem === "upload") return v.url_assinada ?? null;
  if (!v.url) return null;
  if (v.origem === "youtube") {
    const m = v.url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }
  const m = v.url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

export function ProdutoVideos({ produtoId, videos }: { produtoId: string; videos: Video[] }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitulo, setLinkTitulo] = useState("");

  const adicionarFn = useServerFn(adicionarVideo);
  const removerFn = useServerFn(removerVideo);
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
        const ext = file.name.split(".").pop() ?? "mp4";
        const path = `${produtoId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("produtos-videos")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        await adicionarFn({
          data: { produto_id: produtoId, origem: "upload", storage_path: path, titulo: file.name },
        });
      }
      toast.success("Vídeos enviados");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function adicionarLink() {
    if (!linkUrl.trim()) return;
    const origem: "youtube" | "vimeo" = /vimeo/i.test(linkUrl) ? "vimeo" : "youtube";
    try {
      await adicionarFn({
        data: { produto_id: produtoId, origem, url: linkUrl.trim(), titulo: linkTitulo || null },
      });
      setLinkUrl("");
      setLinkTitulo("");
      invalidate();
      toast.success("Vídeo adicionado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  }

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto_auto]">
          <Input placeholder="Título (opcional)" value={linkTitulo} onChange={(e) => setLinkTitulo(e.target.value)} />
          <Input placeholder="Link do YouTube ou Vimeo" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <Button variant="outline" onClick={adicionarLink}>
            <Link2 className="mr-2 h-4 w-4" /> Adicionar link
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Enviando..." : "Upload MP4/MOV/WebM"}
          </Button>
        </CardContent>
      </Card>

      {videos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Nenhum vídeo ainda.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {videos.map((v) => {
            const embed = embedFromUrl(v);
            return (
              <Card key={v.id} className="overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {v.origem === "upload" && embed ? (
                    <video src={embed} controls className="h-full w-full" />
                  ) : embed ? (
                    <iframe src={embed} className="h-full w-full" allowFullScreen />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      Sem preview
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{v.titulo ?? "Vídeo"}</p>
                    <p className="text-xs uppercase text-muted-foreground">{v.origem}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remover.mutate(v.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
