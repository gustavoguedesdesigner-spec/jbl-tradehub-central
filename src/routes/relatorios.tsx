import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — JBL Trade Hub" },
      { name: "description", content: "Indicadores e relatórios do Trade Marketing JBL." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Relatórios"
        title="Indicadores do Trade Marketing"
        description="Análises consolidadas de produtos, materiais, lançamentos e execução de PDV."
      />
      <div className="container-page py-10">
        <Card className="border-dashed">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <BarChart3 className="h-5 w-5" />
            </div>
            <CardTitle>Módulo em construção</CardTitle>
            <CardDescription>
              Os relatórios serão gerados a partir dos dados cadastrados nos demais módulos, sem
              duplicação.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </>
  );
}
