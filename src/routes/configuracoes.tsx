import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — JBL Trade Hub" },
      { name: "description", content: "Ajustes da plataforma JBL Trade Hub." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Preferências da plataforma"
        description="Usuários, permissões, integrações e parâmetros gerais do sistema."
      />
      <div className="container-page py-10">
        <Card className="border-dashed">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <Settings className="h-5 w-5" />
            </div>
            <CardTitle>Módulo em construção</CardTitle>
            <CardDescription>
              Será liberado junto com o módulo de autenticação e perfis.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </>
  );
}
