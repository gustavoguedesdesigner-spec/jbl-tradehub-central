import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function getClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/* ============================================================
 * DECISION ENGINE — Architecture
 *
 * The engine is provider-agnostic. Today we ship a rules-based
 * HeuristicProvider. Tomorrow an AIProvider (Lovable AI Gateway)
 * can be dropped in without changing the callers.
 *
 *   DecisionProvider.analyze(context) -> DecisionOutput
 *
 * Choose via env `DECISION_ENGINE_PROVIDER` = "heuristic" | "ai"
 * (default: heuristic). The AIProvider is stubbed and falls back
 * to the heuristic until wired.
 * ============================================================ */

export type Recomendacao = {
  material_id: string | null;
  nome: string;
  codigo: string | null;
  tipo: string | null;
  imagem_url: string | null;
  score: number; // 0..100
  motivo: string;
  origem: "compatibilidade" | "categoria" | "campanha" | "posicionamento" | "ia";
};

export type SugestaoEspecial = {
  nome: string;
  objetivo: string;
  briefing: string;
  score: number;
  motivo: string;
};

export type DecisionInput = {
  lancamento: {
    id: string;
    campanha: { id: string; nome: string; codigo: string | null } | null;
    contexto: string | null; // descricao
  };
  produtos: Array<{
    id: string;
    nome: string;
    posicionamento: string | null;
    campanha_tamanho: string | null;
    hero_product: boolean;
    categoria: { id: string; nome: string } | null;
    linha: { id: string; nome: string } | null;
    familia: { id: string; nome: string } | null;
  }>;
  materiais_vinculados: Set<string>;
  materiais_obrigatorios_atuais: Set<string>;
};

export type DecisionOutput = {
  obrigatorios: Recomendacao[];
  opcionais: Recomendacao[];
  especiais: SugestaoEspecial[];
};

interface DecisionProvider {
  readonly name: string;
  analyze(input: DecisionInput, deps: EngineDeps): Promise<DecisionOutput>;
}

type EngineDeps = {
  supabase: ReturnType<typeof getClient>;
};

/* ---------------- Heuristic provider ---------------- */

