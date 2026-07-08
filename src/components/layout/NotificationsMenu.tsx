import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Notificacao = {
  id: string;
  titulo: string;
  descricao: string;
  tempo: string;
  lida?: boolean;
};

// Placeholder — será substituído por dados reais quando houver eventos no sistema.
const NOTIFICACOES: Notificacao[] = [];

export function NotificationsMenu() {
  const naoLidas = NOTIFICACOES.filter((n) => !n.lida).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-neutral-100"
          aria-label="Notificações"
        >
          <Bell className="h-[18px] w-[18px]" />
          {naoLidas > 0 && (
            <span className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] rounded-2xl border-neutral-200 p-0"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {naoLidas > 0 ? `${naoLidas} não lida(s)` : "Você está em dia"}
            </p>
          </div>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>

        {NOTIFICACOES.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Bell className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Sem notificações</p>
            <p className="max-w-[240px] text-xs text-muted-foreground">
              Novidades de lançamentos, aprovações e requisições aparecerão aqui.
            </p>
          </div>
        ) : (
          <ul className="max-h-[360px] divide-y divide-neutral-100 overflow-auto">
            {NOTIFICACOES.map((n) => (
              <li key={n.id} className="flex gap-3 px-5 py-4 hover:bg-neutral-50">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.lida ? "bg-neutral-300" : "bg-primary"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.titulo}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.descricao}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{n.tempo}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
