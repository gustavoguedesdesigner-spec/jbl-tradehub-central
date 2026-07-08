import { HelpCircle } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationsMenu } from "@/components/layout/NotificationsMenu";
import { Button } from "@/components/ui/button";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-background/85 backdrop-blur">
      {/* Linha 1 — busca, notificações, ajuda */}
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger className="shrink-0" />
        <div className="hidden h-6 w-px bg-neutral-200 md:block" />
        <div className="min-w-0 flex-1">
          <GlobalSearch />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-neutral-100"
            aria-label="Ajuda"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </Button>
          <NotificationsMenu />
          <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-neutral-50">
            JB
          </div>
        </div>
      </div>

      {/* Linha 2 — breadcrumb */}
      <div className="flex h-9 items-center border-t border-neutral-100 px-4 md:px-6">
        <Breadcrumbs />
      </div>
    </header>
  );
}
