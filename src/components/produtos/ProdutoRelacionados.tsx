import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Box, Package, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listarHistoricoProduto,
  listarMateriaisCompativeis,
  listarProjetosDoProduto,
} from "@/lib/produtos.functions";

export function ProdutoMateriais({ produtoId }: { produtoId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["produto-materiais", produtoId],
    queryFn: () => listarMateriaisCompativeis({ data: { produto_id: produtoId } }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Nenhum material de PDV compatível cadastrado. Vá em Base Mestre → Compatibilidades para vincular.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((c) => (
        <Card key={c.id} className="overflow-hidden">
          <div className="flex aspect-[4/3] items-center justify-center bg-muted">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.material?.nome}</p>
                <p className="text-xs text-muted-foreground">{c.material?.codigo}</p>
              </div>
              {c.material?.tipo && <Badge variant="outline">{c.material.tipo}</Badge>}
            </div>
            {c.observacao && <p className="text-xs text-muted-foreground">{c.observacao}</p>}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/base-mestre/materiais">Ver material <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProdutoProjetos({ produtoId }: { produtoId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["produto-projetos", produtoId],
    queryFn: () => listarProjetosDoProduto({ data: { produto_id: produtoId } }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Este produto ainda não participou de nenhum projeto de lançamento.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((p) => {
        const l = p.lancamento;
        if (!l) return null;
        const ano = l.data_lancamento?.slice(0, 4) ?? l.data_prevista?.slice(0, 4) ?? "—";
        return (
          <Card key={p.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Box className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{l.nome}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {l.campanha?.nome && <span>{l.campanha.nome}</span>}
                  <span>· {ano}</span>
                  <Badge variant="outline">{l.status}</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/lancamentos">Abrir <ArrowRight className="ml-2 h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const acaoLabel: Record<string, string> = {
  criado: "Produto criado",
  atualizado: "Produto atualizado",
  imagem_adicionada: "Imagem adicionada",
  imagem_removida: "Imagem removida",
  video_adicionado: "Vídeo adicionado",
  video_removido: "Vídeo removido",
  documento_adicionado: "Documento adicionado",
  documento_removido: "Documento removido",
  status_alterado: "Status alterado",
};

export function ProdutoHistorico({ produtoId }: { produtoId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["produto-historico", produtoId],
    queryFn: () => listarHistoricoProduto({ data: { produto_id: produtoId } }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Sem histórico ainda.
      </div>
    );
  }

  return (
    <div className="relative border-l pl-6">
      {data.map((h) => (
        <div key={h.id} className="relative mb-6 last:mb-0">
          <span className="absolute -left-[29px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Clock className="h-3 w-3" />
          </span>
          <p className="text-sm font-medium">{acaoLabel[h.acao] ?? h.acao}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(h.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}
