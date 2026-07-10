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

/**
 * BIBLIOTECA DE MÍDIA — helpers centrais.
 *
 * Todo novo upload de qualquer módulo (produtos, materiais, campanhas, projetos)
 * deve chamar `registrarAssetVinculado` DEPOIS de subir o arquivo para o bucket
 * `assets`. O helper cria o registro em `assets` + o vínculo N:N em `asset_vinculos`
 * e devolve o ID do asset, que deve ser gravado nas tabelas legadas (coluna asset_id).
 */

const entidadeEnum = z.enum([
  "produto",
  "material",
  "lancamento",
  "campanha",
  "guideline",
  "categoria",
  "familia",
  "fornecedor",
]);

const registrarInput = z.object({
  nome: z.string().min(1).max(300),
  storage_path: z.string().min(1),
  tipo: z.string().max(60).default("outro"),
  mime_type: z.string().max(120).optional().nullable(),
  peso_bytes: z.number().int().nonnegative().optional().nullable(),
  formato: z.string().max(40).optional().nullable(),
  entidade_tipo: entidadeEnum,
  entidade_id: z.string().uuid(),
  papel: z.string().max(120).optional().nullable(),
});

export const registrarAssetVinculado = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => registrarInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = getClient();

    const { data: asset, error: eAsset } = await supabase
      .from("assets" as never)
      .insert({
        nome: data.nome,
        storage_path: data.storage_path,
        tipo: data.tipo,
        formato: data.formato ?? data.mime_type ?? null,
        peso_bytes: data.peso_bytes ?? null,
        status: "ativo",
      } as never)
      .select("id")
      .single();
    if (eAsset) throw new Error(eAsset.message);

    const assetId = (asset as { id: string }).id;

    const { error: eVinc } = await supabase.from("asset_vinculos" as never).upsert(
      {
        asset_id: assetId,
        entidade_tipo: data.entidade_tipo,
        entidade_id: data.entidade_id,
        papel: data.papel ?? null,
      } as never,
      { onConflict: "asset_id,entidade_tipo,entidade_id" },
    );
    if (eVinc) throw new Error(eVinc.message);

    return { asset_id: assetId };
  });

// -------- AUDITORIA --------
export const obterAuditoriaLegado = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data: resumo, error } = await supabase
    .from("biblioteca_auditoria_legado" as never)
    .select("*");
  if (error) throw new Error(error.message);

  const [semVinculo, duplicidades, totalAssets] = await Promise.all([
    supabase
      .from("assets" as never)
      .select("id", { count: "exact", head: true })
      .not(
        "id",
        "in",
        `(select asset_id from public.asset_vinculos)`,
      ),
    // possíveis duplicidades por nome+peso
    supabase.rpc("bib_duplicidades" as never).then(
      (r) => ({ count: (r.data as { total: number }[] | null)?.[0]?.total ?? 0, error: r.error }),
      () => ({ count: 0, error: null }),
    ),
    supabase.from("assets" as never).select("id", { count: "exact", head: true }),
  ]);

  return {
    resumo: (resumo ?? []) as Array<{
      bucket_origem: string;
      tipo: string;
      legado: number;
      migrado: number;
      total: number;
    }>,
    assets_total: totalAssets.count ?? 0,
    assets_sem_vinculo: semVinculo.count ?? 0,
    duplicidades_potenciais: (duplicidades as { count: number }).count ?? 0,
  };
});