const HeuristicProvider: DecisionProvider = {
  name: "heuristic",
  async analyze(input, { supabase }) {
    const produtoIds = input.produtos.map((p) => p.id);
    if (produtoIds.length === 0) {
      return { obrigatorios: [], opcionais: [], especiais: [] };
    }

    // Compatíveis via Base Mestre
    const { data: compat } = await supabase
      .from("compatibilidades")
      .select("material:materiais_pdv(id, codigo, nome, tipo, status, imagem_principal_url)")
      .in("produto_id", produtoIds);

    type Mat = {
      id: string; codigo: string | null; nome: string; tipo: string | null;
      status: string; imagem_principal_url: string | null;
    };
    const uniq = new Map<string, Mat>();
    for (const c of compat ?? []) {
      const m = (c as unknown as { material: Mat | null }).material;
      if (m && !uniq.has(m.id)) uniq.set(m.id, m);
    }

    // Obrigatórios: homologados (ativo) ainda não vinculados como obrigatório
    const obrigatorios: Recomendacao[] = [];
    const opcionais: Recomendacao[] = [];
    for (const m of uniq.values()) {
      const already = input.materiais_obrigatorios_atuais.has(m.id);
      const homologado = m.status === "ativo";
      if (already) continue;
      const rec: Recomendacao = {
        material_id: m.id,
        nome: m.nome,
        codigo: m.codigo,
        tipo: m.tipo,
        imagem_url: m.imagem_principal_url,
        score: homologado ? 92 : 70,
        motivo: homologado
          ? "Material homologado na Base Mestre e compatível com o produto do lançamento."
          : "Material compatível, ainda não homologado — avaliar antes de tornar obrigatório.",
        origem: "compatibilidade",
      };
      if (homologado) obrigatorios.push(rec);
      else opcionais.push(rec);
    }

    // Opcionais adicionais por tipo esperado por categoria
    const expectedByCategoria: Record<string, string[]> = {
      "portable": ["display", "wobbler", "cartaz", "banner"],
      "home audio": ["display", "totem", "banner", "adesivo de gôndola"],
      "headphones": ["provador", "display", "wobbler", "adesivo"],
      "gaming": ["totem", "banner", "vídeo"],
    };
    const catNames = input.produtos
      .map((p) => (p.categoria?.nome ?? "").toLowerCase())
      .filter(Boolean);
    const wanted = new Set<string>();
    for (const c of catNames) for (const t of expectedByCategoria[c] ?? []) wanted.add(t);
    if (wanted.size > 0) {
      const { data: extras } = await supabase
        .from("materiais_pdv")
        .select("id, codigo, nome, tipo, status, imagem_principal_url")
        .eq("status", "ativo")
        .in("tipo", [...wanted]);
      for (const m of (extras ?? []) as Mat[]) {
        if (uniq.has(m.id)) continue;
        opcionais.push({
          material_id: m.id,
          nome: m.nome,
          codigo: m.codigo,
          tipo: m.tipo,
          imagem_url: m.imagem_principal_url,
          score: 65,
          motivo: `Tipo "${m.tipo}" costuma acompanhar a categoria ${catNames.join(", ")}.`,
          origem: "categoria",
        });
      }
    }

    // Especiais — sugestões geradas por regras
    const especiais: SugestaoEspecial[] = [];
    const posicionamentos = new Set(
      input.produtos.map((p) => (p.posicionamento ?? "").toLowerCase()).filter(Boolean),
    );
    const temHero = input.produtos.some((p) => p.hero_product);
    const campanhaNome = input.lancamento.campanha?.nome ?? "";

    if (posicionamentos.has("premium") || posicionamentos.has("top")) {
      especiais.push({
        nome: "Display iluminado premium",
        objetivo: "Destacar produto premium no PDV com iluminação e acabamento diferenciado.",
        briefing:
          "Estrutura em MDF com pintura fosca, iluminação LED indireta, logomarca em relevo, base para o produto e área para wobbler. Padrão de acabamento JBL premium.",
        score: 88,
        motivo: "Produto posicionado como premium/top — pede exposição diferenciada.",
      });
    }
    if (temHero) {
      especiais.push({
        nome: "Ilha promocional Hero Product",
        objetivo: "Criar destaque de entrada de loja para o produto herói do lançamento.",
        briefing:
          "Ilha central 1,20m x 1,20m com totem 2m, comunicação da campanha, prateleira para produto real e experimentação sonora.",
        score: 90,
        motivo: "Produto marcado como Hero neste lançamento.",
      });
    }
    if (campanhaNome) {
      especiais.push({
        nome: `Kit customizado — ${campanhaNome}`,
        objetivo: `Peças customizadas para a campanha "${campanhaNome}".`,
        briefing:
          `Adaptar identidade visual da campanha ${campanhaNome} para wobbler, adesivo de gôndola e banner vertical, mantendo o guideline JBL.`,
        score: 76,
        motivo: `Lançamento vinculado à campanha ${campanhaNome}.`,
      });
    }
    if (input.produtos.some((p) => (p.campanha_tamanho ?? "").toLowerCase() === "global")) {
      especiais.push({
        nome: "Vídeo institucional 15s",
        objetivo: "Vídeo curto para telas de PDV em campanha global.",
        briefing:
          "Vídeo 15s formato 16:9 e 9:16, com pack shot, benefício-chave e endframe da campanha global.",
        score: 72,
        motivo: "Campanha classificada como Global — pede material audiovisual.",
      });
    }

    // Ordenar por score
    obrigatorios.sort((a, b) => b.score - a.score);
    opcionais.sort((a, b) => b.score - a.score);
    especiais.sort((a, b) => b.score - a.score);

    return { obrigatorios, opcionais, especiais };
  },
};

/* ---------------- AI provider (stub) ---------------- */

const AIProvider: DecisionProvider = {
  name: "ai",
  async analyze(input, deps) {
    // Placeholder — a futura integração com Lovable AI Gateway acontece aqui.
    // Enquanto não existe, degrada para heurística.
    return HeuristicProvider.analyze(input, deps);
  },
};

function getProvider(): DecisionProvider {
  const p = (process.env.DECISION_ENGINE_PROVIDER ?? "heuristic").toLowerCase();
  return p === "ai" ? AIProvider : HeuristicProvider;
}

/* ---------------- Server functions ---------------- */

