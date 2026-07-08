import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, Rocket, LayoutGrid, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const modulos = [
  {
    titulo: "Base Mestre",
    descricao:
      "Cadastro único de produtos, materiais de PDV, fornecedores e arquivos. Fonte da verdade compartilhada por todo o sistema.",
    href: "/base-mestre",
    icon: Database,
    status: "Disponível",
  },
  {
    titulo: "Central de Lançamentos",
    descricao:
      "Planejamento e acompanhamento de lançamentos, campanhas e briefings, sempre conectados aos produtos da Base Mestre.",
    href: "/lancamentos",
    icon: Rocket,
    status: "Em construção",
  },
  {
    titulo: "Menu Merchandising",
    descricao:
      "Catálogo operacional para o time de campo requisitar materiais por loja, campanha e ponto de venda.",
    href: "/merchandising",
    icon: LayoutGrid,
    status: "Em construção",
  },
] as const;

function Dashboard() {
  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="JBL Trade Hub"
        description="Centralize produtos, materiais, lançamentos, fornecedores e merchandising em uma única plataforma."
      />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {modulos.map((m) => (
            <Link
              key={m.href}
              to={m.href}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-md">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <m.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {m.status}
                    </span>
                  </div>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {m.titulo}
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </CardTitle>
                  <CardDescription className="mt-2">{m.descricao}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
