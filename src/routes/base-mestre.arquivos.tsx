import { createFileRoute } from "@tanstack/react-router";
import { FileImage } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/base-mestre/arquivos")({
  head: () => ({ meta: [{ title: "Arquivos — JBL Trade Hub" }] }),
  component: () => (
    <>
      <PageHeader
        eyebrow="Base Mestre"
        title="Arquivos"
        description="Repositório central de arquivos compartilhados entre os módulos."
      />
      <div className="container-page py-10">
        <Card className="border-dashed">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <FileImage className="h-5 w-5" />
            </div>
            <CardTitle>Em breve</CardTitle>
            <CardDescription>Repositório em construção.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </>
  ),
});
