import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";

const LABELS: Record<string, string> = {
  "base-mestre": "Base Mestre",
  produtos: "Produtos",
  novo: "Novo",
  materiais: "Materiais de PDV",
  fornecedores: "Fornecedores",
  arquivos: "Arquivos",
  lancamentos: "Central de Lançamentos",
  merchandising: "Menu Merchandising",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
};

function label(segment: string) {
  return LABELS[segment] ?? decodeURIComponent(segment);
}

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, i) => ({
      href: "/" + parts.slice(0, i + 1).join("/"),
      label: label(part),
      isLast: i === parts.length - 1,
    }));
  }, [pathname]);

  return (
    <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
      <Link
        to="/"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Início</span>
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
          {c.isLast ? (
            <span className="truncate font-medium text-foreground">{c.label}</span>
          ) : (
            <Link
              to={c.href}
              className="truncate text-muted-foreground hover:text-foreground"
            >
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
