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

export const ASSET_TIPOS = [
  "imagem", "video", "pdf", "brand_book", "guideline", "powerpoint", "excel", "word",
  "ai", "psd", "indd", "eps", "stl", "obj", "zip", "foto_loja", "foto_pdv", "mockup", "render", "outro",
] as const;
export type AssetTipo = (typeof ASSET_TIPOS)[number];

export const ASSET_ENTIDADES = [
  "produto", "material", "lancamento", "campanha", "guideline", "categoria", "familia", "fornecedor",
] as const;
export type AssetEntidade = (typeof ASSET_ENTIDADES)[number];

const tipoEnum = z.enum(ASSET_TIPOS);
const entidadeEnum = z.enum(ASSET_ENTIDADES);
const statusEnum = z.enum(["rascunho", "ativo", "arquivado", "obsoleto"]);

// -------- helpers --------
async function assinar(
  supabase: ReturnType<typeof getClient>,
  paths: (string | null | undefined)[],
) {
  const clean = paths.filter((p): p is string => !!p);
  if (clean.length === 0) return new Map<string, string>();
  const { data } = await supabase.storage.from("assets").createSignedUrls(clean, 60 * 60 * 24 * 7);
  const map = new Map<string, string>();
  for (const s of data ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  return map;
}

// -------- LIST --------
export const listarAssets = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        tipo: tipoEnum.optional().nullable(),
        status: statusEnum.optional().nullable(),
        pasta_id: z.string().uuid().optional().nullable(),
        busca: z.string().optional().nullable(),
        tag: z.string().optional().nullable(),
        limite: z.number().int().min(1).max(500).optional(),
      })
      .default({})
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    let query = supabase
      .from("assets" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limite ?? 200);
    if (data.tipo) query = query.eq("tipo", data.tipo);
    if (data.status) query = query.eq("status", data.status);
    if (data.pasta_id) query = query.eq("pasta_id", data.pasta_id);
    if (data.busca) query = query.ilike("nome", `%${data.busca}%`);
    if (data.tag) query = query.contains("tags", [data.tag]);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as Array<
      { storage_path: string; thumbnail_path: string | null; preview_path: string | null } & Record<string, unknown>
    >;
    const map = await assinar(
      supabase,
      list.flatMap((r) => [r.storage_path, r.thumbnail_path, r.preview_path]),
    );
    return list.map((r) => ({
      ...r,
      url: map.get(r.storage_path) ?? null,
      thumbnail_url: r.thumbnail_path ? map.get(r.thumbnail_path) ?? null : null,
      preview_url: r.preview_path ? map.get(r.preview_path) ?? null : null,
    }));
  });

// -------- OBTER --------
export const obterAsset = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("assets" as never)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Asset não encontrado");
    const r = row as unknown as { storage_path: string; thumbnail_path: string | null; preview_path: string | null };
    const map = await assinar(supabase, [r.storage_path, r.thumbnail_path, r.preview_path]);

    const { data: vinculos } = await supabase
      .from("asset_vinculos" as never)
      .select("*")
      .eq("asset_id", data.id);

    const { data: comentarios } = await supabase
      .from("asset_comentarios" as never)
      .select("*")
      .eq("asset_id", data.id)
      .order("created_at", { ascending: false });

    return {
      ...(row as Record<string, unknown>),
      url: map.get(r.storage_path) ?? null,
      thumbnail_url: r.thumbnail_path ? map.get(r.thumbnail_path) ?? null : null,
      preview_url: r.preview_path ? map.get(r.preview_path) ?? null : null,
      vinculos: vinculos ?? [],
      comentarios: comentarios ?? [],
    };
  });

