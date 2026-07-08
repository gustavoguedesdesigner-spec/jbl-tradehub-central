import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, ArrowRight } from "lucide-react";
import { Package, Database, Rocket, LayoutGrid, BarChart3, Settings, Box, Users, FileImage } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type Entry = { label: string; url: string; group: string; icon: typeof Package; keywords?: string };

const ENTRIES: Entry[] = [
  { label: "Dashboard", url: "/", group: "Navegar", icon: LayoutGrid, keywords: "início home" },
  { label: "Base Mestre", url: "/base-mestre", group: "Navegar", icon: Database },
  { label: "Produtos", url: "/base-mestre/produtos", group: "Navegar", icon: Package },
  { label: "Materiais de PDV", url: "/base-mestre/materiais", group: "Navegar", icon: Box },
  { label: "Fornecedores", url: "/base-mestre/fornecedores", group: "Navegar", icon: Users },
  { label: "Arquivos", url: "/base-mestre/arquivos", group: "Navegar", icon: FileImage },
  { label: "Central de Lançamentos", url: "/lancamentos", group: "Navegar", icon: Rocket },
  { label: "Menu Merchandising", url: "/merchandising", group: "Navegar", icon: LayoutGrid },
  { label: "Relatórios", url: "/relatorios", group: "Navegar", icon: BarChart3 },
  { label: "Configurações", url: "/configuracoes", group: "Navegar", icon: Settings },
  { label: "Novo produto", url: "/base-mestre/produtos/novo", group: "Ações", icon: Package, keywords: "criar cadastrar" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

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

  useEffect(() => setOpen(false), [pathname]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of ENTRIES) {
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
        <span className="flex-1 truncate">Buscar produtos, materiais, lançamentos…</span>
        <kbd className="hidden shrink-0 rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput ref={inputRef} placeholder="Buscar em todo o sistema…" />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          {groups.map(([group, items], i) => (
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
        </CommandList>
      </CommandDialog>

      {/* Hidden Link seeds preload cache */}
      <span className="hidden">
        {ENTRIES.map((e) => (
          <Link key={e.url} to={e.url} preload="intent" />
        ))}
      </span>
    </>
  );
}
