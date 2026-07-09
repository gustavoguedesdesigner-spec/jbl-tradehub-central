import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listarProdutos, excluirProduto } from "@/lib/produtos.functions";
import { listarLinhas } from "@/lib/linhas.functions";
import { listarCategorias } from "@/lib/categorias.functions";


const produtosOpts = queryOptions({
  queryKey: ["produtos"],
  queryFn: () => listarProdutos({ data: {} }),
});

export const Route = createFileRoute("/base-mestre/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(produtosOpts),
  component: ProdutosPage,
});

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  ativo: { label: "Ativo", variant: "default" },
  lancamento: { label: "Lançamento", variant: "secondary" },
  inativo: { label: "Inativo", variant: "outline" },
  descontinuado: { label: "Descontinuado", variant: "destructive" },
};

function ProdutosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: produtos } = useSuspenseQuery(produtosOpts);
  const { data: linhas = [] } = useQuery({ queryKey: ["linhas"], queryFn: () => listarLinhas() });
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: () => listarCategorias(),
  });

  const [busca, setBusca] = useState("");
  const [linha, setLinha] = useState<string>("todas");
  const [categoria, setCategoria] = useState<string>("todas");
  const [status, setStatus] = useState<string>("todos");

  const excluirFn = useServerFn(excluirProduto);
  const excluir = useMutation({
    mutationFn: (id: string) => excluirFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto excluído");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtrados = produtos.filter((p) => {
    if (busca && !`${p.sku} ${p.nome}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (linha !== "todas" && p.linha?.id !== linha) return false;
    if (categoria !== "todas" && p.categoria?.id !== categoria) return false;
    if (status !== "todos" && p.status !== status) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Base Mestre"
        title="Produtos JBL"
        description="Cadastro central de SKUs. Todas as demais áreas do sistema referenciam estes produtos."
        actions={
          <NovoProjetoInteligenteButton
            cadastroManualHref="/base-mestre/produtos/novo"
            cadastroManualLabel="Novo produto"
          />
        }
      />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU ou nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={linha} onValueChange={setLinha}>
            <SelectTrigger><SelectValue placeholder="Linha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as linhas</SelectItem>
              {linhas.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["todos", "ativo", "lancamento", "inativo", "descontinuado"] as const).map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus(s)}
            >
              {s === "todos" ? "Todos" : statusLabel[s]?.label ?? s}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Linha</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado. {produtos.length === 0 && (
                      <Link to="/base-mestre/produtos/novo" className="text-primary underline">
                        Cadastrar o primeiro
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((p) => {
                const s = statusLabel[p.status] ?? { label: p.status, variant: "outline" as const };
                const principal = p.imagens?.find((i) => i.principal) ?? p.imagens?.[0];
                const thumbUrl = (principal as { url_assinada?: string | null } | undefined)?.url_assinada ?? null;
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: "/base-mestre/produtos/$id", params: { id: p.id } })}
                  >
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 overflow-hidden rounded bg-muted">
                          {thumbUrl && (
                            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <span className="font-medium">{p.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.linha?.nome ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.categoria?.nome ?? "—"}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to="/base-mestre/produtos/$id" params={{ id: p.id }}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação removerá o produto <strong>{p.nome}</strong> e suas imagens. Não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => excluir.mutate(p.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
