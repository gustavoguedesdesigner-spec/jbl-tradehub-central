import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Box, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { listarMateriais, criarMaterial } from "@/lib/materiais.functions";
import { listarFornecedores } from "@/lib/fornecedores.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import heroImg from "@/assets/hero-materiais.jpg";

const opts = queryOptions({ queryKey: ["materiais"], queryFn: () => listarMateriais() });

export const Route = createFileRoute("/base-mestre/materiais")({
  head: () => ({ meta: [{ title: "Biblioteca de Materiais — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: MateriaisPage,
});

const statusMap: Record<string, { l: string; v: "default" | "secondary" | "outline" | "destructive" }> = {
  ativo: { l: "Ativo", v: "default" },
  em_desenvolvimento: { l: "Em desenvolvimento", v: "secondary" },
  rascunho: { l: "Rascunho", v: "outline" },
  descontinuado: { l: "Descontinuado", v: "destructive" },
};

function MateriaisPage() {
  const qc = useQueryClient();
  const { data: materiais } = useSuspenseQuery(opts);
  const { data: fornecedores = [] } = useQuery({ queryKey: ["fornecedores"], queryFn: () => listarFornecedores() });
  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });
  const criarFn = useServerFn(criarMaterial);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("__all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    codigo: "", nome: "", tipo: "", dimensoes: "", descricao: "",
    fornecedor_id: "", categoria_id: "", status: "rascunho",
  });

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (materiais as any[]).filter((m) => {
      if (filtroStatus !== "__all" && m.status !== filtroStatus) return false;
      if (!t) return true;
      return (
        m.nome?.toLowerCase().includes(t) ||
        m.codigo?.toLowerCase().includes(t) ||
        m.tipo?.toLowerCase().includes(t)
      );
    });
  }, [materiais, busca, filtroStatus]);

  const criar = useMutation({
    mutationFn: () =>
      criarFn({
        data: {
          codigo: form.codigo, nome: form.nome,
          tipo: form.tipo || null, dimensoes: form.dimensoes || null,
          descricao: form.descricao || null,
          fornecedor_id: form.fornecedor_id || null,
          categoria_id: form.categoria_id || null,
          status: form.status as "rascunho" | "em_desenvolvimento" | "ativo" | "descontinuado",
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materiais"] });
      toast.success("Material criado");
      setOpen(false);
      setForm({ codigo: "", nome: "", tipo: "", dimensoes: "", descricao: "", fornecedor_id: "", categoria_id: "", status: "rascunho" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHero
        eyebrow="Base Mestre"
        title="Biblioteca de Materiais"
        description="Displays, wobblers, adesivos e demais materiais de PDV — cada peça com sua própria página tipo e-commerce."
        image={heroImg}
        actions={
          <Link to="/base-mestre/materiais/novo">
            <Button><Plus className="mr-2 h-4 w-4" /> Novo material</Button>
          </Link>
        }
      />


      <div className="container-page py-12">
        {/* Filtros */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, código ou tipo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="descontinuado">Descontinuados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtrados.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <Box className="h-5 w-5" />
              </div>
              <CardTitle>Nenhum material encontrado</CardTitle>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">Ajuste os filtros ou cadastre um novo material.</p>
              <Link to="/base-mestre/materiais/novo">
                <Button className="mt-4"><Plus className="mr-2 h-4 w-4" /> Novo material</Button>
              </Link>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(filtrados as any[]).map((m) => {
              const principal = m.imagens?.find((i: { principal: boolean }) => i.principal) ?? m.imagens?.[0];
              const status = statusMap[m.status] ?? { l: m.status, v: "outline" as const };
              return (
                <Link key={m.id} to="/base-mestre/materiais/$id" params={{ id: m.id }}>
                  <Card className="overflow-hidden transition hover:shadow-xl">
                    <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200">
                      {principal?.url_assinada ? (
                        <img src={principal.url_assinada} alt={m.nome} className="h-full w-full object-cover" />
                      ) : (
                        <Box className="h-16 w-16 text-neutral-400" />
                      )}
                      <Badge variant={status.v} className="absolute left-3 top-3">{status.l}</Badge>
                    </div>
                    <CardHeader className="gap-1">
                      <p className="font-mono text-xs text-muted-foreground">{m.codigo}</p>
                      <CardTitle className="text-base leading-tight">{m.nome}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {m.tipo && <Badge variant="outline">{m.tipo}</Badge>}
                        {m.categoria?.nome && <Badge variant="outline">{m.categoria.nome}</Badge>}
                      </div>
                      {m.dimensoes && <p className="pt-1 text-muted-foreground">{m.dimensoes}</p>}
                      {m.fornecedor?.nome && <p className="text-muted-foreground">Fornecedor: {m.fornecedor.nome}</p>}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
