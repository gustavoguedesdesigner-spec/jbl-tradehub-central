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

const lancamentoStatus = z.enum(["planejado", "em_andamento", "lancado", "cancelado"]);

const lancamentoInput = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(200),
  codigo: z.string().max(64).optional().nullable(),
  descricao: z.string().max(4000).optional().nullable(),
  campanha_id: z.string().uuid().optional().nullable(),
  responsavel_id: z.string().uuid().optional().nullable(),
  data_prevista: z.string().optional().nullable(),
  data_lancamento: z.string().optional().nullable(),
  status: lancamentoStatus.default("planejado"),
  prioridade: z.number().int().min(0).max(5).default(2),
  produto_id: z.string().uuid("Selecione um produto"),
});

async function registrarHistorico(
  supabase: ReturnType<typeof getClient>,
  entidade_id: string,
  acao: string,
  dados_depois?: Record<string, unknown>,
) {
  await supabase.from("historico").insert({
    entidade_tipo: "lancamento",
    entidade_id,
    acao,
    dados_depois: (dados_depois ?? null) as never,
  });
}

export const listarLancamentos = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        busca: z.string().optional(),
        status: lancamentoStatus.optional(),
        campanha_id: z.string().uuid().optional(),
        responsavel_id: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    let query = supabase
      .from("lancamentos")
      .select(
        "id, nome, codigo, descricao, status, prioridade, data_prevista, data_lancamento, updated_at, campanha:campanhas(id,nome,status), responsavel:profiles(id,nome,email,avatar_url), produtos:lancamentos_produtos(id, produto:produtos(id,nome,sku,codigo_jbl,status,imagens:produtos_imagens(storage_path,principal,ordem)))",
      )
      .order("updated_at", { ascending: false });

    if (data.busca) {
      const t = `%${data.busca}%`;
      query = query.or(`nome.ilike.${t},codigo.ilike.${t}`);
    }
    if (data.status) query = query.eq("status", data.status);
    if (data.campanha_id) query = query.eq("campanha_id", data.campanha_id);
    if (data.responsavel_id) query = query.eq("responsavel_id", data.responsavel_id);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // sign product image thumbs (best-effort)
    const list = rows ?? [];
    const allPaths = new Set<string>();
    for (const l of list) {
      for (const p of l.produtos ?? []) {
        const img = (p.produto?.imagens ?? []).find((i) => i.principal) ?? p.produto?.imagens?.[0];
        if (img?.storage_path) allPaths.add(img.storage_path);
      }
    }
    const signedMap = new Map<string, string>();
    if (allPaths.size > 0) {
      const { data: signed } = await supabase.storage
        .from("produtos")
        .createSignedUrls([...allPaths], 60 * 60 * 24);
      for (const s of signed ?? []) if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
      signedMap = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    }
    for (const l of list) {
      for (const p of l.produtos ?? []) {
        const img = (p.produto?.imagens ?? []).find((i) => i.principal) ?? p.produto?.imagens?.[0];
        (p as unknown as { thumb_url: string | null }).thumb_url = img?.storage_path
          ? signedMap.get(img.storage_path) ?? null
          : null;
      }
    }
    return list;
  });

export const obterLancamento = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("lancamentos")
      .select(
        "*, campanha:campanhas(id,nome,status,data_inicio,data_fim), responsavel:profiles(id,nome,email,avatar_url,cargo), produtos:lancamentos_produtos(id, produto:produtos(id,nome,sku,codigo_jbl,status,descricao_curta,linha:linhas(nome),categoria:categorias(nome),imagens:produtos_imagens(storage_path,principal,ordem)))",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Lançamento não encontrado");

    const paths = new Set<string>();
    for (const p of row.produtos ?? []) {
      for (const i of p.produto?.imagens ?? []) if (i.storage_path) paths.add(i.storage_path);
    }
    let map = new Map<string, string>();
    if (paths.size > 0) {
      const { data: signed } = await supabase.storage
        .from("produtos")
        .createSignedUrls([...paths], 60 * 60 * 24 * 7);
      map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    }
    for (const p of row.produtos ?? []) {
      const withUrl = (p.produto?.imagens ?? []).map((i) => ({
        ...i,
        url_assinada: i.storage_path ? map.get(i.storage_path) ?? null : null,
      }));
      if (p.produto) (p.produto as unknown as { imagens: unknown }).imagens = withUrl;
    }

    // histórico
    const { data: historico } = await supabase
      .from("historico")
      .select("*")
      .eq("entidade_tipo", "lancamento")
      .eq("entidade_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return { ...row, historico: historico ?? [] };
  });

export const criarLancamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => lancamentoInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { produto_id, ...lanc } = data;
    const { data: row, error } = await supabase
      .from("lancamentos")
      .insert(lanc)
      .select("id, nome")
      .single();
    if (error) throw new Error(error.message);
    const { error: linkError } = await supabase
      .from("lancamentos_produtos")
      .insert({ lancamento_id: row.id, produto_id });
    if (linkError) throw new Error(linkError.message);
    await registrarHistorico(supabase, row.id, "criado", { nome: row.nome });
    return row;
  });

export const atualizarLancamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        dados: lancamentoInput.omit({ produto_id: true }).partial(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("lancamentos").update(data.dados).eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.id, "atualizado", data.dados as Record<string, unknown>);
    return { ok: true };
  });

export const excluirLancamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("lancamentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const vincularProdutoLancamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ lancamento_id: z.string().uuid(), produto_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("lancamentos_produtos").insert(data);
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.lancamento_id, "produto_vinculado");
    return { ok: true };
  });

export const desvincularProdutoLancamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row } = await supabase
      .from("lancamentos_produtos")
      .select("lancamento_id")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabase.from("lancamentos_produtos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.lancamento_id)
      await registrarHistorico(supabase, row.lancamento_id, "produto_desvinculado");
    return { ok: true };
  });

// ============ CAMPANHAS ============
export const listarCampanhas = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("campanhas")
    .select("id, nome, codigo, status, data_inicio, data_fim")
    .order("data_inicio", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const criarCampanhaRapida = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ nome: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("campanhas")
      .insert({ nome: data.nome, status: "planejada" })
      .select("id, nome")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ RESPONSÁVEIS ============
export const listarResponsaveis = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, avatar_url, cargo")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ============ PRODUTOS DISPONÍVEIS ============
export const listarProdutosDisponiveis = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome, sku, codigo_jbl, status, linha:linhas(nome), categoria:categorias(nome)")
    .order("nome", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});
