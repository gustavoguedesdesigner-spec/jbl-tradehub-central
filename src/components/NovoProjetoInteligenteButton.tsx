import { Link } from "@tanstack/react-router";
import { Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  cadastroManualHref?: string;
  cadastroManualLabel?: string;
  compact?: boolean;
}

/**
 * Botão principal "Novo Projeto Inteligente" (destaque laranja JBL) + botão
 * secundário de cadastro manual. Usado em Dashboard, Produtos, Materiais e Central de Lançamentos.
 */
export function NovoProjetoInteligenteButton({
  cadastroManualHref,
  cadastroManualLabel = "Cadastro Manual",
  compact = false,
}: Props) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          size={compact ? "default" : "lg"}
          className="gap-2 bg-[#FF6B00] text-white shadow-sm transition-all hover:bg-[#E85F00] hover:shadow-md"
        >
          <Link to="/projeto-inteligente">
            <Sparkles className="h-4 w-4" />
            Novo Projeto Inteligente
          </Link>
        </Button>
        {cadastroManualHref && (
          <Button asChild variant="outline" size={compact ? "default" : "lg"} className="gap-2">
            <Link to={cadastroManualHref}>
              <Plus className="h-4 w-4" />
              {cadastroManualLabel}
            </Link>
          </Button>
        )}
      </div>
      {!compact && (
        <p className="max-w-[380px] text-right text-[11px] leading-snug text-muted-foreground">
          Crie automaticamente um novo projeto a partir de um briefing, PDF, apresentação, imagens ou URL.
        </p>
      )}
    </div>
  );
}
