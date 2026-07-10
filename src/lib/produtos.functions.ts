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

const produtoStatus = z.enum(["ativo", "inativo", "descontinuado", "lancamento", "em_desenvolvimento"]);
const posicionamento = z.enum(["entrada", "intermediario", "premium", "hero"]);
const campanhaTamanho = z.enum(["P", "M", "G"]);

const produtoInput = z.object({
  sku: z.string().min(1, "SKU obrigatório").max(64),
  codigo_jbl: z.string().max(64).optional().nullable(),
  nome: z.string().min(1, "Nome obrigatório").max(200),
  descricao_curta: z.string().max(500).optional().nullable(),
  descricao: z.string().max(8000).optional().nullable(),
  linha_id: z.string().uuid().optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
  familia_id: z.string().uuid().optional().nullable(),
  posicionamento: posicionamento.optional().nullable(),
  campanha_tamanho: campanhaTamanho.optional().nullable(),
  data_lancamento: z.string().optional().nullable(),
  hero_product: z.boolean().default(false),
  features: z.array(z.string()).default([]),
  diferenciais: z.string().max(4000).optional().nullable(),
  observacoes: z.string().max(4000).optional().nullable(),
  status: produtoStatus.default("ativo"),
  preco_sugerido: z.number().nonnegative().optional().nullable(),
  ean: z.string().max(32).optional().nullable(),
  marca: z.string().max(80).optional().nullable(),
});

async function signPaths<T extends { storage_path: string | null; bucket?: string | null }>(
  supabase: ReturnType<typeof getClient>,
  defaultBucket: string,
  rows: T[],
): Promise<(T & { url_assinada: string | null })[]> {
  const grupos = new Map<string, T[]>();
  for (const r of rows) {
    if (!r.storage_path) continue;
    const b = r.bucket || defaultBucket;
    const arr = grupos.get(b) ?? [];
    arr.push(r);
    grupos.set(b, arr);
  }
  const urlPor = new Map<string, string>();
  for (const [bucket, list] of grupos) {
    const paths = list.map((r) => r.storage_path as string);
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60 * 24 * 7);
    for (const s of data ?? []) if (s.path && s.signedUrl) urlPor.set(`${bucket}:${s.path}`, s.signedUrl);
  }
  return rows.map((r) => ({
    ...r,
    url_assinada: r.storage_path
      ? urlPor.get(`${r.bucket || defaultBucket}:${r.storage_path}`) ?? null
      : null,
  }));
}

async function registrarHistorico(
  supabase: ReturnType<typeof getClient>,
  entidade_id: string,
  acao: string,
  dados_depois?: Record<string, unknown>,
) {
  await supabase.from("historico").insert({
    entidade_tipo: "produto",
    entidade_id,
    acao,
    dados_depois: (dados_depois ?? null) as never,
  });
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
        "id, sku, codigo_jbl, nome, status, hero_product, posicionamento, preco_sugerido, ean, updated_at, linha:linhas(id,nome), categoria:categorias(id,nome), familia:familias(id,nome), imagens:produtos_imagens(id,storage_path,principal,ordem,bucket,asset_id)",
      )
      .order("updated_at", { ascending: false });

    if (data.busca) {
      const t = `%${data.busca}%`;
      query = query.or(`nome.ilike.${t},sku.ilike.${t},codigo_jbl.ilike.${t}`);
    }
    if (data.linha_id) query = query.eq("linha_id", data.linha_id);
    if (data.categoria_id) query = query.eq("categoria_id", data.categoria_id);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    for (const row of list) {
      row.imagens = await signPaths(supabase, "produtos", row.imagens ?? []);
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
        "*, linha:linhas(id,nome), categoria:categorias(id,nome), familia:familias(id,nome), imagens:produtos_imagens(id,storage_path,url_publica,ordem,principal,legenda,tipo,bucket,asset_id), videos:produtos_videos(*), documentos:produtos_documentos(*)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Produto não encontrado");
    row.imagens = await signPaths(supabase, "produtos", row.imagens ?? []);
    row.videos = await signPaths(supabase, "produtos-videos", row.videos ?? []);
    row.documentos = await signPaths(supabase, "produtos-documentos", row.documentos ?? []);
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
    await registrarHistorico(supabase, row.id, "criado", { nome: data.nome });
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
    await registrarHistorico(supabase, data.id, "atualizado", { status: data.dados.status });
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

export const duplicarProduto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: original, error: errGet } = await supabase
      .from("produtos")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (errGet) throw new Error(errGet.message);
    if (!original) throw new Error("Produto não encontrado");

    const baseSku = original.sku ?? "PROD";
    let novoSku = `${baseSku}-COPIA`;
    let n = 1;
    while (true) {
      const { data: existe } = await supabase
        .from("produtos")
        .select("id")
        .eq("sku", novoSku)
        .maybeSingle();
      if (!existe) break;
      n += 1;
      novoSku = `${baseSku}-COPIA-${n}`;
    }

    const orig = original as Record<string, unknown>;
    delete orig.id;
    delete orig.created_at;
    delete orig.updated_at;

    const payload = {
      ...orig,
      sku: novoSku,
      nome: `${original.nome} (cópia)`,
      ean: null,
      codigo_jbl: null,
      status: "em_desenvolvimento",
    };

    const { data: novo, error: errIns } = await supabase
      .from("produtos")
      .insert(payload as never)
      .select("id")
      .single();
    if (errIns) throw new Error(errIns.message);
    await registrarHistorico(supabase, novo.id, "duplicado", { origem_id: data.id });
    return novo;
  });

