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

const produtoStatus = z.enum(["ativo", "inativo", "descontinuado", "lancamento"]);

const produtoInput = z.object({
  sku: z.string().min(1, "SKU obrigatório").max(64),
  nome: z.string().min(1, "Nome obrigatório").max(200),
  descricao: z.string().max(4000).optional().nullable(),
  linha_id: z.string().uuid().optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
  status: produtoStatus.default("ativo"),
  preco_sugerido: z.number().nonnegative().optional().nullable(),
  ean: z.string().max(32).optional().nullable(),
});

async function signImagemPaths<T extends { storage_path: string }>(
  supabase: ReturnType<typeof getClient>,
  imagens: T[],
): Promise<(T & { url_assinada: string | null })[]> {
  if (!imagens || imagens.length === 0) return [];
  const paths = imagens.map((i) => i.storage_path);
  const { data } = await supabase.storage.from("produtos").createSignedUrls(paths, 60 * 60 * 24 * 7);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return imagens.map((i) => ({ ...i, url_assinada: map.get(i.storage_path) ?? null }));
}

export const listarProdutos = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        busca: z.string().optional(),
        linha_id: z.string().uuid().optional(),
        categoria_id: z.string().uuid().optional(),
        status: produtoStatus.optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    let query = supabase
      .from("produtos")
      .select(
        "id, sku, nome, status, preco_sugerido, ean, updated_at, linha:linhas(id,nome), categoria:categorias(id,nome), imagens:produtos_imagens(id,storage_path,principal,ordem)",
      )
      .order("updated_at", { ascending: false });

    if (data.busca) {
      const t = `%${data.busca}%`;
      query = query.or(`nome.ilike.${t},sku.ilike.${t}`);
    }
    if (data.linha_id) query = query.eq("linha_id", data.linha_id);
    if (data.categoria_id) query = query.eq("categoria_id", data.categoria_id);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    for (const row of list) {
      row.imagens = await signImagemPaths(supabase, row.imagens ?? []);
    }
    return list;
  });

export const obterProduto = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("produtos")
      .select(
        "*, linha:linhas(id,nome), categoria:categorias(id,nome), imagens:produtos_imagens(id,storage_path,url_publica,ordem,principal)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Produto não encontrado");
    return row;
  });

export const criarProduto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => produtoInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("produtos")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const atualizarProduto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), dados: produtoInput }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("produtos").update(data.dados).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirProduto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("produtos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const imagemInput = z.object({
  produto_id: z.string().uuid(),
  storage_path: z.string().min(1),
  url_publica: z.string().min(1),
  principal: z.boolean().default(false),
});

export const adicionarImagem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => imagemInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: existentes } = await supabase
      .from("produtos_imagens")
      .select("id")
      .eq("produto_id", data.produto_id);
    const ordem = existentes?.length ?? 0;
    const principal = data.principal || ordem === 0;
    if (principal) {
      await supabase
        .from("produtos_imagens")
        .update({ principal: false })
        .eq("produto_id", data.produto_id);
    }
    const { data: row, error } = await supabase
      .from("produtos_imagens")
      .insert({ ...data, principal, ordem })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removerImagem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: img } = await supabase
      .from("produtos_imagens")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (img?.storage_path) {
      await supabase.storage.from("produtos").remove([img.storage_path]);
    }
    const { error } = await supabase.from("produtos_imagens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
