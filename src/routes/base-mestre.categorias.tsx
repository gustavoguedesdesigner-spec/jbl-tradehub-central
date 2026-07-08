import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Tags } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listarCategorias, criarCategoria } from "@/lib/categorias.functions";
import heroImg from "@/assets/hero-categorias.jpg";

const opts = queryOptions({
  queryKey: ["categorias"],
  queryFn: () => listarCategorias(),
});

export const Route = createFileRoute("/base-mestre/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: CategoriasPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CategoriasPage() {
  const qc = useQueryClient();
  const { data: categorias } = useSuspenseQuery(opts);
  const criarFn = useServerFn(criarCategoria);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const criar = useMutation({
    mutationFn: (payload: { nome: string; slug: string; descricao: string | null }) =>
      criarFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] });
      toast.success("Categoria criada");
      setOpen(false);
      setNome("");
      setDescricao("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHero
        eyebrow="Base Mestre"
        title="Categorias"
        description="Agrupamento comercial que organiza a leitura dos produtos em todo o sistema."
        image={heroImg}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nova categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova categoria</DialogTitle>
                <DialogDescription>Usada para classificar produtos e materiais.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  disabled={!nome || criar.isPending}
                  onClick={() =>
                    criar.mutate({
                      nome,
                      slug: slugify(nome),
                      descricao: descricao || null,
                    })
                  }
                >
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="container-page py-12">
        {categorias.length === 0 ? (
          <EmptyState onNew={() => setOpen(true)} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <div className="aspect-[16/9] bg-gradient-to-br from-neutral-100 to-neutral-200">
                  <div className="flex h-full items-center justify-center">
                    <Tags className="h-10 w-10 text-neutral-400" />
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-base">{c.nome}</CardTitle>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {c.descricao ?? "Sem descrição."}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-mono text-muted-foreground">{c.slug}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
          <Tags className="h-5 w-5" />
        </div>
        <CardTitle>Nenhuma categoria ainda</CardTitle>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Cadastre a primeira categoria para começar a organizar os produtos.
        </p>
        <Button className="mt-4" onClick={onNew}>
          <Plus className="mr-2 h-4 w-4" /> Nova categoria
        </Button>
      </CardHeader>
    </Card>
  );
}
