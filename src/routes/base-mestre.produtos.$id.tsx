import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProdutoForm } from "@/components/produtos/ProdutoForm";
import { ProdutoGaleria } from "@/components/produtos/ProdutoGaleria";
import { ProdutoVideos } from "@/components/produtos/ProdutoVideos";
import { ProdutoDocumentos } from "@/components/produtos/ProdutoDocumentos";
import {
  ProdutoMateriais,
  ProdutoProjetos,
  ProdutoHistorico,
} from "@/components/produtos/ProdutoRelacionados";
import { obterProduto } from "@/lib/produtos.functions";
import { listarLinhas } from "@/lib/linhas.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import { listarFamilias } from "@/lib/familias.functions";

const produtoOpts = (id: string) =>
  queryOptions({
    queryKey: ["produto", id],
    queryFn: () => obterProduto({ data: { id } }),
  });

export const Route = createFileRoute("/base-mestre/produtos/$id")({
  head: () => ({ meta: [{ title: "Produto — JBL Trade Hub" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(produtoOpts(params.id)),
  component: ProdutoDetalhe,
});

const statusBadge: Record<string, { l: string; v: "default" | "secondary" | "outline" | "destructive" }> = {
  ativo: { l: "Ativo", v: "default" },
  lancamento: { l: "Lançamento", v: "secondary" },
  em_desenvolvimento: { l: "Em desenvolvimento", v: "outline" },
  inativo: { l: "Inativo", v: "outline" },
  descontinuado: { l: "Descontinuado", v: "destructive" },
};

const posicionamentoLabel: Record<string, string> = {
  entrada: "Entrada",
  intermediario: "Intermediário",
  premium: "Premium",
  hero: "Hero",
};

function ProdutoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: produto } = useSuspenseQuery(produtoOpts(id));
  const { data: linhas = [] } = useQuery({ queryKey: ["linhas"], queryFn: () => listarLinhas() });
  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });
  const { data: familias = [] } = useQuery({ queryKey: ["familias"], queryFn: () => listarFamilias() });

  const imagens = produto.imagens ?? [];
  const principal = imagens.find((i: { principal: boolean }) => i.principal) ?? imagens[0];
  const heroUrl = (principal as { url_assinada?: string | null } | undefined)?.url_assinada ?? null;
  const status = statusBadge[produto.status] ?? { l: produto.status, v: "outline" as const };

  return (
    <>
      {/* HERO */}
      <div className="border-b bg-gradient-to-b from-muted/40 to-background">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
            <Link to="/base-mestre/produtos"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos produtos</Link>
          </Button>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
              {heroUrl ? (
                <img src={heroUrl} alt={produto.nome} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem imagem principal
                </div>
              )}
              {produto.hero_product && (
                <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Star className="h-3 w-3" /> Hero Product
                </span>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {produto.linha?.nome ?? "Sem linha"} {produto.categoria?.nome && `· ${produto.categoria.nome}`}
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight lg:text-5xl">{produto.nome}</h1>
              {produto.descricao_curta && (
                <p className="mt-4 text-lg text-muted-foreground">{produto.descricao_curta}</p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Badge variant={status.v}>{status.l}</Badge>
                {produto.posicionamento && (
                  <Badge variant="outline">{posicionamentoLabel[produto.posicionamento]}</Badge>
                )}
                {produto.campanha_tamanho && (
                  <Badge variant="outline">Campanha {produto.campanha_tamanho}</Badge>
                )}
                {produto.familia?.nome && <Badge variant="outline">{produto.familia.nome}</Badge>}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">SKU</p>
                  <p className="font-mono">{produto.sku}</p>
                </div>
                {produto.codigo_jbl && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Código JBL</p>
                    <p className="font-mono">{produto.codigo_jbl}</p>
                  </div>
                )}
                {produto.data_lancamento && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Lançamento</p>
                    <p>{new Date(produto.data_lancamento).toLocaleDateString("pt-BR")}</p>
                  </div>
                )}
                {produto.preco_sugerido && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Preço sugerido</p>
                    <p>R$ {Number(produto.preco_sugerido).toFixed(2)}</p>
                  </div>
                )}
              </div>

              {imagens.length > 1 && (
                <div className="mt-6 flex gap-2 overflow-x-auto">
                  {imagens.slice(0, 8).map((img: { id: string; url_assinada?: string | null }) => (
                    <div key={img.id} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      {img.url_assinada && (
                        <img src={img.url_assinada} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Tabs defaultValue="visao">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="visao">Visão geral</TabsTrigger>
            <TabsTrigger value="galeria">Galeria ({imagens.length})</TabsTrigger>
            <TabsTrigger value="videos">Vídeos ({produto.videos?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
            <TabsTrigger value="materiais">Materiais compatíveis</TabsTrigger>
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="editar">Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardContent className="space-y-6 p-6">
                  {produto.descricao && (
                    <section>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Descrição</h2>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{produto.descricao}</p>
                    </section>
                  )}
                  {produto.features && produto.features.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Principais features</h2>
                      <ul className="space-y-2 text-sm">
                        {produto.features.map((f: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {produto.diferenciais && (
                    <section>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Diferenciais competitivos</h2>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{produto.diferenciais}</p>
                    </section>
                  )}
                  {produto.observacoes && (
                    <section>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Observações internas</h2>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{produto.observacoes}</p>
                    </section>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-4 p-6 text-sm">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ficha</h2>
                  <Row label="Linha" value={produto.linha?.nome} />
                  <Row label="Categoria" value={produto.categoria?.nome} />
                  <Row label="Família" value={produto.familia?.nome} />
                  <Row label="Posicionamento" value={produto.posicionamento ? posicionamentoLabel[produto.posicionamento] : null} />
                  <Row label="Campanha" value={produto.campanha_tamanho} />
                  <Row label="EAN" value={produto.ean} />
                  <Row label="Última atualização" value={new Date(produto.updated_at).toLocaleString("pt-BR")} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="galeria">
            <ProdutoGaleria produtoId={produto.id} imagens={imagens} />
          </TabsContent>
          <TabsContent value="videos">
            <ProdutoVideos produtoId={produto.id} videos={produto.videos ?? []} />
          </TabsContent>
          <TabsContent value="documentos">
            <ProdutoDocumentos produtoId={produto.id} documentos={produto.documentos ?? []} />
          </TabsContent>
          <TabsContent value="guidelines">
            <ProdutoDocumentos produtoId={produto.id} documentos={produto.documentos ?? []} apenasGuidelines />
          </TabsContent>
          <TabsContent value="materiais">
            <ProdutoMateriais produtoId={produto.id} />
          </TabsContent>
          <TabsContent value="projetos">
            <ProdutoProjetos produtoId={produto.id} />
          </TabsContent>
          <TabsContent value="historico">
            <ProdutoHistorico produtoId={produto.id} />
          </TabsContent>
          <TabsContent value="editar">
            <ProdutoForm
              produto={produto}
              linhas={linhas}
              categorias={categorias}
              familias={familias}
              onSaved={() => navigate({ to: "/base-mestre/produtos" })}
              onCancel={() => navigate({ to: "/base-mestre/produtos" })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span className="text-right">{value || "—"}</span>
    </div>
  );
}
