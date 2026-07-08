import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Users } from "lucide-react";
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
import { listarFornecedores, criarFornecedor } from "@/lib/fornecedores.functions";
import heroImg from "@/assets/hero-fornecedores.jpg";

const opts = queryOptions({ queryKey: ["fornecedores"], queryFn: () => listarFornecedores() });

export const Route = createFileRoute("/base-mestre/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — Base Mestre — JBL Trade Hub" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: FornecedoresPage,
});

function FornecedoresPage() {
  const qc = useQueryClient();
  const { data: fornecedores } = useSuspenseQuery(opts);
  const criarFn = useServerFn(criarFornecedor);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    contato_nome: "",
    contato_email: "",
    contato_telefone: "",
    observacoes: "",
  });

  const criar = useMutation({
    mutationFn: () =>
      criarFn({
        data: {
          nome: form.nome,
          cnpj: form.cnpj || null,
          contato_nome: form.contato_nome || null,
          contato_email: form.contato_email || null,
          contato_telefone: form.contato_telefone || null,
          observacoes: form.observacoes || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      toast.success("Fornecedor criado");
      setOpen(false);
      setForm({ nome: "", cnpj: "", contato_nome: "", contato_email: "", contato_telefone: "", observacoes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHero
        eyebrow="Base Mestre"
        title="Fornecedores"
        description="Parceiros de produção e serviços que abastecem os materiais de PDV e as campanhas JBL."
        image={heroImg}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo fornecedor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo fornecedor</DialogTitle>
                <DialogDescription>Cadastro compartilhado entre materiais e campanhas.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>CNPJ</Label>
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Contato</Label>
                    <Input value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input value={form.contato_telefone} onChange={(e) => setForm({ ...form, contato_telefone: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.contato_email} onChange={(e) => setForm({ ...form, contato_email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button disabled={!form.nome || criar.isPending} onClick={() => criar.mutate()}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="container-page py-12">
        {fornecedores.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="items-center text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle>Nenhum fornecedor cadastrado</CardTitle>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Adicione o primeiro fornecedor para vincular a materiais e campanhas.
              </p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Novo fornecedor
              </Button>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fornecedores.map((f) => (
              <Card key={f.id} className="overflow-hidden">
                <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-700 text-neutral-100">
                  <span className="text-4xl font-semibold tracking-tight">
                    {f.nome.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <CardHeader className="gap-1">
                  <CardTitle className="text-base">{f.nome}</CardTitle>
                  {f.cnpj && <p className="font-mono text-xs text-muted-foreground">{f.cnpj}</p>}
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {f.contato_nome && <p>{f.contato_nome}</p>}
                  {f.contato_email && <p className="truncate">{f.contato_email}</p>}
                  {f.contato_telefone && <p>{f.contato_telefone}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
