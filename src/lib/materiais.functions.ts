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
      "id, codigo, nome, descricao, tipo, dimensoes, status, imagem_principal_url, updated_at, fornecedor:fornecedores(id,nome), categoria:categorias(id,nome), imagens:materiais_imagens(id,storage_path,principal,bucket,asset_id)",
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

export const duplicarMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: original, error: errGet } = await supabase
      .from("materiais_pdv")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (errGet) throw new Error(errGet.message);
    if (!original) throw new Error("Material não encontrado");

    const baseCod = original.codigo ?? "MAT";
    let novoCod = `${baseCod}-COPIA`;
    let n = 1;
    while (true) {
      const { data: existe } = await supabase
        .from("materiais_pdv")
        .select("id")
        .eq("codigo", novoCod)
        .maybeSingle();
      if (!existe) break;
      n += 1;
      novoCod = `${baseCod}-COPIA-${n}`;
    }

    const orig = original as Record<string, unknown>;
    delete orig.id;
    delete orig.created_at;
    delete orig.updated_at;

    const payload = {
      ...orig,
      codigo: novoCod,
      nome: `${original.nome} (cópia)`,
      status: "rascunho",
    };

    const { data: novo, error: errIns } = await supabase
      .from("materiais_pdv")
      .insert(payload as never)
      .select("id")
      .single();
    if (errIns) throw new Error(errIns.message);
    await registrarHistorico(supabase, novo.id, "duplicado", { origem_id: data.id });
    return novo;
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
        bucket: z.string().max(60).optional().nullable(),
        asset_id: z.string().uuid().optional().nullable(),
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
    const { data: row } = await supabase
      .from("materiais_imagens")
      .select("bucket, asset_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row?.asset_id) {
      await supabase.storage.from(row?.bucket || "materiais").remove([data.storage_path]);
    }
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

// ============ CATÁLOGO MERCHANDISING ============
export type CatalogoMaterial = {
  id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  status: string;
  dimensoes: string | null;
  imagem_url: string | null;
  fornecedor: { id: string; nome: string } | null;
  categoria: { id: string; nome: string } | null;
  produtos: Array<{ id: string; nome: string; linha: { id: string; nome: string } | null }>;
  linhas: Array<{ id: string; nome: string }>;
  campanhas: Array<{ id: string; nome: string }>;
};

export const listarCatalogoMerchandising = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("materiais_pdv")
    .select(
      "id, codigo, nome, descricao, tipo, dimensoes, status, imagem_principal_url, fornecedor:fornecedores(id,nome), categoria:categorias(id,nome), compat:compatibilidades(produto:produtos(id,nome,linha:linhas(id,nome))), usos:lancamentos_materiais(lancamento:lancamentos(id, campanha:campanhas(id,nome)))",
    )
    .order("nome", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  // sign principal images if they're storage paths
  const paths = rows
    .map((r) => r.imagem_principal_url)
    .filter((u): u is string => !!u && !u.startsWith("http"));
  const signedMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("materiais")
      .createSignedUrls(paths, 60 * 60 * 24);
    for (const s of signed ?? []) if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
  }

  const out: CatalogoMaterial[] = rows.map((r) => {
    const compat = (r.compat ?? []) as Array<{
      produto: { id: string; nome: string; linha: { id: string; nome: string } | null } | null;
    }>;
    const produtos = compat.map((c) => c.produto).filter((p): p is NonNullable<typeof p> => !!p);
    const linhasMap = new Map<string, { id: string; nome: string }>();
    for (const p of produtos) if (p.linha) linhasMap.set(p.linha.id, p.linha);

    const usos = (r.usos ?? []) as Array<{
      lancamento: { id: string; campanha: { id: string; nome: string } | null } | null;
    }>;
    const campMap = new Map<string, { id: string; nome: string }>();
    for (const u of usos) if (u.lancamento?.campanha) campMap.set(u.lancamento.campanha.id, u.lancamento.campanha);

    const rawUrl = r.imagem_principal_url;
    const imagem_url = rawUrl
      ? rawUrl.startsWith("http")
        ? rawUrl
        : signedMap.get(rawUrl) ?? null
      : null;

    return {
      id: r.id,
      codigo: r.codigo,
      nome: r.nome,
      descricao: r.descricao,
      tipo: r.tipo,
      status: r.status,
      dimensoes: r.dimensoes,
      imagem_url,
      fornecedor: r.fornecedor,
      categoria: r.categoria,
      produtos,
      linhas: [...linhasMap.values()],
      campanhas: [...campMap.values()],
    };
  });

  return out;
});
