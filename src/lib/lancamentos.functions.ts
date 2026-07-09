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
    const map = new Map<string, string>();
    if (paths.size > 0) {
      const { data: signed } = await supabase.storage
        .from("produtos")
        .createSignedUrls([...paths], 60 * 60 * 24 * 7);
      for (const s of signed ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
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

    // materiais vinculados
    const { data: materiais } = await supabase
      .from("lancamentos_materiais")
      .select("id, quantidade, observacao, categoria, acao, status, prazo, briefing, origem, updated_at, responsavel:profiles(id,nome,email,avatar_url), fornecedor:fornecedores(id,nome), material:materiais_pdv(id, codigo, nome, tipo, status, imagem_principal_url, fornecedor:fornecedores(id,nome))" as never)
      .eq("lancamento_id", data.id)
      .order("created_at", { ascending: true });

    // checklist
    const { data: checklist } = await (supabase as never as { from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => { order: (o: string, opts: unknown) => Promise<{ data: unknown[] | null }> } } } })
      .from("lancamentos_checklist")
      .select("*")
      .eq("lancamento_id", data.id)
      .order("ordem", { ascending: true });

    // briefings
    const { data: briefings } = await supabase
      .from("briefings")
      .select("id, titulo, objetivo, publico_alvo, mensagem_chave, status, updated_at")
      .eq("lancamento_id", data.id)
      .order("updated_at", { ascending: false });

    // arquivos vinculados
    const { data: arquivosVinc } = await supabase
      .from("arquivos_vinculos")
      .select("id, arquivo:arquivos(id, nome, storage_path, mime_type, tamanho_bytes, descricao, created_at)")
      .eq("entidade_tipo", "lancamento")
      .eq("entidade_id", data.id);

    // comentários
    const { data: comentarios } = await supabase
      .from("comentarios")
      .select("id, corpo, created_at, autor:profiles(id, nome, email, avatar_url)")
      .eq("entidade_tipo", "lancamento")
      .eq("entidade_id", data.id)
      .order("created_at", { ascending: false });

    return {
      ...row,
      historico: historico ?? [],
      materiais: materiais ?? [],
      checklist: (checklist ?? []) as Array<{ id: string; titulo: string; feito: boolean; ordem: number; categoria: string }>,
      briefings: briefings ?? [],
      arquivos: arquivosVinc ?? [],
      comentarios: comentarios ?? [],
    };
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

// ============ ETAPAS / PDV READY ============
const etapaStatus = z.enum(["pendente", "em_andamento", "concluido", "bloqueado"]);

export const atualizarEtapas = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        pdv_ready: z.boolean().optional(),
        producao_status: etapaStatus.optional(),
        aprovacao_status: etapaStatus.optional(),
        implantacao_status: etapaStatus.optional(),
        producao_nota: z.string().max(2000).optional().nullable(),
        aprovacao_nota: z.string().max(2000).optional().nullable(),
        implantacao_nota: z.string().max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { id, ...patch } = data;
    const { error } = await supabase.from("lancamentos").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, id, "etapa_atualizada", patch as Record<string, unknown>);
    return { ok: true };
  });

// ============ CHECKLIST ============
export const adicionarChecklistItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        lancamento_id: z.string().uuid(),
        titulo: z.string().min(1).max(300),
        categoria: z.string().max(60).default("geral"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: existentes } = await (supabase as never as { from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => Promise<{ data: unknown[] | null }> } } })
      .from("lancamentos_checklist")
      .select("id")
      .eq("lancamento_id", data.lancamento_id);
    const ordem = (existentes ?? []).length;
    const { error } = await (supabase as never as { from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string } | null }> } })
      .from("lancamentos_checklist")
      .insert({ ...data, ordem });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const alternarChecklistItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), feito: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await (supabase as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from("lancamentos_checklist")
      .update({ feito: data.feito })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerChecklistItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await (supabase as never as { from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from("lancamentos_checklist")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ MATERIAIS DO LANÇAMENTO ============
const categoriaMaterial = z.enum(["existente", "obrigatorio", "especial"]);

export const vincularMaterial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        lancamento_id: z.string().uuid(),
        material_id: z.string().uuid(),
        categoria: categoriaMaterial.default("existente"),
        quantidade: z.number().int().min(1).default(1),
        observacao: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("lancamentos_materiais").insert(data as never);
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.lancamento_id, "material_vinculado", { categoria: data.categoria });
    return { ok: true };
  });

export const desvincularMaterial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row } = await supabase
      .from("lancamentos_materiais")
      .select("lancamento_id")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabase.from("lancamentos_materiais").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.lancamento_id) await registrarHistorico(supabase, row.lancamento_id, "material_desvinculado");
    return { ok: true };
  });

