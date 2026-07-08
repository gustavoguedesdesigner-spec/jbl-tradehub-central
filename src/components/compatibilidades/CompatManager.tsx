import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Plus, Search, Trash2, Package, Box, X, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listarMateriaisDoProduto,
  listarProdutosDoMaterial,
  vincularCompatibilidade,
  desvincularCompatibilidade,
  buscarMateriaisParaVincular,
  buscarProdutosParaVincular,
} from "@/lib/compatibilidades.functions";
import { listarLinhas } from "@/lib/linhas.functions";
import { listarCategorias } from "@/lib/categorias.functions";
import { listarFamilias } from "@/lib/familias.functions";
import { listarFornecedores } from "@/lib/fornecedores.functions";

const NONE = "__all";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function principalImg(item: any) {
  const imgs = item?.imagens ?? [];
  return imgs.find((i: { principal: boolean }) => i.principal) ?? imgs[0];
}

/* ================================================================
 * PRODUTO → MATERIAIS COMPATÍVEIS
 * ================================================================ */
export function CompatMateriaisDoProduto({ produtoId }: { produtoId: string }) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["compat-mats-produto", produtoId] });
    qc.invalidateQueries({ queryKey: ["produto", produtoId] });
  };
  const { data: vinculados = [], isLoading } = useQuery({
    queryKey: ["compat-mats-produto", produtoId],
    queryFn: () => listarMateriaisDoProduto({ data: { produto_id: produtoId } }),
  });
  const removerFn = useServerFn(desvincularCompatibilidade);
  const remove = useMutation({
    mutationFn: (id: string) => removerFn({ data: { id } }),
    onSuccess: () => { toast.success("Vínculo removido"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [openAdd, setOpenAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Materiais compatíveis <span className="ml-2 text-sm text-muted-foreground">({vinculados.length})</span>
        </h2>
        <Button onClick={() => setOpenAdd(true)}><Plus className="mr-2 h-4 w-4" /> Vincular material</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : vinculados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum material vinculado a este produto.</p>
            <Button variant="outline" onClick={() => setOpenAdd(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Vincular primeiro material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(vinculados as any[]).map((c) => {
            const m = c.material;
            if (!m) return null;
            const img = principalImg(m);
            return (
              <Card key={c.id} className="overflow-hidden">
                <Link to="/base-mestre/materiais/$id" params={{ id: m.id }}>
                  <div className="aspect-[4/3] bg-muted">
                    {img?.url_assinada ? (
                      <img src={img.url_assinada} alt={m.nome} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Box className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="space-y-2 p-4">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{m.codigo}</p>
                    <p className="font-medium leading-tight">{m.nome}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.tipo && <Badge variant="outline">{m.tipo}</Badge>}
                    {m.categoria?.nome && <Badge variant="outline">{m.categoria.nome}</Badge>}
                  </div>
                  {c.observacao && <p className="text-xs text-muted-foreground">{c.observacao}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/base-mestre/materiais/$id" params={{ id: m.id }}>Abrir</Link>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive"
                      disabled={remove.isPending}
                      onClick={() => { if (confirm("Remover vínculo?")) remove.mutate(c.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <VincularMaterialDialog
        produtoId={produtoId}
        open={openAdd}
        onOpenChange={setOpenAdd}
        onDone={invalidate}
      />
    </div>
  );
}

function VincularMaterialDialog({ produtoId, open, onOpenChange, onDone }: {
  produtoId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoriaId, setCategoriaId] = useState(NONE);
  const [fornecedorId, setFornecedorId] = useState(NONE);
  const [status, setStatus] = useState(NONE);
  const [observacao, setObservacao] = useState("");

  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });
  const { data: fornecedores = [] } = useQuery({ queryKey: ["fornecedores"], queryFn: () => listarFornecedores() });

  const { data: candidatos = [], isLoading, refetch } = useQuery({
    queryKey: ["buscar-materiais", produtoId, busca, tipo, categoriaId, fornecedorId, status],
    queryFn: () => buscarMateriaisParaVincular({ data: {
      produto_id: produtoId,
      busca: busca || undefined,
      tipo: tipo || undefined,
      categoria_id: categoriaId !== NONE ? categoriaId : undefined,
      fornecedor_id: fornecedorId !== NONE ? fornecedorId : undefined,
      status: status !== NONE ? (status as "ativo" | "em_desenvolvimento" | "rascunho" | "descontinuado") : undefined,
    }}),
    enabled: open,
  });

  const vincularFn = useServerFn(vincularCompatibilidade);
  const vincular = useMutation({
    mutationFn: (material_id: string) => vincularFn({ data: { produto_id: produtoId, material_id, observacao: observacao || null } }),
    onSuccess: () => { toast.success("Material vinculado"); onDone(); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Vincular material compatível</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Input placeholder="Tipo (display, wobbler…)" value={tipo} onChange={(e) => setTipo(e.target.value)} />
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todas categorias</SelectItem>
                {categorias.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todos fornecedores</SelectItem>
                {fornecedores.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Qualquer status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="descontinuado">Descontinuado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Observação para o vínculo (opcional)</Label>
            <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: usar em campanhas premium, ideal para gôndola…" />
          </div>

          <div className="max-h-[440px] overflow-y-auto rounded-xl border p-2">
            {isLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Buscando…</p>
            ) : candidatos.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Nenhum material disponível para os filtros aplicados.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(candidatos as any[]).map((m) => {
                  const img = principalImg(m);
                  return (
                    <Card key={m.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted">
                        {img?.url_assinada ? (
                          <img src={img.url_assinada} alt={m.nome} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Box className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <CardContent className="space-y-2 p-3">
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">{m.codigo}</p>
                          <p className="line-clamp-2 text-sm font-medium">{m.nome}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {m.tipo && <Badge variant="outline">{m.tipo}</Badge>}
                        </div>
                        <Button size="sm" className="w-full" disabled={vincular.isPending}
                          onClick={() => vincular.mutate(m.id)}>
                          <Link2 className="mr-2 h-3 w-3" /> Vincular
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" /> Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
 * MATERIAL → PRODUTOS COMPATÍVEIS
 * ================================================================ */
export function CompatProdutosDoMaterial({ materialId }: { materialId: string }) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["compat-prods-material", materialId] });
    qc.invalidateQueries({ queryKey: ["material", materialId] });
  };
  const { data: vinculados = [], isLoading } = useQuery({
    queryKey: ["compat-prods-material", materialId],
    queryFn: () => listarProdutosDoMaterial({ data: { material_id: materialId } }),
  });
  const removerFn = useServerFn(desvincularCompatibilidade);
  const remove = useMutation({
    mutationFn: (id: string) => removerFn({ data: { id } }),
    onSuccess: () => { toast.success("Vínculo removido"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const [openAdd, setOpenAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Produtos compatíveis <span className="ml-2 text-sm text-muted-foreground">({vinculados.length})</span>
        </h2>
        <Button onClick={() => setOpenAdd(true)}><Plus className="mr-2 h-4 w-4" /> Vincular produto</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : vinculados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum produto vinculado a este material.</p>
            <Button variant="outline" onClick={() => setOpenAdd(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Vincular primeiro produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(vinculados as any[]).map((c) => {
            const p = c.produto;
            if (!p) return null;
            const img = principalImg(p);
            return (
              <Card key={c.id} className="overflow-hidden">
                <Link to="/base-mestre/produtos/$id" params={{ id: p.id }}>
                  <div className="aspect-[4/3] bg-muted">
                    {img?.url_assinada ? (
                      <img src={img.url_assinada} alt={p.nome} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Package className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="space-y-2 p-4">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{p.codigo_jbl ?? p.sku}</p>
                    <p className="font-medium leading-tight">{p.nome}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.linha?.nome && <Badge variant="outline">{p.linha.nome}</Badge>}
                    {p.categoria?.nome && <Badge variant="outline">{p.categoria.nome}</Badge>}
                  </div>
                  {c.observacao && <p className="text-xs text-muted-foreground">{c.observacao}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/base-mestre/produtos/$id" params={{ id: p.id }}>Abrir</Link>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive"
                      disabled={remove.isPending}
                      onClick={() => { if (confirm("Remover vínculo?")) remove.mutate(c.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <VincularProdutoDialog
        materialId={materialId}
        open={openAdd}
        onOpenChange={setOpenAdd}
        onDone={invalidate}
      />
    </div>
  );
}

function VincularProdutoDialog({ materialId, open, onOpenChange, onDone }: {
  materialId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [linhaId, setLinhaId] = useState(NONE);
  const [categoriaId, setCategoriaId] = useState(NONE);
  const [familiaId, setFamiliaId] = useState(NONE);
  const [status, setStatus] = useState(NONE);
  const [observacao, setObservacao] = useState("");

  const { data: linhas = [] } = useQuery({ queryKey: ["linhas"], queryFn: () => listarLinhas() });
  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: () => listarCategorias() });
  const { data: familias = [] } = useQuery({ queryKey: ["familias"], queryFn: () => listarFamilias() });

  const { data: candidatos = [], isLoading, refetch } = useQuery({
    queryKey: ["buscar-produtos", materialId, busca, linhaId, categoriaId, familiaId, status],
    queryFn: () => buscarProdutosParaVincular({ data: {
      material_id: materialId,
      busca: busca || undefined,
      linha_id: linhaId !== NONE ? linhaId : undefined,
      categoria_id: categoriaId !== NONE ? categoriaId : undefined,
      familia_id: familiaId !== NONE ? familiaId : undefined,
      status: status !== NONE ? (status as "ativo" | "inativo" | "descontinuado" | "lancamento" | "em_desenvolvimento") : undefined,
    }}),
    enabled: open,
  });

  const vincularFn = useServerFn(vincularCompatibilidade);
  const vincular = useMutation({
    mutationFn: (produto_id: string) => vincularFn({ data: { produto_id, material_id: materialId, observacao: observacao || null } }),
    onSuccess: () => { toast.success("Produto vinculado"); onDone(); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Vincular produto compatível</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, SKU, código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Select value={linhaId} onValueChange={setLinhaId}>
              <SelectTrigger><SelectValue placeholder="Linha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todas linhas</SelectItem>
                {linhas.map((l) => (<SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todas categorias</SelectItem>
                {categorias.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={familiaId} onValueChange={setFamiliaId}>
              <SelectTrigger><SelectValue placeholder="Família" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todas famílias</SelectItem>
                {familias.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Qualquer status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="lancamento">Lançamento</SelectItem>
                <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="descontinuado">Descontinuado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Observação para o vínculo (opcional)</Label>
            <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: apenas versão 2024, restrito ao Norte…" />
          </div>

          <div className="max-h-[440px] overflow-y-auto rounded-xl border p-2">
            {isLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Buscando…</p>
            ) : candidatos.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Nenhum produto disponível para os filtros aplicados.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(candidatos as any[]).map((p) => {
                  const img = principalImg(p);
                  return (
                    <Card key={p.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted">
                        {img?.url_assinada ? (
                          <img src={img.url_assinada} alt={p.nome} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Package className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <CardContent className="space-y-2 p-3">
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">{p.codigo_jbl ?? p.sku}</p>
                          <p className="line-clamp-2 text-sm font-medium">{p.nome}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {p.linha?.nome && <Badge variant="outline">{p.linha.nome}</Badge>}
                        </div>
                        <Button size="sm" className="w-full" disabled={vincular.isPending}
                          onClick={() => vincular.mutate(p.id)}>
                          <Link2 className="mr-2 h-3 w-3" /> Vincular
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" /> Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