// -------- CRIAR --------
const assetInput = z.object({
  nome: z.string().min(1).max(300),
  descricao: z.string().max(4000).nullable().optional(),
  tipo: tipoEnum.default("outro"),
  categoria: z.string().max(120).nullable().optional(),
  tags: z.array(z.string()).default([]),
  autor: z.string().max(200).nullable().optional(),
  versao: z.string().max(40).nullable().optional(),
  formato: z.string().max(40).nullable().optional(),
  peso_bytes: z.number().int().nonnegative().nullable().optional(),
  largura: z.number().int().nullable().optional(),
  altura: z.number().int().nullable().optional(),
  duracao_segundos: z.number().nullable().optional(),
  status: statusEnum.default("ativo"),
  storage_path: z.string().min(1).max(500),
  thumbnail_path: z.string().max(500).nullable().optional(),
  preview_path: z.string().max(500).nullable().optional(),
  pasta_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const criarAsset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => assetInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("assets" as never)
      .insert(data as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const atualizarAsset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: assetInput.partial() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase
      .from("assets" as never)
      .update(data.patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirAsset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row } = await supabase
      .from("assets" as never)
      .select("storage_path, thumbnail_path, preview_path")
      .eq("id", data.id)
      .maybeSingle();
    const paths: string[] = [];
    const r = row as unknown as { storage_path?: string; thumbnail_path?: string | null; preview_path?: string | null } | null;
    if (r?.storage_path) paths.push(r.storage_path);
    if (r?.thumbnail_path) paths.push(r.thumbnail_path);
    if (r?.preview_path) paths.push(r.preview_path);
    if (paths.length) await supabase.storage.from("assets").remove(paths);
    const { error } = await supabase.from("assets" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- DOWNLOAD (increment counter) --------
export const registrarDownload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row } = await supabase
      .from("assets" as never)
      .select("downloads")
      .eq("id", data.id)
      .maybeSingle();
    const atual = ((row as unknown as { downloads?: number } | null)?.downloads ?? 0) + 1;
    await supabase
      .from("assets" as never)
      .update({ downloads: atual } as never)
      .eq("id", data.id);
    return { downloads: atual };
  });

// -------- VÍNCULOS --------
export const vincularAsset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        asset_id: z.string().uuid(),
        entidade_tipo: entidadeEnum,
        entidade_id: z.string().uuid(),
        papel: z.string().max(120).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase
      .from("asset_vinculos" as never)
      .upsert(data as never, { onConflict: "asset_id,entidade_tipo,entidade_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const desvincularAsset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        asset_id: z.string().uuid(),
        entidade_tipo: entidadeEnum,
        entidade_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase
      .from("asset_vinculos" as never)
      .delete()
      .eq("asset_id", data.asset_id)
      .eq("entidade_tipo", data.entidade_tipo)
      .eq("entidade_id", data.entidade_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarAssetsPorEntidade = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ entidade_tipo: entidadeEnum, entidade_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: vinc, error } = await supabase
      .from("asset_vinculos" as never)
      .select("asset_id, papel, ordem")
      .eq("entidade_tipo", data.entidade_tipo)
      .eq("entidade_id", data.entidade_id);
    if (error) throw new Error(error.message);
    const ids = (vinc ?? []).map((v: { asset_id: string }) => v.asset_id);
    if (ids.length === 0) return [];
    const { data: rows } = await supabase
      .from("assets" as never)
      .select("*")
      .in("id", ids);
    const list = (rows ?? []) as Array<
      { storage_path: string; thumbnail_path: string | null } & Record<string, unknown>
    >;
    const map = await assinar(supabase, list.flatMap((r) => [r.storage_path, r.thumbnail_path]));
    return list.map((r) => ({
      ...r,
      url: map.get(r.storage_path) ?? null,
      thumbnail_url: r.thumbnail_path ? map.get(r.thumbnail_path) ?? null : null,
    }));
  });

// -------- PASTAS --------
export const listarPastas = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("asset_pastas" as never)
    .select("*")
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const criarPasta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        nome: z.string().min(1).max(120),
        parent_id: z.string().uuid().nullable().optional(),
        cor: z.string().max(20).nullable().optional(),
        icone: z.string().max(60).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("asset_pastas" as never)
      .insert(data as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// -------- COMENTÁRIOS --------
export const adicionarComentarioAsset = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ asset_id: z.string().uuid(), corpo: z.string().min(1).max(4000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("asset_comentarios" as never).insert(data as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
