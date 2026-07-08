import { createFileRoute } from "@tanstack/react-router";
import { Rocket, CalendarClock, FileText, Megaphone } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/lancamentos")({
  head: () => ({
    meta: [
      { title: "Central de Lançamentos — JBL Trade Hub" },
      {
        name: "description",
        content: "Planejamento e acompanhamento de lançamentos, campanhas e briefings da JBL.",
      },
    ],
  }),
  component: LancamentosPage,
});

const areas = [
  {
    titulo: "Cronograma de lançamentos",
    descricao: "Linha do tempo dos produtos que serão lançados, com status e responsáveis.",
    icon: CalendarClock,
  },
  {
    titulo: "Campanhas",
    descricao: "Ações promocionais vinculadas a produtos e materiais de PDV.",
    icon: Megaphone,
  },
  {
    titulo: "Briefings",
    descricao: "Documentação estruturada de cada lançamento, sempre conectada à Base Mestre.",
    icon: FileText,
  },
];

function LancamentosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Central de Lançamentos"
        title="Coordenação de lançamentos, campanhas e briefings"
        description="Módulo em construção. A estrutura relacional já está pronta e conectada à Base Mestre."
      />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Rocket className="h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-medium">Fundação pronta.</p>
            <p className="text-muted-foreground">
              As tabelas de lançamentos, campanhas e briefings já existem no banco e se relacionam
              com os produtos cadastrados na Base Mestre. Vamos construir as telas na próxima etapa.
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
