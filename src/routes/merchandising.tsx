import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid, Store, ShoppingBag, ClipboardList } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/merchandising")({
  head: () => ({
    meta: [
      { title: "Menu Merchandising — JBL Trade Hub" },
      {
        name: "description",
        content: "Catálogo operacional para o time de campo requisitar materiais de PDV.",
      },
    ],
  }),
  component: MerchandisingPage,
});

const areas = [
  {
    titulo: "Catálogo por loja",
    descricao: "Materiais disponíveis por rede, formato e ponto de venda.",
    icon: Store,
  },
  {
    titulo: "Requisições",
    descricao: "Solicitações de materiais feitas pelo time de campo.",
    icon: ShoppingBag,
  },
  {
    titulo: "Cadernos de merchandising",
    descricao: "Kits pré-montados de PDV vinculados a campanhas e lançamentos.",
    icon: ClipboardList,
  },
];

function MerchandisingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Menu Merchandising"
        title="Operação de PDV no dia a dia"
        description="Módulo em construção. Consumirá materiais, produtos e campanhas cadastrados nos módulos anteriores, sem duplicar nada."
      />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-medium">Aguardando definição funcional detalhada.</p>
            <p className="text-muted-foreground">
              A infraestrutura está pronta para receber o fluxo de requisição de materiais assim
              que definirmos as regras junto ao time de trade.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {areas.map((a) => (
            <Card key={a.titulo} className="opacity-80">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <a.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{a.titulo}</CardTitle>
                <CardDescription className="text-xs">{a.descricao}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Em breve
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
