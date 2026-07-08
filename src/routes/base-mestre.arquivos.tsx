import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { FileImage, FileText, File as FileIcon } from "lucide-react";

import { PageHero } from "@/components/layout/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listarArquivos } from "@/lib/arquivos.functions";
import heroImg from "@/assets/hero-arquivos.jpg";

const opts = queryOptions({ queryKey: ["arquivos"], queryFn: () => listarArquivos() });

export const Route = createFileRoute("/base-mestre/arquivos")({
  head: () => ({ meta: [{ title: "Arquivos — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: ArquivosPage,
});

function formatBytes(n?: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

function iconFor(mime?: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("pdf") || mime.startsWith("text/")) return FileText;
  return FileIcon;
}

function ArquivosPage() {
  const { data: arquivos } = useSuspenseQuery(opts);
  return (
    <>
      <PageHero
        eyebrow="Base Mestre"
        title="Arquivos"
        description="Biblioteca central de artes, fotos e documentos vinculáveis a produtos, materiais e campanhas."
        image={heroImg}
      />
      <div className="container-page py-12">
        {arquivos.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <FileImage className="h-5 w-5" />
              </div>
              <CardTitle>Nenhum arquivo na biblioteca</CardTitle>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Arquivos enviados em produtos, materiais e projetos aparecem aqui automaticamente.
              </p>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {arquivos.map((a) => {
              const Icon = iconFor(a.mime_type);
              const isImage = a.mime_type?.startsWith("image/") && a.url_publica;
              return (
                <Card key={a.id} className="overflow-hidden">
                  <div className="flex aspect-square items-center justify-center bg-neutral-100">
                    {isImage ? (
                      <img src={a.url_publica!} alt={a.nome} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Icon className="h-12 w-12 text-neutral-400" />
                    )}
                  </div>
                  <CardHeader className="gap-1">
                    <CardTitle className="truncate text-sm">{a.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="uppercase">{a.mime_type?.split("/")[1] ?? "arquivo"}</span>
                    <span>{formatBytes(a.tamanho_bytes)}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
