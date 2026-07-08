import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Box, Users, FileImage, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/base-mestre/")({
  head: () => ({
    meta: [
      { title: "Base Mestre — JBL Trade Hub" },
      {
        name: "description",
        content: "Cadastro único de produtos, materiais, fornecedores e arquivos da JBL.",
      },
    ],
  }),
  component: BaseMestreIndex,
});

const secoes = [
  {
    titulo: "Produtos JBL",
    descricao: "Cadastro central de SKUs, linhas, categorias e imagens.",
    href: "/base-mestre/produtos",
    icon: Package,
    status: "Disponível",
  },
  {
    titulo: "Materiais de PDV",
    descricao: "Displays, wobblers, adesivos e demais materiais de ponto de venda.",
    href: "/base-mestre/materiais",
    icon: Box,
    status: "Em breve",
  },
  {
    titulo: "Fornecedores",
    descricao: "Base única de fornecedores compartilhada por materiais e campanhas.",
    href: "/base-mestre/fornecedores",
    icon: Users,
    status: "Em breve",
  },
  {
    titulo: "Arquivos",
    descricao: "Biblioteca central de artes, fotos e documentos vinculáveis.",
    href: "/base-mestre/arquivos",
    icon: FileImage,
    status: "Em breve",
  },
];

function BaseMestreIndex() {
  return (
    <>
      <PageHeader
        eyebrow="Base Mestre"
        title="Fonte da verdade do Trade JBL"
        description="Todo cadastro do sistema nasce aqui. As demais áreas apenas consomem e relacionam."
      />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {secoes.map((s) => {
            const disponivel = s.status === "Disponível";
            const Wrapper = disponivel
              ? (props: { children: React.ReactNode }) => (
                  <Link to={s.href} className="group focus-visible:outline-none">
                    {props.children}
                  </Link>
                )
              : (props: { children: React.ReactNode }) => <div>{props.children}</div>;
            return (
              <Wrapper key={s.href}>
                <Card
                  className={
                    "h-full transition-all " +
                    (disponivel
                      ? "group-hover:border-primary/50 group-hover:shadow-md cursor-pointer"
                      : "opacity-60")
                  }
                >
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <s.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {s.status}
                      </span>
                    </div>
                    <CardTitle className="flex items-center justify-between text-base">
                      {s.titulo}
                      {disponivel && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2 text-xs">{s.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent />
                </Card>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </>
  );
}
