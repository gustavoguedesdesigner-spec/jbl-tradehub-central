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

const materialStatus = z.enum(["rascunho", "em_desenvolvimento", "ativo", "descontinuado"]);

const materialInput = z.object({
  codigo: z.string().min(1).max(64),
  nome: z.string().min(1).max(200),
  descricao: z.string().max(4000).optional().nullable(),
  briefing: z.string().max(8000).optional().nullable(),
  observacoes: z.string().max(4000).optional().nullable(),
  tipo: z.string().max(64).optional().nullable(),
  dimensoes: z.string().max(120).optional().nullable(),
  fornecedor_id: z.string().uuid().optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
  status: materialStatus.default("rascunho"),
  imagem_principal_url: z.string().max(500).optional().nullable(),
  material_construcao: z.string().max(64).optional().nullable(),
  peso: z.string().max(64).optional().nullable(),
  prazo_producao: z.string().max(64).optional().nullable(),
  valor_estimado: z.number().nonnegative().optional().nullable(),
  quantidade_minima: z.number().int().nonnegative().optional().nullable(),
  tipo_impressao: z.string().max(120).optional().nullable(),
  acabamento: z.string().max(120).optional().nullable(),
});

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

async function registrarHistorico(
  supabase: ReturnType<typeof getClient>,
  entidade_id: string,
  acao: string,
  dados_depois?: Record<string, unknown>,
) {
  await supabase.from("historico").insert({
    entidade_tipo: "material",
    entidade_id,
    acao,
    dados_depois: (dados_depois ?? null) as never,
  });
}

// ============ LISTAGEM ============
export const listarMateriais = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("materiais_pdv")
    .select(
      "id, codigo, nome, descricao, tipo, dimensoes, status, imagem_principal_url, updated_at, fornecedor:fornecedores(id,nome), categoria:categorias(id,nome), imagens:materiais_imagens(id,storage_path,principal)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  for (const r of rows) {
    r.imagens = await signPaths(supabase, "materiais", r.imagens ?? []);
  }
  return rows;
});

// ============ DETALHE ============
export const obterMaterial = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("materiais_pdv")
      .select(
        "*, fornecedor:fornecedores(id,nome), categoria:categorias(id,nome), imagens:materiais_imagens(*), documentos:materiais_documentos(*)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Material não encontrado");
    row.imagens = await signPaths(supabase, "materiais", row.imagens ?? []);
    row.documentos = await signPaths(supabase, "materiais-documentos", row.documentos ?? []);

    // Produtos compatíveis
    const { data: compat } = await supabase
      .from("compatibilidades")
      .select("id, observacao, produto:produtos(id,nome,sku,codigo_jbl,imagens:produtos_imagens(storage_path,principal))")
      .eq("material_id", data.id);
    const produtosCompat = compat ?? [];
    for (const c of produtosCompat) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p: any = c.produto;
      if (p?.imagens?.length) {
        p.imagens = await signPaths(supabase, "produtos", p.imagens);
      }
    }

    // Histórico
    const { data: historico } = await supabase
      .from("historico")
      .select("id, acao, dados_depois, created_at")
      .eq("entidade_tipo", "material")
      .eq("entidade_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Comentários
    const { data: comentarios } = await supabase
      .from("comentarios")
      .select("id, corpo, created_at")
      .eq("entidade_tipo", "material")
      .eq("entidade_id", data.id)
      .order("created_at", { ascending: false })
      .limit(100);

    return {
      ...row,
      produtos_compativeis: produtosCompat,
      historico: historico ?? [],
      comentarios: comentarios ?? [],
    };
  });

// ============ CRUD ============
export const criarMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => materialInput.parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("materiais_pdv")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, row.id, "criado", { nome: data.nome });
    return row;
  });

export const atualizarMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), dados: materialInput }).parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("materiais_pdv").update(data.dados).eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.id, "atualizado", { status: data.dados.status });
    return { ok: true };
  });

export const excluirMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("materiais_pdv").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ IMAGENS ============
export const adicionarImagemMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        material_id: z.string().uuid(),
        storage_path: z.string().min(1),
        url_publica: z.string().optional().nullable(),
        legenda: z.string().max(300).optional().nullable(),
        tipo: z.enum(["galeria", "foto_real"]).default("galeria"),
        principal: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: existentes } = await supabase
      .from("materiais_imagens")
      .select("id")
      .eq("material_id", data.material_id);
    const ordem = existentes?.length ?? 0;
    const principal = data.principal || (data.tipo === "galeria" && ordem === 0);
    if (principal) {
      await supabase
        .from("materiais_imagens")
        .update({ principal: false })
        .eq("material_id", data.material_id);
    }
    const { error } = await supabase.from("materiais_imagens").insert({ ...data, ordem, principal });
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.material_id, "imagem_adicionada");
    return { ok: true };
  });

export const definirImagemPrincipalMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), material_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    await supabase
      .from("materiais_imagens")
      .update({ principal: false })
      .eq("material_id", data.material_id);
    const { error } = await supabase
      .from("materiais_imagens")
      .update({ principal: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerImagemMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid(), storage_path: z.string() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    await supabase.storage.from("materiais").remove([data.storage_path]);
    const { error } = await supabase.from("materiais_imagens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ DOCUMENTOS ============
export const adicionarDocumentoMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        material_id: z.string().uuid(),
        nome: z.string().min(1).max(200),
        descricao: z.string().max(1000).optional().nullable(),
        storage_path: z.string().min(1),
        mime_type: z.string().max(120).optional().nullable(),
        tamanho_bytes: z.number().optional().nullable(),
        categoria: z.string().max(64).optional().nullable(),
        versao: z.string().max(32).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("materiais_documentos").insert(data);
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.material_id, "documento_adicionado", { nome: data.nome });
    return { ok: true };
  });

export const removerDocumentoMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid(), storage_path: z.string() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    await supabase.storage.from("materiais-documentos").remove([data.storage_path]);
    const { error } = await supabase.from("materiais_documentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ COMENTÁRIOS ============
export const adicionarComentarioMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ material_id: z.string().uuid(), corpo: z.string().min(1).max(4000) }).parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("comentarios").insert({
      entidade_tipo: "material",
      entidade_id: data.material_id,
      corpo: data.corpo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
