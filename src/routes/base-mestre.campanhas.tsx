import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Megaphone, Calendar, Rocket } from "lucide-react";

import { PageHero } from "@/components/layout/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listarCampanhas } from "@/lib/lancamentos.functions";
import heroImg from "@/assets/hero-arquivos.jpg";

const opts = queryOptions({ queryKey: ["campanhas"], queryFn: () => listarCampanhas() });

export const Route = createFileRoute("/base-mestre/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas — Base Mestre — JBL Trade Hub" },
      { name: "description", content: "Todas as campanhas de trade marketing JBL cadastradas na Base Mestre." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: CampanhasPage,
});

function CampanhasPage() {
  const { data: campanhas } = useSuspenseQuery(opts);
  return (
    <>
      <PageHero
        eyebrow="Base Mestre"
        title="Campanhas"
        description="Catálogo oficial de campanhas de trade marketing. Cada campanha pode ativar múltiplos lançamentos e receber assets exclusivos."
        image={heroImg}
      />
      <div className="container-page py-10">
        {campanhas.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center py-14">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <Megaphone className="h-5 w-5" />
              </div>
              <CardTitle>Nenhuma campanha cadastrada</CardTitle>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Campanhas são criadas ao iniciar um Projeto de Lançamento ou diretamente aqui em versões futuras.
              </p>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campanhas.map((c) => (
              <Card key={c.id} className="transition hover:shadow-md">
                <CardHeader className="gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-sm">
                      <Megaphone className="h-4 w-4" />
                    </div>
                    {c.status && <Badge variant="secondary">{c.status}</Badge>}
                  </div>
                  <CardTitle className="text-base">{c.nome}</CardTitle>
                  {c.codigo && <p className="text-xs text-muted-foreground">Código: {c.codigo}</p>}
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {c.data_inicio ?? "—"} → {c.data_fim ?? "—"}
                  </span>
                  <Link to="/lancamentos" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Rocket className="h-3 w-3" /> Lançamentos
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
