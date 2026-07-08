import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { ProdutoForm } from "@/components/produtos/ProdutoForm";
import { ProdutoImagensUploader } from "@/components/produtos/ProdutoImagensUploader";
import { obterProduto } from "@/lib/produtos.functions";
import { listarLinhas } from "@/lib/linhas.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const produtoOpts = (id: string) =>
  queryOptions({
    queryKey: ["produto", id],
    queryFn: () => obterProduto({ data: { id } }),
  });

export const Route = createFileRoute("/base-mestre/produtos/$id")({
  head: () => ({ meta: [{ title: "Editar produto — JBL Trade Hub" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(produtoOpts(params.id)),
  component: EditarProduto,
});

function EditarProduto() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: produto } = useSuspenseQuery(produtoOpts(id));
  const { data: linhas = [] } = useQuery({ queryKey: ["linhas"], queryFn: () => listarLinhas() });
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: () => listarCategorias(),
  });

  return (
    <>
      <PageHeader
        eyebrow="Base Mestre / Produtos"
        title={produto.nome}
        description={`SKU ${produto.sku}`}
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_360px]">
        <ProdutoForm
          produto={produto}
          linhas={linhas}
          categorias={categorias}
          onSaved={() => navigate({ to: "/base-mestre/produtos" })}
          onCancel={() => navigate({ to: "/base-mestre/produtos" })}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imagens</CardTitle>
          </CardHeader>
          <CardContent>
            <ProdutoImagensUploader produtoId={produto.id} imagens={produto.imagens ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
