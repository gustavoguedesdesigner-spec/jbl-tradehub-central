import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ArrowRight, Package, Database, Rocket, LayoutGrid, BarChart3,
  Settings, Box, Users, FileImage, Megaphone, FileText, Building2, Loader2,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import { buscaGlobal, type BuscaResultado } from "@/lib/busca-global.functions";

type Entry = { label: string; url: string; group: string; icon: typeof Package; keywords?: string };

const NAV: Entry[] = [
  { label: "Dashboard", url: "/", group: "Navegar", icon: LayoutGrid, keywords: "início home" },
  { label: "Base Mestre", url: "/base-mestre", group: "Navegar", icon: Database },
  { label: "Produtos", url: "/base-mestre/produtos", group: "Navegar", icon: Package },
  { label: "Materiais de PDV", url: "/base-mestre/materiais", group: "Navegar", icon: Box },
  { label: "Fornecedores", url: "/base-mestre/fornecedores", group: "Navegar", icon: Users },
  { label: "Arquivos", url: "/base-mestre/arquivos", group: "Navegar", icon: FileImage },
  { label: "Central de Lançamentos", url: "/lancamentos", group: "Navegar", icon: Rocket },
  { label: "Decision Engine", url: "/decision-engine", group: "Navegar", icon: LayoutGrid },
  { label: "Menu Merchandising", url: "/merchandising", group: "Navegar", icon: LayoutGrid },
  { label: "Relatórios", url: "/relatorios", group: "Navegar", icon: BarChart3 },
  { label: "Configurações", url: "/configuracoes", group: "Navegar", icon: Settings },
  { label: "Novo produto", url: "/base-mestre/produtos/novo", group: "Ações", icon: Package, keywords: "criar cadastrar" },
];

const TIPO_META: Record<
  BuscaResultado["tipo"],
  { label: string; icon: typeof Package; tone: string }
> = {
  produto: { label: "Produtos", icon: Package, tone: "text-blue-600" },
  material: { label: "Materiais", icon: Box, tone: "text-amber-600" },
  projeto: { label: "Projetos", icon: Rocket, tone: "text-indigo-600" },
  briefing: { label: "Briefings", icon: FileText, tone: "text-violet-600" },
  campanha: { label: "Campanhas", icon: Megaphone, tone: "text-fuchsia-600" },
  arquivo: { label: "Arquivos", icon: FileImage, tone: "text-teal-600" },
  fornecedor: { label: "Fornecedores", icon: Building2, tone: "text-emerald-600" },
};

const TIPO_ORDER: BuscaResultado["tipo"][] = [
  "produto", "material", "projeto", "briefing", "campanha", "arquivo", "fornecedor",
];

function useDebounced<T>(value: T, delay = 180): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const debounced = useDebounced(query, 180);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  const enabled = debounced.trim().length >= 2;
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["busca-global", debounced],
    queryFn: () => buscaGlobal({ data: { q: debounced } }),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const grouped = useMemo(() => {
    const map = new Map<BuscaResultado["tipo"], BuscaResultado[]>();
    for (const r of results) {
      if (!map.has(r.tipo)) map.set(r.tipo, []);
      map.get(r.tipo)!.push(r);
    }
    return TIPO_ORDER.filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const);
  }, [results]);

  const navGroups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of NAV) {
      if (!map.has(e.group)) map.set(e.group, []);
      map.get(e.group)!.push(e);
    }
    return [...map.entries()];
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-10 w-full max-w-md items-center gap-2.5 rounded-full border border-neutral-200 bg-neutral-50 px-4 text-left text-sm text-muted-foreground transition-colors hover:border-neutral-300 hover:bg-white"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Buscar produtos, materiais, projetos…</span>
        <kbd className="hidden shrink-0 rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <div className="relative">
          <CommandInput
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar produtos, materiais, projetos, briefings, campanhas, arquivos, fornecedores…"
          />
          {isFetching && enabled && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <CommandList>
          {!enabled ? (
            <>
              <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Digite ao menos 2 caracteres para buscar
              </div>
              {navGroups.map(([group, items], i) => (
                <div key={group}>
                  {i > 0 && <CommandSeparator />}
                  <CommandGroup heading={group}>
                    {items.map((entry) => (
                      <CommandItem
                        key={entry.url}
                        value={`${entry.label} ${entry.keywords ?? ""}`}
                        onSelect={() => {
                          navigate({ to: entry.url });
                          setOpen(false);
                        }}
                      >
                        <entry.icon className="mr-2 h-4 w-4" />
                        <span>{entry.label}</span>
                        <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              ))}
            </>
          ) : results.length === 0 && !isFetching ? (
            <CommandEmpty>Nenhum resultado para "{debounced}".</CommandEmpty>
          ) : (
            grouped.map(([tipo, items], i) => {
              const meta = TIPO_META[tipo];
              return (
                <div key={tipo}>
                  {i > 0 && <CommandSeparator />}
                  <CommandGroup heading={`${meta.label} · ${items.length}`}>
                    {items.map((r) => (
                      <CommandItem
                        key={`${tipo}-${r.id}`}
                        value={`${r.titulo} ${r.subtitulo ?? ""} ${r.descricao ?? ""} ${r.id}`}
                        onSelect={() => {
                          navigate({ to: r.url });
                          setOpen(false);
                        }}
                        className="items-start"
                      >
                        <meta.icon className={`mr-2 mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{r.titulo}</span>
                            {r.subtitulo && (
                              <span className="truncate text-[11px] text-muted-foreground">
                                {r.subtitulo}
                              </span>
                            )}
                          </div>
                          {r.descricao && (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {r.descricao}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })
          )}
        </CommandList>
      </CommandDialog>

      {/* Hidden Link seeds preload cache */}
      <span className="hidden">
        {NAV.map((e) => (
          <Link key={e.url} to={e.url} preload="intent" />
        ))}
      </span>
    </>
  );
}