// ============ IMAGENS ============
const imagemInput = z.object({
  produto_id: z.string().uuid(),
  storage_path: z.string().min(1),
  url_publica: z.string().min(1),
  principal: z.boolean().default(false),
  tipo: z.string().max(60).optional().nullable(),
  legenda: z.string().max(300).optional().nullable(),
  bucket: z.string().max(60).optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
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
    await registrarHistorico(supabase, data.produto_id, "imagem_adicionada");
    return row;
  });

export const atualizarImagem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        legenda: z.string().max(300).optional().nullable(),
        tipo: z.string().max(60).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase
      .from("produtos_imagens")
      .update({ legenda: data.legenda ?? null, tipo: data.tipo ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const definirImagemPrincipal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), produto_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    await supabase
      .from("produtos_imagens")
      .update({ principal: false })
      .eq("produto_id", data.produto_id);
    const { error } = await supabase
      .from("produtos_imagens")
      .update({ principal: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reordenarImagens = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ ordem: z.array(z.string().uuid()) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    for (let i = 0; i < data.ordem.length; i++) {
      await supabase.from("produtos_imagens").update({ ordem: i }).eq("id", data.ordem[i]);
    }
    return { ok: true };
  });

export const removerImagem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: img } = await supabase
      .from("produtos_imagens")
      .select("storage_path, produto_id, bucket, asset_id")
      .eq("id", data.id)
      .maybeSingle();
    if (img?.storage_path && !img.asset_id) {
      // só remove do storage se NÃO for asset da Biblioteca (asset pode ser reutilizado)
      await supabase.storage.from(img.bucket || "produtos").remove([img.storage_path]);
    }
    const { error } = await supabase.from("produtos_imagens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (img?.produto_id) await registrarHistorico(supabase, img.produto_id, "imagem_removida");
    return { ok: true };
  });

// ============ VÍDEOS ============
const videoInput = z.object({
  produto_id: z.string().uuid(),
  origem: z.enum(["upload", "youtube", "vimeo"]),
  titulo: z.string().max(200).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  storage_path: z.string().max(500).optional().nullable(),
  bucket: z.string().max(60).optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
});

export const adicionarVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => videoInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: existentes } = await supabase
      .from("produtos_videos")
      .select("id")
      .eq("produto_id", data.produto_id);
    const ordem = existentes?.length ?? 0;
    const { data: row, error } = await supabase
      .from("produtos_videos")
      .insert({ ...data, ordem })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.produto_id, "video_adicionado", { origem: data.origem });
    return row;
  });

export const removerVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: v } = await supabase
      .from("produtos_videos")
      .select("storage_path, produto_id, bucket, asset_id")
      .eq("id", data.id)
      .maybeSingle();
    if (v?.storage_path && !v.asset_id) {
      await supabase.storage.from(v.bucket || "produtos-videos").remove([v.storage_path]);
    }
    const { error } = await supabase.from("produtos_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (v?.produto_id) await registrarHistorico(supabase, v.produto_id, "video_removido");
    return { ok: true };
  });

// ============ DOCUMENTOS ============
const documentoInput = z.object({
  produto_id: z.string().uuid(),
  nome: z.string().min(1).max(200),
  categoria: z.string().max(80).optional().nullable(),
  descricao: z.string().max(2000).optional().nullable(),
  versao: z.string().max(30).optional().nullable(),
  autor: z.string().max(120).optional().nullable(),
  storage_path: z.string().min(1),
  mime_type: z.string().max(120).optional().nullable(),
  tamanho_bytes: z.number().int().nonnegative().optional().nullable(),
  guideline: z.boolean().default(false),
  data_documento: z.string().optional().nullable(),
  bucket: z.string().max(60).optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
});

export const adicionarDocumento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => documentoInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("produtos_documentos")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.produto_id, "documento_adicionado", { nome: data.nome });
    return row;
  });

export const removerDocumento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: d } = await supabase
      .from("produtos_documentos")
      .select("storage_path, produto_id, bucket, asset_id")
      .eq("id", data.id)
      .maybeSingle();
    if (d?.storage_path && !d.asset_id) {
      await supabase.storage.from(d.bucket || "produtos-documentos").remove([d.storage_path]);
    }
    const { error } = await supabase.from("produtos_documentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (d?.produto_id) await registrarHistorico(supabase, d.produto_id, "documento_removido");
    return { ok: true };
  });

// ============ RELACIONADOS ============
export const listarMateriaisCompativeis = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ produto_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: rows, error } = await supabase
      .from("compatibilidades")
      .select("id, observacao, material:materiais_pdv(id,codigo,nome,tipo)")
      .eq("produto_id", data.produto_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listarProjetosDoProduto = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ produto_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: rows, error } = await supabase
      .from("lancamentos_produtos")
      .select("id, lancamento:lancamentos(id, nome, codigo, status, data_prevista, data_lancamento, campanha:campanhas(id,nome))")
      .eq("produto_id", data.produto_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listarHistoricoProduto = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ produto_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: rows, error } = await supabase
      .from("historico")
      .select("*")
      .eq("entidade_tipo", "produto")
      .eq("entidade_id", data.produto_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
