import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Link2 } from "lucide-react";

import { PageHero } from "@/components/layout/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listarCompatibilidades } from "@/lib/compatibilidades.functions";
import heroImg from "@/assets/hero-compatibilidades.jpg";

const opts = queryOptions({
  queryKey: ["compatibilidades"],
  queryFn: () => listarCompatibilidades(),
});

export const Route = createFileRoute("/base-mestre/compatibilidades")({
  head: () => ({ meta: [{ title: "Compatibilidades — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: CompatibilidadesPage,
});

function CompatibilidadesPage() {
  const { data: items } = useSuspenseQuery(opts);
  return (
    <>
      <PageHero
        eyebrow="Base Mestre"
        title="Compatibilidades"
        description="Relaciona produtos aos materiais de PDV que podem exibi-los. Fonte única para o Merchandising e Lançamentos."
        image={heroImg}
      />
      <div className="container-page py-12">
        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <Link2 className="h-5 w-5" />
              </div>
              <CardTitle>Nenhuma compatibilidade registrada</CardTitle>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                As compatibilidades são criadas ao vincular materiais aos produtos em suas páginas de detalhe.
              </p>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-100">
                      <Link2 className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Produto</Badge>
                        <CardTitle className="text-base">{c.produto?.nome ?? "—"}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">Material</Badge>
                        {c.material?.nome ?? "—"}{" "}
                        {c.material?.codigo && (
                          <span className="font-mono text-xs">· {c.material.codigo}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {c.observacao && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{c.observacao}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
