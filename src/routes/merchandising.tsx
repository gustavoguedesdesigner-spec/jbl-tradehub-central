import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  LayoutGrid, Search, Package, Building2, Tag, Layers, Megaphone,
  ShieldCheck, ImageIcon, Sparkles, X, Filter,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { listarCatalogoMerchandising, type CatalogoMaterial } from "@/lib/materiais.functions";

const opts = queryOptions({
  queryKey: ["catalogo-merchandising"],
  queryFn: () => listarCatalogoMerchandising(),
});

export const Route = createFileRoute("/merchandising")({
  head: () => ({
    meta: [
      { title: "Menu Merchandising — Catálogo Premium — JBL Trade Hub" },
      {
        name: "description",
        content:
          "Catálogo premium de materiais de PDV alimentado automaticamente pela Base Mestre, com filtros por categoria, linha, produto, tipo, fornecedor, status, campanha e compatibilidade.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: MerchandisingPage,
});

const ANY = "__all__";

type Filters = {
  q: string;
  categoria: string;
  linha: string;
  produto: string;
  tipo: string;
  fornecedor: string;
  status: string;
  campanha: string;
  compat: string; // "any" | "sim" | "nao"
};

const initialFilters: Filters = {
  q: "",
  categoria: ANY,
  linha: ANY,
  produto: ANY,
  tipo: ANY,
  fornecedor: ANY,
  status: ANY,
  campanha: ANY,
  compat: ANY,
};

function MerchandisingPage() {
  const { data: catalogo } = useSuspenseQuery(opts);
  const [f, setF] = useState<Filters>(initialFilters);

  const options = useMemo(() => {
    const cat = new Map<string, string>();
    const lin = new Map<string, string>();
    const prd = new Map<string, string>();
    const tp = new Set<string>();
    const forn = new Map<string, string>();
    const st = new Set<string>();
    const camp = new Map<string, string>();
    for (const m of catalogo) {
      if (m.categoria) cat.set(m.categoria.id, m.categoria.nome);
      for (const l of m.linhas) lin.set(l.id, l.nome);
      for (const p of m.produtos) prd.set(p.id, p.nome);
      if (m.tipo) tp.add(m.tipo);
      if (m.fornecedor) forn.set(m.fornecedor.id, m.fornecedor.nome);
      if (m.status) st.add(m.status);
      for (const c of m.campanhas) camp.set(c.id, c.nome);
    }
    const toArr = (map: Map<string, string>) =>
      [...map.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
    return {
      categorias: toArr(cat),
      linhas: toArr(lin),
      produtos: toArr(prd),
      tipos: [...tp].sort(),
      fornecedores: toArr(forn),
      status: [...st].sort(),
      campanhas: toArr(camp),
    };
  }, [catalogo]);

  const filtered = useMemo(() => {
    const q = f.q.toLowerCase().trim();
    return catalogo.filter((m) => {
      if (q) {
        const hay = `${m.nome} ${m.codigo ?? ""} ${m.tipo ?? ""} ${m.descricao ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.categoria !== ANY && m.categoria?.id !== f.categoria) return false;
      if (f.linha !== ANY && !m.linhas.some((l) => l.id === f.linha)) return false;
      if (f.produto !== ANY && !m.produtos.some((p) => p.id === f.produto)) return false;
      if (f.tipo !== ANY && m.tipo !== f.tipo) return false;
      if (f.fornecedor !== ANY && m.fornecedor?.id !== f.fornecedor) return false;
      if (f.status !== ANY && m.status !== f.status) return false;
      if (f.campanha !== ANY && !m.campanhas.some((c) => c.id === f.campanha)) return false;
      if (f.compat === "sim" && m.produtos.length === 0) return false;
      if (f.compat === "nao" && m.produtos.length > 0) return false;
      return true;
    });
  }, [catalogo, f]);

  const activeCount = Object.entries(f).filter(([k, v]) => k !== "q" && v !== ANY).length + (f.q ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-900/10 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 p-8 text-white shadow-xl">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur ring-1 ring-white/15">
              <LayoutGrid className="h-7 w-7 text-amber-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300/90">Menu Merchandising</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                Catálogo Premium de PDV
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Alimentado automaticamente pela Base Mestre. Filtre por categoria, linha,
                produto, tipo, fornecedor, status, campanha e compatibilidade — sem PDF, direto na tela.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="border-amber-300/40 bg-amber-300/10 text-amber-200">
              <Sparkles className="mr-1 h-3 w-3" /> {catalogo.length} materiais
            </Badge>
            <span className="text-[11px] text-white/50">Fonte: Base Mestre · sincronizado</span>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <Card className="border-neutral-200">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={f.q}
                onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))}
                placeholder="Buscar por nome, código, tipo, descrição…"
                className="pl-9"
              />
            </div>
            <Badge variant="outline" className="gap-1">
              <Filter className="h-3 w-3" /> {activeCount} filtro{activeCount === 1 ? "" : "s"}
            </Badge>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setF(initialFilters)}>
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <FilterSelect
              label="Categoria" icon={Tag} value={f.categoria}
              onChange={(v) => setF((s) => ({ ...s, categoria: v }))}
              options={options.categorias}
            />
            <FilterSelect
              label="Linha" icon={Layers} value={f.linha}
              onChange={(v) => setF((s) => ({ ...s, linha: v }))}
              options={options.linhas}
            />
            <FilterSelect
              label="Produto" icon={Package} value={f.produto}
              onChange={(v) => setF((s) => ({ ...s, produto: v }))}
              options={options.produtos}
            />
            <FilterSelect
              label="Tipo" icon={LayoutGrid} value={f.tipo}
              onChange={(v) => setF((s) => ({ ...s, tipo: v }))}
              options={options.tipos.map((t) => ({ id: t, nome: t }))}
            />
            <FilterSelect
              label="Fornecedor" icon={Building2} value={f.fornecedor}
              onChange={(v) => setF((s) => ({ ...s, fornecedor: v }))}
              options={options.fornecedores}
            />
            <FilterSelect
              label="Status" icon={ShieldCheck} value={f.status}
              onChange={(v) => setF((s) => ({ ...s, status: v }))}
              options={options.status.map((t) => ({ id: t, nome: t }))}
            />
            <FilterSelect
              label="Campanha" icon={Megaphone} value={f.campanha}
              onChange={(v) => setF((s) => ({ ...s, campanha: v }))}
              options={options.campanhas}
            />
            <FilterSelect
              label="Compatibilidade" icon={Package} value={f.compat}
              onChange={(v) => setF((s) => ({ ...s, compat: v }))}
              options={[
                { id: "sim", nome: "Com produtos compatíveis" },
                { id: "nao", nome: "Sem compatibilidade" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          Exibindo <span className="font-semibold text-neutral-900">{filtered.length}</span> de{" "}
          {catalogo.length} materiais
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-neutral-500">
            Nenhum material corresponde aos filtros aplicados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => (
            <MaterialCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label, icon: Icon, value, onChange, options,
}: {
  label: string;
  icon: typeof Tag;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; nome: string }>;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        <Icon className="h-3 w-3" /> {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const statusTone: Record<string, string> = {
  ativo: "border-emerald-200 bg-emerald-50 text-emerald-700",
  em_desenvolvimento: "border-amber-200 bg-amber-50 text-amber-700",
  rascunho: "border-neutral-200 bg-neutral-50 text-neutral-600",
  descontinuado: "border-red-200 bg-red-50 text-red-700",
};

function MaterialCard({ m }: { m: CatalogoMaterial }) {
  const tone = statusTone[m.status] ?? "border-neutral-200 bg-neutral-50 text-neutral-600";
  return (
    <Link
      to="/base-mestre/materiais/$id"
      params={{ id: m.id }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-900/30 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200">
        {m.imagem_url ? (
          <img
            src={m.imagem_url}
            alt={m.nome}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <Badge variant="outline" className={`${tone} shadow-sm`}>
            {m.status.replace("_", " ")}
          </Badge>
          {m.tipo && (
            <Badge variant="outline" className="border-white/60 bg-white/90 text-neutral-700 shadow-sm">
              {m.tipo}
            </Badge>
          )}
        </div>
        {m.codigo && (
          <span className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur">
            {m.codigo}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-neutral-900 group-hover:text-neutral-950">
          {m.nome}
        </h3>
        {m.descricao && (
          <p className="line-clamp-2 text-xs text-neutral-600">{m.descricao}</p>
        )}

        <div className="mt-1 flex flex-wrap gap-1.5">
          {m.categoria && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Tag className="h-3 w-3" /> {m.categoria.nome}
            </Badge>
          )}
          {m.linhas.slice(0, 2).map((l) => (
            <Badge key={l.id} variant="outline" className="gap-1 text-[10px]">
              <Layers className="h-3 w-3" /> {l.nome}
            </Badge>
          ))}
          {m.linhas.length > 2 && (
            <Badge variant="outline" className="text-[10px]">+{m.linhas.length - 2}</Badge>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1 truncate">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{m.fornecedor?.nome ?? "sem fornecedor"}</span>
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" /> {m.produtos.length}
          </span>
        </div>

        {m.campanhas.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t border-neutral-100 pt-2">
            {m.campanhas.slice(0, 2).map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
              >
                <Megaphone className="h-2.5 w-2.5" /> {c.nome}
              </span>
            ))}
            {m.campanhas.length > 2 && (
              <span className="text-[10px] text-neutral-400">+{m.campanhas.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
