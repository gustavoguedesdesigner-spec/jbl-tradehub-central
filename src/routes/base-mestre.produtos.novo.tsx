import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { ProdutoForm } from "@/components/produtos/ProdutoForm";
import { listarLinhas } from "@/lib/linhas.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import { listarFamilias } from "@/lib/familias.functions";

export const Route = createFileRoute("/base-mestre/produtos/novo")({
  head: () => ({ meta: [{ title: "Novo produto — JBL Trade Hub" }] }),
  component: NovoProduto,
});

function NovoProduto() {
  const navigate = useNavigate();
  const { data: linhas = [] } = useQuery({ queryKey: ["linhas"], queryFn: () => listarLinhas() });
  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });
  const { data: familias = [] } = useQuery({ queryKey: ["familias"], queryFn: () => listarFamilias() });

  return (
    <>
      <PageHeader eyebrow="Base Mestre / Produtos" title="Novo produto" />
      <div className="mx-auto max-w-5xl px-6 py-6">
        <ProdutoForm
          linhas={linhas}
          categorias={categorias}
          familias={familias}
          onSaved={(id) => navigate({ to: "/base-mestre/produtos/$id", params: { id } })}
          onCancel={() => navigate({ to: "/base-mestre/produtos" })}
        />
      </div>
    </>
  );
}

