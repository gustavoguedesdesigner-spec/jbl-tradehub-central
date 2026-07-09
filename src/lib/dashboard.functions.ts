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

export type DashboardResumo = {
  cards: {
    produtos: { total: number; ativos: number; lancamento: number };
    materiais: { total: number; em_desenvolvimento: number };
    projetos: { total: number; em_andamento: number };
    campanhas: { total: number; ativas: number };
    lancamentos_mes: number;
    materiais_dev: number;
  };
  produtosPorLinha: { nome: string; total: number }[];
  projetosPorStatus: { status: string; total: number }[];
  cronograma: {
    id: string;
    nome: string;
    data: string | null;
    status: string;
  }[];
  atividades: {
    id: string;
    entidade_tipo: string;
    entidade_id: string;
    acao: string;
    created_at: string;
  }[];
  alertas: {
    id: string;
    tipo: "info" | "warning" | "danger";
    titulo: string;
    descricao: string;
  }[];
};

export const obterResumoDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardResumo> => {
    const sb = getClient();

    const [
      produtosTotal,
      produtosAtivos,
      produtosLanc,
      materiaisTotal,
      projetosTotal,
      projetosAndamento,
      projetosPlanejados,
      projetosLancados,
      projetosCancelados,
      campanhasTotal,
      campanhasAtivas,
      linhasRows,
      produtosPorLinhaRows,
      cronogramaRows,
      historicoRows,
    ] = await Promise.all([
      sb.from("produtos").select("*", { count: "exact", head: true }),
      sb.from("produtos").select("*", { count: "exact", head: true }).eq("status", "ativo"),
      sb
        .from("produtos")
        .select("*", { count: "exact", head: true })
        .eq("status", "lancamento"),
      sb.from("materiais_pdv").select("*", { count: "exact", head: true }),
      sb.from("lancamentos").select("*", { count: "exact", head: true }),
      sb
        .from("lancamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "em_andamento"),
      sb
        .from("lancamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "planejado"),
      sb
        .from("lancamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "lancado"),
      sb
        .from("lancamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelado"),
      sb.from("campanhas").select("*", { count: "exact", head: true }),
      sb
        .from("campanhas")
        .select("*", { count: "exact", head: true })
        .eq("status", "em_andamento"),
      sb.from("linhas").select("id, nome"),
      sb.from("produtos").select("linha_id"),
      sb
        .from("lancamentos")
        .select("id, nome, data_prevista, status")
        .order("data_prevista", { ascending: true, nullsFirst: false })
        .limit(6),
      sb
        .from("historico")
        .select("id, entidade_tipo, entidade_id, acao, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const [materiaisEmProducao, materiaisEmDesenv] = await Promise.all([
      sb.from("lancamentos_materiais").select("*", { count: "exact", head: true }).eq("status", "em_producao"),
      sb.from("materiais_pdv").select("*", { count: "exact", head: true }).eq("status", "em_desenvolvimento"),
    ]);

    // Produtos por linha (join manual — evita depender de FK embedded)
    const linhas = linhasRows.data ?? [];
    const linhaById = new Map(linhas.map((l) => [l.id, l.nome]));
    const contagem = new Map<string, number>();
    for (const p of produtosPorLinhaRows.data ?? []) {
      const nome = p.linha_id ? linhaById.get(p.linha_id) ?? "Sem linha" : "Sem linha";
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
    const produtosPorLinha = [...contagem.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Início do mês corrente para "lançamentos do mês"
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const { count: lancMes } = await sb
      .from("lancamentos")
      .select("*", { count: "exact", head: true })
      .gte("data_prevista", inicioMes)
      .lte("data_prevista", fimMes);

    // Alertas dinâmicos
    const alertas: DashboardResumo["alertas"] = [];
    if ((produtosTotal.count ?? 0) === 0) {
      alertas.push({
        id: "sem-produtos",
        tipo: "warning",
        titulo: "Base Mestre vazia",
        descricao: "Cadastre os primeiros produtos para habilitar os demais módulos.",
      });
    }
    if ((materiaisTotal.count ?? 0) === 0) {
      alertas.push({
        id: "sem-materiais",
        tipo: "info",
        titulo: "Nenhum material de PDV",
        descricao: "Cadastre displays, expositores e materiais promocionais.",
      });
    }
    if ((projetosTotal.count ?? 0) === 0) {
      alertas.push({
        id: "sem-projetos",
        tipo: "info",
        titulo: "Nenhum projeto de lançamento",
        descricao: "Comece planejando o próximo lançamento na Central de Lançamentos.",
      });
    }

    return {
      cards: {
        produtos: {
          total: produtosTotal.count ?? 0,
          ativos: produtosAtivos.count ?? 0,
          lancamento: produtosLanc.count ?? 0,
        },
        materiais: {
          total: materiaisTotal.count ?? 0,
          em_desenvolvimento: 0,
        },
        projetos: {
          total: projetosTotal.count ?? 0,
          em_andamento: projetosAndamento.count ?? 0,
        },
        campanhas: {
          total: campanhasTotal.count ?? 0,
          ativas: campanhasAtivas.count ?? 0,
        },
        lancamentos_mes: lancMes ?? 0,
        materiais_dev: 0,
      },
      produtosPorLinha,
      projetosPorStatus: [
        { status: "Planejado", total: projetosPlanejados.count ?? 0 },
        { status: "Em andamento", total: projetosAndamento.count ?? 0 },
        { status: "Lançado", total: projetosLancados.count ?? 0 },
        { status: "Cancelado", total: projetosCancelados.count ?? 0 },
      ],
      cronograma: (cronogramaRows.data ?? []).map((r) => ({
        id: r.id,
        nome: r.nome,
        data: r.data_prevista,
        status: r.status,
      })),
      atividades: (historicoRows.data ?? []).map((h) => ({
        id: h.id,
        entidade_tipo: h.entidade_tipo,
        entidade_id: h.entidade_id,
        acao: h.acao,
        created_at: h.created_at,
      })),
      alertas,
    };
  },
);
