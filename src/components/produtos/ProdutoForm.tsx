import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarProduto, atualizarProduto } from "@/lib/produtos.functions";

const schema = z.object({
  sku: z.string().min(1, "SKU obrigatório").max(64),
  nome: z.string().min(1, "Nome obrigatório").max(200),
  descricao: z.string().max(4000).optional().or(z.literal("")),
  linha_id: z.string().uuid().optional().or(z.literal("")),
  categoria_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo", "descontinuado", "lancamento"]),
  preco_sugerido: z.string().optional().or(z.literal("")),
  ean: z.string().max(32).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  produto?: {
    id: string;
    sku: string;
    nome: string;
    descricao: string | null;
    linha_id: string | null;
    categoria_id: string | null;
    status: "ativo" | "inativo" | "descontinuado" | "lancamento";
    preco_sugerido: number | null;
    ean: string | null;
  };
  linhas: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
  onSaved: (id: string) => void;
  onCancel: () => void;
}

export function ProdutoForm({ produto, linhas, categorias, onSaved, onCancel }: Props) {
  const qc = useQueryClient();
  const criarFn = useServerFn(criarProduto);
  const atualizarFn = useServerFn(atualizarProduto);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: produto?.sku ?? "",
      nome: produto?.nome ?? "",
      descricao: produto?.descricao ?? "",
      linha_id: produto?.linha_id ?? "",
      categoria_id: produto?.categoria_id ?? "",
      status: produto?.status ?? "ativo",
      preco_sugerido: produto?.preco_sugerido != null ? String(produto.preco_sugerido) : "",
      ean: produto?.ean ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        sku: values.sku,
        nome: values.nome,
        descricao: values.descricao || null,
        linha_id: values.linha_id || null,
        categoria_id: values.categoria_id || null,
        status: values.status,
        preco_sugerido: values.preco_sugerido ? Number(values.preco_sugerido) : null,
        ean: values.ean || null,
      };
      if (produto) {
        await atualizarFn({ data: { id: produto.id, dados: payload } });
        return produto.id;
      }
      const created = await criarFn({ data: payload });
      return created.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      if (produto) qc.invalidateQueries({ queryKey: ["produto", produto.id] });
      toast.success(produto ? "Produto atualizado" : "Produto criado");
      onSaved(id);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados do produto</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: JBL-CHRG5-BLK" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ean"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EAN</FormLabel>
                    <FormControl>
                      <Input placeholder="Código de barras" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome comercial do produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Descrição usada em materiais e briefings" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="linha_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linha</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem linha</SelectItem>
                        {linhas.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoria_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem categoria</SelectItem>
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="lancamento">Lançamento</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="descontinuado">Descontinuado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="preco_sugerido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço sugerido (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : produto ? "Salvar alterações" : "Criar produto"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
