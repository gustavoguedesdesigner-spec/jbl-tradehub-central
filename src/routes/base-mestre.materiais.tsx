import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Box } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listarMateriais, criarMaterial } from "@/lib/materiais.functions";
import heroImg from "@/assets/hero-materiais.jpg";

const opts = queryOptions({ queryKey: ["materiais"], queryFn: () => listarMateriais() });

export const Route = createFileRoute("/base-mestre/materiais")({
  head: () => ({ meta: [{ title: "Materiais de PDV — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: MateriaisPage,
});

function MateriaisPage() {
  const qc = useQueryClient();
  const { data: materiais } = useSuspenseQuery(opts);
  const criarFn = useServerFn(criarMaterial);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ codigo: "", nome: "", tipo: "", dimensoes: "", descricao: "" });

  const criar = useMutation({
    mutationFn: () =>
      criarFn({
        data: {
          codigo: form.codigo,
          nome: form.nome,
          tipo: form.tipo || null,
          dimensoes: form.dimensoes || null,
          descricao: form.descricao || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materiais"] });
      toast.success("Material criado");
      setOpen(false);
      setForm({ codigo: "", nome: "", tipo: "", dimensoes: "", descricao: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHero
        eyebrow="Base Mestre"
        title="Materiais de PDV"
        description="Displays, wobblers, adesivos e demais materiais de ponto de venda — cadastro único referenciado pelo Merchandising."
        image={heroImg}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo material</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo material</DialogTitle>
                <DialogDescription>Cadastre o material de PDV.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Código</Label>
                    <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Input placeholder="Display, wobbler…" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Dimensões</Label>
                  <Input placeholder="Ex.: 30 × 40 × 20 cm" value={form.dimensoes} onChange={(e) => setForm({ ...form, dimensoes: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button disabled={!form.codigo || !form.nome || criar.isPending} onClick={() => criar.mutate()}>
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="container-page py-12">
        {materiais.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <Box className="h-5 w-5" />
              </div>
              <CardTitle>Nenhum material cadastrado</CardTitle>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Cadastre o primeiro material de PDV para começar a montar campanhas.
              </p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Novo material
              </Button>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {materiais.map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                  <Box className="h-12 w-12 text-neutral-400" />
                </div>
                <CardHeader className="gap-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{m.nome}</CardTitle>
                    {m.tipo && <Badge variant="outline">{m.tipo}</Badge>}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{m.codigo}</p>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {m.dimensoes && <p className="text-muted-foreground">Dimensões: {m.dimensoes}</p>}
                  {m.fornecedor?.nome && (
                    <p className="text-muted-foreground">Fornecedor: {m.fornecedor.nome}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
