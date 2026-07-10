import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type DashboardExecutivo = {
  cards: {
    produtos: number;
    produtos_ativos: number;
    materiais: number;
    campanhas: number;
    campanhas_ativas: number;
    projetos: number;
    projetos_andamento: number;
    pendencias: number;
    producao: number;
    materiais_especiais: number;
    homologados: number;
    em_desenvolvimento: number;
  };
  projetosPorStatus: { status: string; total: number }[];
  materiaisPorStatus: { status: string; total: number }[];
  produtosPorLinha: { nome: string; total: number }[];
  produtosPorCategoria: { nome: string; total: number }[];
  pendenciasPorTipo: { tipo: string; total: number }[];
  geradoEm: string;
};

export const obterDashboardExecutivo = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardExecutivo> => {
    const sb = getClient();
    const c = (q: PromiseLike<{ count: number | null }>) =>
      Promise.resolve(q).then((r) => r.count ?? 0);

    const [
      produtos, produtosAtivos,
      materiais, homologados, emDesenv,
      campanhas, campanhasAtivas,
      projetos, projetosAndamento, projetosPlanejados, projetosLancados, projetosCancelados,
      matPendentes, matAprovacao, matProducao, matAprovado, matImplantado,
      especiais,
    ] = await Promise.all([
      c(sb.from("produtos").select("*", { count: "exact", head: true })),
      c(sb.from("produtos").select("*", { count: "exact", head: true }).eq("status", "ativo")),
      c(sb.from("materiais_pdv").select("*", { count: "exact", head: true })),
      c(sb.from("materiais_pdv").select("*", { count: "exact", head: true }).eq("status", "ativo")),
      c(sb.from("materiais_pdv").select("*", { count: "exact", head: true }).eq("status", "em_desenvolvimento")),
      c(sb.from("campanhas").select("*", { count: "exact", head: true })),
      c(sb.from("campanhas").select("*", { count: "exact", head: true }).eq("status", "em_andamento")),
      c(sb.from("lancamentos").select("*", { count: "exact", head: true })),
      c(sb.from("lancamentos").select("*", { count: "exact", head: true }).eq("status", "em_andamento")),
      c(sb.from("lancamentos").select("*", { count: "exact", head: true }).eq("status", "planejado")),
      c(sb.from("lancamentos").select("*", { count: "exact", head: true }).eq("status", "lancado")),
      c(sb.from("lancamentos").select("*", { count: "exact", head: true }).eq("status", "cancelado")),
      c(sb.from("lancamentos_materiais").select("*", { count: "exact", head: true }).eq("status", "pendente")),
      c(sb.from("lancamentos_materiais").select("*", { count: "exact", head: true }).eq("status", "em_aprovacao")),
      c(sb.from("lancamentos_materiais").select("*", { count: "exact", head: true }).eq("status", "em_producao")),
      c(sb.from("lancamentos_materiais").select("*", { count: "exact", head: true }).eq("status", "aprovado")),
      c(sb.from("lancamentos_materiais").select("*", { count: "exact", head: true }).eq("status", "implantado")),
      c(sb.from("materiais_especiais").select("*", { count: "exact", head: true })),
    ]);

    // Breakdown adicional
    const [linhasRows, produtosLinhaRows, categoriasRows, produtosCatRows, matStatusRows] = await Promise.all([
      sb.from("linhas").select("id, nome"),
      sb.from("produtos").select("linha_id"),
      sb.from("categorias").select("id, nome"),
      sb.from("produtos").select("categoria_id"),
      sb.from("materiais_pdv").select("status"),
    ]);

    const linhaMap = new Map((linhasRows.data ?? []).map((l) => [l.id, l.nome]));
    const linhaCount = new Map<string, number>();
    for (const p of produtosLinhaRows.data ?? []) {
      const n = p.linha_id ? linhaMap.get(p.linha_id) ?? "Sem linha" : "Sem linha";
      linhaCount.set(n, (linhaCount.get(n) ?? 0) + 1);
    }
    const produtosPorLinha = [...linhaCount.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);

    const catMap = new Map((categoriasRows.data ?? []).map((c) => [c.id, c.nome]));
    const catCount = new Map<string, number>();
    for (const p of produtosCatRows.data ?? []) {
      const n = p.categoria_id ? catMap.get(p.categoria_id) ?? "Sem categoria" : "Sem categoria";
      catCount.set(n, (catCount.get(n) ?? 0) + 1);
    }
    const produtosPorCategoria = [...catCount.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);

    const matStatusCount = new Map<string, number>();
    for (const m of matStatusRows.data ?? []) {
      const s = m.status ?? "—";
      matStatusCount.set(s, (matStatusCount.get(s) ?? 0) + 1);
    }
    const materiaisPorStatus = [...matStatusCount.entries()]
      .map(([status, total]) => ({ status, total }))
      .sort((a, b) => b.total - a.total);

    const pendencias = matPendentes + matAprovacao;

    return {
      cards: {
        produtos,
        produtos_ativos: produtosAtivos,
        materiais,
        campanhas,
        campanhas_ativas: campanhasAtivas,
        projetos,
        projetos_andamento: projetosAndamento,
        pendencias,
        producao: matProducao,
        materiais_especiais: especiais,
        homologados,
        em_desenvolvimento: emDesenv,
      },
      projetosPorStatus: [
        { status: "Planejado", total: projetosPlanejados },
        { status: "Em andamento", total: projetosAndamento },
        { status: "Lançado", total: projetosLancados },
        { status: "Cancelado", total: projetosCancelados },
      ],
      materiaisPorStatus,
      produtosPorLinha,
      produtosPorCategoria,
      pendenciasPorTipo: [
        { tipo: "Pendente", total: matPendentes },
        { tipo: "Em aprovação", total: matAprovacao },
        { tipo: "Em produção", total: matProducao },
        { tipo: "Aprovado", total: matAprovado },
        { tipo: "Implantado", total: matImplantado },
      ],
      geradoEm: new Date().toISOString(),
    };
  },
);
