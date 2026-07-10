import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function getClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type BuscaResultado = {
  id: string;
  tipo: "produto" | "material" | "projeto" | "briefing" | "campanha" | "arquivo" | "fornecedor";
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  url: string;
};

export const buscaGlobal = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const t = `%${data.q.trim()}%`;
    const limit = 8;

    const [
      produtos, materiais, projetos, briefings, campanhas, arquivos, fornecedores,
    ] = await Promise.all([
      supabase
        .from("produtos")
        .select("id, nome, sku, codigo_jbl, status, linha:linhas(nome), categoria:categorias(nome)")
        .or(`nome.ilike.${t},sku.ilike.${t},codigo_jbl.ilike.${t}`)
        .limit(limit),
      supabase
        .from("materiais_pdv")
        .select("id, nome, codigo, tipo, status")
        .or(`nome.ilike.${t},codigo.ilike.${t},tipo.ilike.${t}`)
        .limit(limit),
      supabase
        .from("lancamentos")
        .select("id, nome, codigo, status, campanha:campanhas(nome)")
        .or(`nome.ilike.${t},codigo.ilike.${t}`)
        .limit(limit),
      supabase
        .from("briefings")
        .select("id, titulo, objetivo, status, lancamento_id")
        .or(`titulo.ilike.${t},objetivo.ilike.${t},mensagem_chave.ilike.${t}`)
        .limit(limit),
      supabase
        .from("campanhas")
        .select("id, nome, codigo, status")
        .or(`nome.ilike.${t},codigo.ilike.${t}`)
        .limit(limit),
      supabase
        .from("arquivos")
        .select("id, nome, mime_type, descricao")
        .or(`nome.ilike.${t},descricao.ilike.${t}`)
        .limit(limit),
      supabase
        .from("fornecedores")
        .select("id, nome, contato_nome, contato_email")
        .or(`nome.ilike.${t},contato_nome.ilike.${t},contato_email.ilike.${t}`)
        .limit(limit),
    ]);

    const out: BuscaResultado[] = [];

    for (const p of produtos.data ?? []) {
      out.push({
        id: p.id, tipo: "produto",
        titulo: p.nome,
        subtitulo: [p.sku, p.codigo_jbl].filter(Boolean).join(" · ") || null,
        descricao: [p.linha?.nome, p.categoria?.nome, p.status].filter(Boolean).join(" · ") || null,
        url: `/base-mestre/produtos/${p.id}`,
      });
    }
    for (const m of materiais.data ?? []) {
      out.push({
        id: m.id, tipo: "material",
        titulo: m.nome,
        subtitulo: [m.codigo, m.tipo].filter(Boolean).join(" · ") || null,
        descricao: m.status ?? null,
        url: `/base-mestre/materiais/${m.id}`,
      });
    }
    for (const l of projetos.data ?? []) {
      out.push({
        id: l.id, tipo: "projeto",
        titulo: l.nome,
        subtitulo: l.codigo ?? null,
        descricao: [l.campanha?.nome, l.status].filter(Boolean).join(" · ") || null,
        url: `/lancamentos/${l.id}`,
      });
    }
    for (const b of briefings.data ?? []) {
      out.push({
        id: b.id, tipo: "briefing",
        titulo: b.titulo ?? "Briefing",
        subtitulo: b.status ?? null,
        descricao: b.objetivo ?? null,
        url: b.lancamento_id ? `/lancamentos/${b.lancamento_id}` : "/lancamentos",
      });
    }
    for (const c of campanhas.data ?? []) {
      out.push({
        id: c.id, tipo: "campanha",
        titulo: c.nome,
        subtitulo: c.codigo ?? null,
        descricao: c.status ?? null,
        url: "/lancamentos",
      });
    }
    for (const a of arquivos.data ?? []) {
      out.push({
        id: a.id, tipo: "arquivo",
        titulo: a.nome,
        subtitulo: a.mime_type ?? null,
        descricao: a.descricao ?? null,
        url: "/base-mestre/arquivos",
      });
    }
    for (const f of fornecedores.data ?? []) {
      const esp = Array.isArray(f.especialidades) ? f.especialidades.join(", ") : null;
      out.push({
        id: f.id, tipo: "fornecedor",
        titulo: f.nome,
        subtitulo: f.cidade ?? null,
        descricao: esp,
        url: "/base-mestre/fornecedores",
      });
    }

    return out;
  });
