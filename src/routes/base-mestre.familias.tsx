import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Layers } from "lucide-react";
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
import { listarFamilias, criarFamilia } from "@/lib/familias.functions";
import heroImg from "@/assets/hero-familias.jpg";

const opts = queryOptions({ queryKey: ["familias"], queryFn: () => listarFamilias() });

export const Route = createFileRoute("/base-mestre/familias")({
  head: () => ({ meta: [{ title: "Famílias — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: FamiliasPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function FamiliasPage() {
  const qc = useQueryClient();
  const { data: familias } = useSuspenseQuery(opts);
  const criarFn = useServerFn(criarFamilia);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const criar = useMutation({
    mutationFn: (payload: { nome: string; slug: string; descricao: string | null }) =>
      criarFn({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["familias"] });
      toast.success("Família criada");
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
        title="Famílias"
        description="Coleções e linhagens que aproximam produtos com identidade comum — como Flip, Charge e Xtreme."
        image={heroImg}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova família</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova família</DialogTitle>
                <DialogDescription>Agrupa produtos por linhagem de coleção.</DialogDescription>
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
                  onClick={() => criar.mutate({ nome, slug: slugify(nome), descricao: descricao || null })}
                >
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="container-page py-12">
        {familias.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <Layers className="h-5 w-5" />
              </div>
              <CardTitle>Nenhuma família cadastrada</CardTitle>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Adicione a primeira família de produtos para organizar coleções.
              </p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nova família
              </Button>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {familias.map((f) => (
              <Card key={f.id} className="overflow-hidden">
                <div className="aspect-[16/9] bg-gradient-to-br from-neutral-900 to-neutral-700" />
                <CardHeader>
                  <CardTitle className="text-base">{f.nome}</CardTitle>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {f.descricao ?? "Sem descrição."}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-mono text-muted-foreground">{f.slug}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
