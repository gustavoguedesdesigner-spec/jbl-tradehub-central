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

async function signPaths<T extends { storage_path: string | null }>(
  supabase: ReturnType<typeof getClient>,
  bucket: string,
  rows: T[],
): Promise<(T & { url_assinada: string | null })[]> {
  const withPath = rows.filter((r) => !!r.storage_path);
  if (withPath.length === 0) return rows.map((r) => ({ ...r, url_assinada: null }));
  const paths = withPath.map((r) => r.storage_path as string);
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60 * 24 * 7);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({
    ...r,
    url_assinada: r.storage_path ? map.get(r.storage_path) ?? null : null,
  }));
}

// ============ LEITURA GLOBAL ============
export const listarCompatibilidades = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("compatibilidades")
    .select(
      "id, observacao, created_at, produto:produtos(id,nome,sku), material:materiais_pdv(id,codigo,nome)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ============ POR PRODUTO ============
export const listarMateriaisDoProduto = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ produto_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: rows, error } = await supabase
      .from("compatibilidades")
      .select(
        "id, observacao, material:materiais_pdv(id,codigo,nome,tipo,status,dimensoes,imagens:materiais_imagens(storage_path,principal),fornecedor:fornecedores(id,nome),categoria:categorias(id,nome))",
      )
      .eq("produto_id", data.produto_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    for (const c of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mat: any = c.material;
      if (mat?.imagens?.length) mat.imagens = await signPaths(supabase, "materiais", mat.imagens);
    }
    return list;
  });

// ============ POR MATERIAL ============
export const listarProdutosDoMaterial = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ material_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: rows, error } = await supabase
      .from("compatibilidades")
      .select(
        "id, observacao, produto:produtos(id,sku,codigo_jbl,nome,status,posicionamento,imagens:produtos_imagens(storage_path,principal),linha:linhas(id,nome),categoria:categorias(id,nome),familia:familias(id,nome))",
      )
      .eq("material_id", data.material_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    for (const c of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prd: any = c.produto;
      if (prd?.imagens?.length) prd.imagens = await signPaths(supabase, "produtos", prd.imagens);
    }
    return list;
  });

// ============ CRIAR / REMOVER ============
export const vincularCompatibilidade = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        produto_id: z.string().uuid(),
        material_id: z.string().uuid(),
        observacao: z.string().max(500).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("compatibilidades").insert(data);
    if (error) {
      if (error.code === "23505") throw new Error("Este vínculo já existe.");
      throw new Error(error.message);
    }
    await supabase.from("historico").insert({
      entidade_tipo: "compatibilidade",
      entidade_id: data.produto_id,
      acao: "vinculada",
      dados_depois: { material_id: data.material_id } as never,
    });
    return { ok: true };
  });

export const desvincularCompatibilidade = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("compatibilidades").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ BUSCA COM FILTROS INTELIGENTES ============
const materialStatusEnum = z.enum(["rascunho", "em_desenvolvimento", "ativo", "descontinuado"]);
const produtoStatusEnum = z.enum(["ativo", "inativo", "descontinuado", "lancamento", "em_desenvolvimento"]);

export const buscarMateriaisParaVincular = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        produto_id: z.string().uuid(),
        busca: z.string().optional(),
        tipo: z.string().optional(),
        categoria_id: z.string().uuid().optional(),
        fornecedor_id: z.string().uuid().optional(),
        status: materialStatusEnum.optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: existentes } = await supabase
      .from("compatibilidades")
      .select("material_id")
      .eq("produto_id", data.produto_id);
    const excluir = (existentes ?? []).map((e) => e.material_id).filter(Boolean) as string[];

    let query = supabase
      .from("materiais_pdv")
      .select(
        "id, codigo, nome, tipo, status, dimensoes, imagens:materiais_imagens(storage_path,principal), fornecedor:fornecedores(id,nome), categoria:categorias(id,nome)",
      )
      .order("nome")
      .limit(60);

    if (excluir.length > 0) query = query.not("id", "in", `(${excluir.join(",")})`);
    if (data.busca) {
      const t = `%${data.busca}%`;
      query = query.or(`nome.ilike.${t},codigo.ilike.${t},tipo.ilike.${t}`);
    }
    if (data.tipo) query = query.ilike("tipo", `%${data.tipo}%`);
    if (data.categoria_id) query = query.eq("categoria_id", data.categoria_id);
    if (data.fornecedor_id) query = query.eq("fornecedor_id", data.fornecedor_id);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    for (const r of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyR: any = r;
      if (anyR.imagens?.length) anyR.imagens = await signPaths(supabase, "materiais", anyR.imagens);
    }
    return list;
  });

export const buscarProdutosParaVincular = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        material_id: z.string().uuid(),
        busca: z.string().optional(),
        linha_id: z.string().uuid().optional(),
        categoria_id: z.string().uuid().optional(),
        familia_id: z.string().uuid().optional(),
        status: produtoStatusEnum.optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: existentes } = await supabase
      .from("compatibilidades")
      .select("produto_id")
      .eq("material_id", data.material_id);
    const excluir = (existentes ?? []).map((e) => e.produto_id).filter(Boolean) as string[];

    let query = supabase
      .from("produtos")
      .select(
        "id, sku, codigo_jbl, nome, status, posicionamento, imagens:produtos_imagens(storage_path,principal), linha:linhas(id,nome), categoria:categorias(id,nome), familia:familias(id,nome)",
      )
      .order("nome")
      .limit(60);

    if (excluir.length > 0) query = query.not("id", "in", `(${excluir.join(",")})`);
    if (data.busca) {
      const t = `%${data.busca}%`;
      query = query.or(`nome.ilike.${t},sku.ilike.${t},codigo_jbl.ilike.${t}`);
    }
    if (data.linha_id) query = query.eq("linha_id", data.linha_id);
    if (data.categoria_id) query = query.eq("categoria_id", data.categoria_id);
    if (data.familia_id) query = query.eq("familia_id", data.familia_id);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    for (const r of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyR: any = r;
      if (anyR.imagens?.length) anyR.imagens = await signPaths(supabase, "produtos", anyR.imagens);
    }
    return list;
  });