export const listarMateriaisDisponiveis = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("materiais_pdv")
    .select("id, codigo, nome, tipo, status, imagem_principal_url")
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ============ COMENTÁRIOS ============
export const adicionarComentario = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ lancamento_id: z.string().uuid(), corpo: z.string().min(1).max(4000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("comentarios").insert({
      entidade_tipo: "lancamento",
      entidade_id: data.lancamento_id,
      corpo: data.corpo,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ BRIEFINGS ============
export const criarBriefingRapido = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        lancamento_id: z.string().uuid(),
        titulo: z.string().min(1).max(200),
        objetivo: z.string().max(2000).optional().nullable(),
        publico_alvo: z.string().max(1000).optional().nullable(),
        mensagem_chave: z.string().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("briefings").insert({
      lancamento_id: data.lancamento_id,
      titulo: data.titulo,
      objetivo: data.objetivo ?? null,
      publico_alvo: data.publico_alvo ?? null,
      mensagem_chave: data.mensagem_chave ?? null,
      conteudo: {},
      status: "rascunho",
    } as never);
    if (error) throw new Error(error.message);
    await registrarHistorico(supabase, data.lancamento_id, "briefing_criado", { titulo: data.titulo });
    return { ok: true };
  });

// ============ MATERIAIS OBRIGATÓRIOS (workflow) ============
const acaoMaterial = z.enum(["produzir", "atualizar", "nao_utilizar", "ja_existente"]);
const statusMaterial = z.enum(["pendente", "em_producao", "em_aprovacao", "aprovado", "entregue", "bloqueado"]);

type Row = { material_id: string };

export const carregarMateriaisObrigatorios = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ lancamento_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();

    // produto do lançamento
    const { data: produtos } = await supabase
      .from("lancamentos_produtos")
      .select("produto_id")
      .eq("lancamento_id", data.lancamento_id);
    const produtoIds = (produtos ?? []).map((p) => p.produto_id).filter(Boolean) as string[];
    if (produtoIds.length === 0) return { criados: 0, ja_existentes: 0, total_homologados: 0 };

    // materiais compatíveis
    const { data: compat } = await supabase
      .from("compatibilidades")
      .select("material_id, material:materiais_pdv(id, nome, status)")
      .in("produto_id", produtoIds);
    const homologados = (compat ?? []).filter(
      (c) => (c as unknown as { material: { status: string } | null }).material?.status === "ativo",
    );
    if (homologados.length === 0) return { criados: 0, ja_existentes: 0, total_homologados: 0 };

    // materiais já vinculados como obrigatórios
    const { data: existentes } = await supabase
      .from("lancamentos_materiais")
      .select("material_id")
      .eq("lancamento_id", data.lancamento_id)
      .eq("categoria", "obrigatorio");
    const jaExistemSet = new Set((existentes ?? []).map((r) => (r as Row).material_id));

    const paraInserir = homologados
      .map((c) => (c as unknown as { material_id: string; material: { nome: string } | null }))
      .filter((c) => !jaExistemSet.has(c.material_id))
      .map((c) => ({
        lancamento_id: data.lancamento_id,
        material_id: c.material_id,
        categoria: "obrigatorio",
        origem: "auto",
        acao: "produzir",
        status: "pendente",
        quantidade: 1,
      }));

    if (paraInserir.length > 0) {
      const { error } = await supabase.from("lancamentos_materiais").insert(paraInserir as never);
      if (error) throw new Error(error.message);
    }

    // checklist automático — 1 item por material homologado
    const { data: cklExist } = await (supabase as never as { from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ data: unknown[] | null }> } } } })
      .from("lancamentos_checklist")
      .select("titulo")
      .eq("lancamento_id", data.lancamento_id)
      .eq("categoria", "materiais_obrigatorios");
    const titulosExistentes = new Set(((cklExist ?? []) as Array<{ titulo: string }>).map((c) => c.titulo));

    const cklNovos = homologados
      .map((c) => (c as unknown as { material: { nome: string } | null }).material?.nome)
      .filter((n): n is string => !!n)
      .filter((n) => !titulosExistentes.has(`Homologar entrega: ${n}`))
      .map((n, idx) => ({
        lancamento_id: data.lancamento_id,
        titulo: `Homologar entrega: ${n}`,
        categoria: "materiais_obrigatorios",
        feito: false,
        ordem: idx,
      }));
    if (cklNovos.length > 0) {
      await (supabase as never as { from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> } })
        .from("lancamentos_checklist")
        .insert(cklNovos);
    }

    await registrarHistorico(supabase, data.lancamento_id, "materiais_obrigatorios_carregados", {
      criados: paraInserir.length,
      total_homologados: homologados.length,
    });

    return {
      criados: paraInserir.length,
      ja_existentes: jaExistemSet.size,
      total_homologados: homologados.length,
    };
  });

export const atualizarMaterialLancamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z
          .object({
            acao: acaoMaterial.optional(),
            status: statusMaterial.optional(),
            responsavel_id: z.string().uuid().nullable().optional(),
            fornecedor_id: z.string().uuid().nullable().optional(),
            prazo: z.string().nullable().optional(),
            briefing: z.string().max(4000).nullable().optional(),
            observacao: z.string().max(1000).nullable().optional(),
            quantidade: z.number().int().min(1).optional(),
          })
          .refine((v) => Object.keys(v).length > 0, "Nada para atualizar"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase
      .from("lancamentos_materiais")
      .update(data.patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarFornecedoresBasico = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase.from("fornecedores").select("id, nome").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});
