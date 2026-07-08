import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/base-mestre/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — JBL Trade Hub" }] }),
  component: () => (
    <>
      <PageHeader
        eyebrow="Base Mestre"
        title="Fornecedores"
        description="Cadastro compartilhado de fornecedores de materiais e serviços."
      />
      <div className="container-page py-10">
        <Card className="border-dashed">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <Users className="h-5 w-5" />
            </div>
            <CardTitle>Em breve</CardTitle>
            <CardDescription>Tela de cadastro em construção.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </>
  ),
});