export const analisarLancamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ lancamento_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();

    // Contexto do lançamento
    const { data: lanc, error } = await supabase
      .from("lancamentos")
      .select(
        "id, descricao, campanha:campanhas(id, nome, codigo), produtos:lancamentos_produtos(produto:produtos(id, nome, posicionamento, campanha_tamanho, hero_product, categoria:categorias(id, nome), linha:linhas(id, nome), familia:familias(id, nome)))",
      )
      .eq("id", data.lancamento_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lanc) throw new Error("Lançamento não encontrado");

    const { data: mats } = await supabase
      .from("lancamentos_materiais")
      .select("material_id, categoria")
      .eq("lancamento_id", data.lancamento_id);

    const vinculados = new Set<string>();
    const obrigAtuais = new Set<string>();
    for (const m of (mats ?? []) as Array<{ material_id: string; categoria: string }>) {
      if (m.material_id) {
        vinculados.add(m.material_id);
        if (m.categoria === "obrigatorio") obrigAtuais.add(m.material_id);
      }
    }

    const produtos = ((lanc.produtos ?? []) as Array<{ produto: DecisionInput["produtos"][number] | null }>)
      .map((p) => p.produto)
      .filter((p): p is DecisionInput["produtos"][number] => !!p);

    const input: DecisionInput = {
      lancamento: {
        id: lanc.id,
        campanha: lanc.campanha
          ? { id: lanc.campanha.id, nome: lanc.campanha.nome, codigo: lanc.campanha.codigo ?? null }
          : null,
        contexto: lanc.descricao ?? null,
      },
      produtos,
      materiais_vinculados: vinculados,
      materiais_obrigatorios_atuais: obrigAtuais,
    };

    const provider = getProvider();
    const out = await provider.analyze(input, { supabase });

    // Assinar imagens (best-effort) — imagens de materiais podem vir como storage path ou URL
    const paths: string[] = [];
    const collect = (arr: Recomendacao[]) => {
      for (const r of arr) {
        if (r.imagem_url && !r.imagem_url.startsWith("http")) paths.push(r.imagem_url);
      }
    };
    collect(out.obrigatorios); collect(out.opcionais);
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from("materiais").createSignedUrls(paths, 60 * 60 * 24);
      const map = new Map<string, string>();
      for (const s of signed ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
      const resolve = (arr: Recomendacao[]) => {
        for (const r of arr) {
          if (r.imagem_url && !r.imagem_url.startsWith("http")) {
            r.imagem_url = map.get(r.imagem_url) ?? null;
          }
        }
      };
      resolve(out.obrigatorios); resolve(out.opcionais);
    }

    return {
      provider: provider.name,
      contexto: {
        campanha: input.lancamento.campanha?.nome ?? null,
        produtos: input.produtos.map((p) => ({
          nome: p.nome,
          posicionamento: p.posicionamento,
          categoria: p.categoria?.nome ?? null,
          linha: p.linha?.nome ?? null,
          hero: p.hero_product,
        })),
        materiais_ja_vinculados: input.materiais_vinculados.size,
      },
      ...out,
    };
  });

export const aplicarRecomendacao = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        lancamento_id: z.string().uuid(),
        material_id: z.string().uuid(),
        categoria: z.enum(["obrigatorio", "existente"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("lancamentos_materiais").insert({
      lancamento_id: data.lancamento_id,
      material_id: data.material_id,
      categoria: data.categoria,
      origem: "auto",
      quantidade: 1,
      acao: "produzir",
      status: "pendente",
    } as never);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    await supabase.from("historico").insert({
      entidade_tipo: "lancamento",
      entidade_id: data.lancamento_id,
      acao: "decision_engine_material_aplicado",
      dados_depois: { material_id: data.material_id, categoria: data.categoria } as never,
    });
    return { ok: true };
  });

export const aplicarRecomendacaoEspecial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        lancamento_id: z.string().uuid(),
        nome: z.string().min(1),
        objetivo: z.string().optional(),
        briefing: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("materiais_especiais" as never).insert({
      lancamento_id: data.lancamento_id,
      nome: data.nome,
      objetivo: data.objetivo ?? null,
      briefing: data.briefing ?? null,
      status: "ideia",
    } as never);
    if (error) throw new Error(error.message);
    await supabase.from("historico").insert({
      entidade_tipo: "lancamento",
      entidade_id: data.lancamento_id,
      acao: "decision_engine_especial_aplicado",
      dados_depois: { nome: data.nome } as never,
    });
    return { ok: true };
  });
