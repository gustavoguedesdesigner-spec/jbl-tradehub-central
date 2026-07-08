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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

const NONE = "__none__";

const schema = z.object({
  sku: z.string().min(1, "SKU obrigatório").max(64),
  codigo_jbl: z.string().max(64).optional().or(z.literal("")),
  nome: z.string().min(1, "Nome obrigatório").max(200),
  descricao_curta: z.string().max(500).optional().or(z.literal("")),
  descricao: z.string().max(8000).optional().or(z.literal("")),
  linha_id: z.string().optional().or(z.literal("")),
  categoria_id: z.string().optional().or(z.literal("")),
  familia_id: z.string().optional().or(z.literal("")),
  posicionamento: z.string().optional().or(z.literal("")),
  campanha_tamanho: z.string().optional().or(z.literal("")),
  data_lancamento: z.string().optional().or(z.literal("")),
  hero_product: z.boolean(),
  features: z.string().optional().or(z.literal("")),
  diferenciais: z.string().max(4000).optional().or(z.literal("")),
  observacoes: z.string().max(4000).optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo", "descontinuado", "lancamento", "em_desenvolvimento"]),
  preco_sugerido: z.string().optional().or(z.literal("")),
  ean: z.string().max(32).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  produto?: {
    id: string;
    sku: string;
    codigo_jbl?: string | null;
    nome: string;
    descricao_curta?: string | null;
    descricao: string | null;
    linha_id: string | null;
    categoria_id: string | null;
    familia_id?: string | null;
    posicionamento?: string | null;
    campanha_tamanho?: string | null;
    data_lancamento?: string | null;
    hero_product?: boolean;
    features?: string[] | null;
    diferenciais?: string | null;
    observacoes?: string | null;
    status: "ativo" | "inativo" | "descontinuado" | "lancamento" | "em_desenvolvimento";
    preco_sugerido: number | null;
    ean: string | null;
  };
  linhas: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
  familias?: { id: string; nome: string }[];
  onSaved: (id: string) => void;
  onCancel: () => void;
}

export function ProdutoForm({ produto, linhas, categorias, familias = [], onSaved, onCancel }: Props) {
  const qc = useQueryClient();
  const criarFn = useServerFn(criarProduto);
  const atualizarFn = useServerFn(atualizarProduto);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: produto?.sku ?? "",
      codigo_jbl: produto?.codigo_jbl ?? "",
      nome: produto?.nome ?? "",
      descricao_curta: produto?.descricao_curta ?? "",
      descricao: produto?.descricao ?? "",
      linha_id: produto?.linha_id ?? "",
      categoria_id: produto?.categoria_id ?? "",
      familia_id: produto?.familia_id ?? "",
      posicionamento: produto?.posicionamento ?? "",
      campanha_tamanho: produto?.campanha_tamanho ?? "",
      data_lancamento: produto?.data_lancamento ?? "",
      hero_product: produto?.hero_product ?? false,
      features: (produto?.features ?? []).join("\n"),
      diferenciais: produto?.diferenciais ?? "",
      observacoes: produto?.observacoes ?? "",
      status: produto?.status ?? "ativo",
      preco_sugerido: produto?.preco_sugerido != null ? String(produto.preco_sugerido) : "",
      ean: produto?.ean ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        sku: values.sku,
        codigo_jbl: values.codigo_jbl || null,
        nome: values.nome,
        descricao_curta: values.descricao_curta || null,
        descricao: values.descricao || null,
        linha_id: values.linha_id || null,
        categoria_id: values.categoria_id || null,
        familia_id: values.familia_id || null,
        posicionamento: (values.posicionamento || null) as
          | "entrada" | "intermediario" | "premium" | "hero" | null,
        campanha_tamanho: (values.campanha_tamanho || null) as "P" | "M" | "G" | null,
        data_lancamento: values.data_lancamento || null,
        hero_product: values.hero_product,
        features: (values.features || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        diferenciais: values.diferenciais || null,
        observacoes: values.observacoes || null,
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

  const selectValue = (v: string | undefined) => (v && v !== "" ? v : NONE);
  const fromSelect = (v: string) => (v === NONE ? "" : v);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU *</FormLabel>
                  <FormControl><Input placeholder="Ex: JBL-CHRG5-BLK" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="codigo_jbl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código JBL</FormLabel>
                  <FormControl><Input placeholder="Código interno" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ean" render={({ field }) => (
                <FormItem>
                  <FormLabel>EAN</FormLabel>
                  <FormControl><Input placeholder="Código de barras" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Nome comercial do produto" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="descricao_curta" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição curta</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Chamada usada em cards e listagens" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição completa</FormLabel>
                <FormControl><Textarea rows={5} placeholder="Descrição usada em materiais e briefings" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Classificação</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="linha_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Linha</FormLabel>
                  <Select value={selectValue(field.value)} onValueChange={(v) => field.onChange(fromSelect(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem linha</SelectItem>
                      {linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="categoria_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={selectValue(field.value)} onValueChange={(v) => field.onChange(fromSelect(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem categoria</SelectItem>
                      {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="familia_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Família</FormLabel>
                  <Select value={selectValue(field.value)} onValueChange={(v) => field.onChange(fromSelect(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem família</SelectItem>
                      {familias.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <FormField control={form.control} name="posicionamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Posicionamento</FormLabel>
                  <Select value={selectValue(field.value)} onValueChange={(v) => field.onChange(fromSelect(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="hero">Hero</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="campanha_tamanho" render={({ field }) => (
                <FormItem>
                  <FormLabel>Campanha</FormLabel>
                  <Select value={selectValue(field.value)} onValueChange={(v) => field.onChange(fromSelect(v))}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      <SelectItem value="P">P</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="G">G</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="data_lancamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de lançamento</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
                      <SelectItem value="lancamento">Lançamento</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="descontinuado">Descontinuado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <Label className="text-sm font-medium">Hero Product</Label>
                <p className="text-xs text-muted-foreground">Produto de destaque da linha.</p>
              </div>
              <FormField control={form.control} name="hero_product" render={({ field }) => (
                <FormItem className="!m-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="preco_sugerido" render={({ field }) => (
              <FormItem>
                <FormLabel>Preço sugerido (R$)</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0" placeholder="0,00" {...field} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Conteúdo</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <FormField control={form.control} name="features" render={({ field }) => (
              <FormItem>
                <FormLabel>Principais features</FormLabel>
                <FormControl>
                  <Textarea rows={5} placeholder="Uma feature por linha" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">Uma feature por linha.</p>
              </FormItem>
            )} />
            <FormField control={form.control} name="diferenciais" render={({ field }) => (
              <FormItem>
                <FormLabel>Diferenciais competitivos</FormLabel>
                <FormControl><Textarea rows={4} {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações internas</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Notas para o time" {...field} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : produto ? "Salvar alterações" : "Criar produto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
