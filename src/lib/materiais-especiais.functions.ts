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

const statusEnum = z.enum([
  "ideia",
  "em_desenvolvimento",
  "aguardando_aprovacao",
  "aprovado",
  "rejeitado",
  "homologado",
]);

const inputBase = z.object({
  nome: z.string().min(1).max(200),
  objetivo: z.string().max(2000).nullable().optional(),
  briefing: z.string().max(4000).nullable().optional(),
  fornecedor_sugerido: z.string().max(200).nullable().optional(),
  fornecedor_id: z.string().uuid().nullable().optional(),
  valor_estimado: z.number().nonnegative().nullable().optional(),
  status: statusEnum.default("ideia"),
  observacoes: z.string().max(4000).nullable().optional(),
  imagem_referencia_path: z.string().max(500).nullable().optional(),
  croqui_path: z.string().max(500).nullable().optional(),
});

async function assinar(supabase: ReturnType<typeof getClient>, paths: string[]) {
  const clean = paths.filter(Boolean);
  if (clean.length === 0) return new Map<string, string>();
  const { data } = await supabase.storage.from("materiais").createSignedUrls(clean, 60 * 60 * 24 * 7);
  const map = new Map<string, string>();
  for (const s of data ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  return map;
}

export const listarTodosMateriaisEspeciais = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getClient();
    const { data: rows, error } = await supabase
      .from("materiais_especiais" as never)
      .select("*, fornecedor:fornecedores(id, nome), lancamento:lancamentos(id, nome, codigo, status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<{
      imagem_referencia_path: string | null;
      croqui_path: string | null;
    } & Record<string, unknown>>;
    const paths: string[] = [];
    for (const r of list) {
      if (r.imagem_referencia_path) paths.push(r.imagem_referencia_path);
      if (r.croqui_path) paths.push(r.croqui_path);
    }
    const map = await assinar(supabase, paths);
    return list.map((r) => ({
      ...r,
      imagem_referencia_url: r.imagem_referencia_path ? map.get(r.imagem_referencia_path) ?? null : null,
      croqui_url: r.croqui_path ? map.get(r.croqui_path) ?? null : null,
    }));
  });

export const listarMateriaisEspeciais = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lancamento_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: rows, error } = await supabase
      .from("materiais_especiais" as never)
      .select("*, fornecedor:fornecedores(id, nome)")
      .eq("lancamento_id", data.lancamento_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<{
      imagem_referencia_path: string | null;
      croqui_path: string | null;
    } & Record<string, unknown>>;
    const paths: string[] = [];
    for (const r of list) {
      if (r.imagem_referencia_path) paths.push(r.imagem_referencia_path);
      if (r.croqui_path) paths.push(r.croqui_path);
    }
    const map = await assinar(supabase, paths);
    return list.map((r) => ({
      ...r,
      imagem_referencia_url: r.imagem_referencia_path ? map.get(r.imagem_referencia_path) ?? null : null,
      croqui_url: r.croqui_path ? map.get(r.croqui_path) ?? null : null,
    }));
  });

export const criarMaterialEspecial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    inputBase.extend({ lancamento_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: row, error } = await supabase
      .from("materiais_especiais" as never)
      .insert(data as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("historico").insert({
      entidade_tipo: "lancamento",
      entidade_id: data.lancamento_id,
      acao: "material_especial_criado",
      dados_depois: { nome: data.nome } as never,
    });
    return row;
  });

export const atualizarMaterialEspecial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: inputBase.partial(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase
      .from("materiais_especiais" as never)
      .update(data.patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirMaterialEspecial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("materiais_especiais" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Homologa: cria um material_pdv na Base Mestre e vincula
export const homologarMaterialEspecial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        codigo: z.string().min(1).max(64),
        tipo: z.string().max(100).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: esp, error: errGet } = await supabase
      .from("materiais_especiais" as never)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (errGet) throw new Error(errGet.message);
    if (!esp) throw new Error("Material especial não encontrado");
    const src = esp as unknown as {
      lancamento_id: string;
      nome: string;
      briefing: string | null;
      observacoes: string | null;
      fornecedor_id: string | null;
      imagem_referencia_path: string | null;
    };

    const { data: novo, error: errIns } = await supabase
      .from("materiais_pdv")
      .insert({
        codigo: data.codigo,
        nome: src.nome,
        tipo: data.tipo ?? null,
        status: "ativo",
        briefing: src.briefing ?? null,
        observacoes: src.observacoes ?? null,
        fornecedor_id: src.fornecedor_id ?? null,
      } as never)
      .select("id")
      .single();
    if (errIns) throw new Error(errIns.message);

    await supabase
      .from("materiais_especiais" as never)
      .update({ status: "homologado", homologado_material_id: novo.id } as never)
      .eq("id", data.id);

    await supabase.from("historico").insert({
      entidade_tipo: "lancamento",
      entidade_id: src.lancamento_id,
      acao: "material_especial_homologado",
      dados_depois: { nome: src.nome, codigo: data.codigo } as never,
    });

    return { ok: true, material_id: novo.id };
  });
