import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Box, Users, FileImage, ArrowRight, Layers, Tags, Link2 } from "lucide-react";

import { PageHero } from "@/components/layout/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import heroProdutos from "@/assets/hero-produtos.jpg";
import heroMateriais from "@/assets/hero-materiais.jpg";
import heroCategorias from "@/assets/hero-categorias.jpg";
import heroFamilias from "@/assets/hero-familias.jpg";
import heroFornecedores from "@/assets/hero-fornecedores.jpg";
import heroArquivos from "@/assets/hero-arquivos.jpg";
import heroCompat from "@/assets/hero-compatibilidades.jpg";

export const Route = createFileRoute("/base-mestre/")({
  head: () => ({
    meta: [
      { title: "Base Mestre — JBL Trade Hub" },
      {
        name: "description",
        content: "Patrimônio digital do Trade Marketing JBL: produtos, materiais, categorias, famílias, fornecedores, arquivos e compatibilidades.",
      },
    ],
  }),
  component: BaseMestreIndex,
});

type Secao = {
  titulo: string;
  descricao: string;
  href: "/base-mestre/produtos" | "/base-mestre/materiais" | "/base-mestre/categorias" | "/base-mestre/familias" | "/base-mestre/fornecedores" | "/base-mestre/arquivos" | "/base-mestre/compatibilidades";
  icon: typeof Package;
  image: string;
};

const secoes: Secao[] = [
  { titulo: "Produtos", descricao: "SKUs, linhas e imagens oficiais.", href: "/base-mestre/produtos", icon: Package, image: heroProdutos },
  { titulo: "Materiais", descricao: "Displays, wobblers e materiais de PDV.", href: "/base-mestre/materiais", icon: Box, image: heroMateriais },
  { titulo: "Categorias", descricao: "Agrupamento comercial dos produtos.", href: "/base-mestre/categorias", icon: Tags, image: heroCategorias },
  { titulo: "Famílias", descricao: "Coleções e linhagens de produto.", href: "/base-mestre/familias", icon: Layers, image: heroFamilias },
  { titulo: "Fornecedores", descricao: "Parceiros de produção e serviços.", href: "/base-mestre/fornecedores", icon: Users, image: heroFornecedores },
  { titulo: "Arquivos", descricao: "Biblioteca única de artes e documentos.", href: "/base-mestre/arquivos", icon: FileImage, image: heroArquivos },
  { titulo: "Compatibilidades", descricao: "Relação entre produtos e materiais.", href: "/base-mestre/compatibilidades", icon: Link2, image: heroCompat },
];

function BaseMestreIndex() {
  return (
    <>
      <PageHero
        eyebrow="Base Mestre"
        title="O patrimônio digital do Trade JBL"
        description="Todo cadastro do sistema nasce aqui. As demais áreas apenas consomem e relacionam — nunca duplicam."
        image={heroProdutos}
      />
      <div className="container-page py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {secoes.map((s) => (
            <Link key={s.href} to={s.href} className="group focus-visible:outline-none">
              <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                  <img
                    src={s.image}
                    alt=""
                    loading="lazy"
                    width={1600}
                    height={900}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <CardHeader className="gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                        <s.icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{s.titulo}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">{s.descricao}</p>
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
