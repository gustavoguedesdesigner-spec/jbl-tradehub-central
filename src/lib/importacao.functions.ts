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

// ---------- Tipos ----------
export type TipoDetectado =
  | "imagem" | "video" | "pdf" | "powerpoint" | "excel" | "word"
  | "adobe" | "3d" | "zip" | "svg" | "desconhecido";

export type DestinoImport =
  | "produto_galeria" | "material_galeria" | "asset_generico"
  | "guideline" | "documento_produto" | "ignorar";

export interface AnaliseItem {
  nome_arquivo: string;
  pasta: string | null;
  caminho_original: string;
  mime: string | null;
  tamanho: number | null;
  tipo_detectado: TipoDetectado;
  produto_sugerido: string | null;
  material_sugerido: string | null;
  categoria_sugerida: string | null;
  familia_sugerida: string | null;
  destino: DestinoImport;
}

// ---------- Classificação (heurística) ----------
const EXT_MAP: Record<string, TipoDetectado> = {
  jpg: "imagem", jpeg: "imagem", png: "imagem", webp: "imagem", heic: "imagem",
  mp4: "video", mov: "video", webm: "video",
  pdf: "pdf",
  ppt: "powerpoint", pptx: "powerpoint",
  xls: "excel", xlsx: "excel", csv: "excel",
  doc: "word", docx: "word",
  ai: "adobe", eps: "adobe", psd: "adobe", indd: "adobe",
  obj: "3d", stl: "3d", fbx: "3d", glb: "3d", gltf: "3d",
  zip: "zip", rar: "zip", "7z": "zip",
  svg: "svg",
};

export function classificarArquivo(input: {
  nome_arquivo: string;
  caminho_original: string;
  mime?: string | null;
  tamanho?: number | null;
}): AnaliseItem {
  const nome = input.nome_arquivo;
  const ext = (nome.split(".").pop() || "").toLowerCase();
  const tipo: TipoDetectado = EXT_MAP[ext] ?? "desconhecido";
  const partesCaminho = input.caminho_original.split("/").filter(Boolean);
  const pasta = partesCaminho.slice(0, -1).join("/") || null;
  const pastaLower = (pasta || "").toLowerCase();
  const nomeLower = nome.toLowerCase();
  const contexto = `${pastaLower} ${nomeLower}`;

  // Produtos JBL conhecidos
  const produtosConhecidos = [
    "partybox 1000", "partybox 710", "partybox 330", "partybox 310", "partybox 110", "partybox encore",
    "xtreme 4", "xtreme 3", "xtreme 2",
    "charge 5", "charge 6", "flip 6", "flip 7", "flip essential",
    "clip 5", "clip 4", "go 4", "go 3",
    "boombox 3", "boombox 2",
    "tune 770nc", "tune 720bt", "tune 520bt",
    "live 770nc", "live 660nc",
    "quantum 910", "quantum 810", "quantum 610", "quantum 400", "quantum 200", "quantum 100",
    "bar 1300", "bar 1000", "bar 500", "bar 300",
  ];
  let produto_sugerido: string | null = null;
  for (const p of produtosConhecidos) {
    if (contexto.replace(/[_\-\s]+/g, " ").includes(p)) {
      produto_sugerido = p.replace(/\b\w/g, (c) => c.toUpperCase());
      break;
    }
  }

  // Categoria por família
  const categorias: Array<[RegExp, string, string]> = [
    [/party ?box|xtreme|charge|flip|clip|go|boombox/i, "Portable Audio", "PartyBox"],
    [/tune|live|reflect|endurance/i, "Headphones", "Lifestyle"],
    [/quantum/i, "Gaming", "Quantum"],
    [/\bbar\b|soundbar|cinema/i, "Home Audio", "Bar"],
  ];
  let categoria_sugerida: string | null = null;
  let familia_sugerida: string | null = null;
  for (const [re, cat, fam] of categorias) {
    if (re.test(contexto)) {
      categoria_sugerida = cat;
      familia_sugerida = fam;
      break;
    }
  }

  // Material PDV
  const materiaisPDV = ["display", "banner", "wobbler", "totem", "adesivo", "cartaz", "stopper", "endcap", "hero product", "island"];
  let material_sugerido: string | null = null;
  for (const m of materiaisPDV) {
    if (contexto.includes(m)) {
      material_sugerido = m.charAt(0).toUpperCase() + m.slice(1);
      break;
    }
  }

  // Destino
  let destino: DestinoImport = "asset_generico";
  if (/guideline|brand ?book|manual/i.test(contexto) && tipo === "pdf") destino = "guideline";
  else if (material_sugerido) destino = "material_galeria";
  else if (produto_sugerido && (tipo === "imagem" || tipo === "video")) destino = "produto_galeria";
  else if (produto_sugerido && (tipo === "pdf" || tipo === "word" || tipo === "excel")) destino = "documento_produto";
  else if (tipo === "desconhecido") destino = "ignorar";

  return {
    nome_arquivo: nome,
    pasta,
    caminho_original: input.caminho_original,
    mime: input.mime ?? null,
    tamanho: input.tamanho ?? null,
    tipo_detectado: tipo,
    produto_sugerido,
    material_sugerido,
    categoria_sugerida,
    familia_sugerida,
    destino,
  };
}

// ---------- Server fns ----------
const analiseSchema = z.object({
  nome_arquivo: z.string(),
  pasta: z.string().nullable(),
  caminho_original: z.string(),
  mime: z.string().nullable().optional(),
  tamanho: z.number().nullable().optional(),
  tipo_detectado: z.string(),
  produto_sugerido: z.string().nullable(),
  material_sugerido: z.string().nullable(),
  categoria_sugerida: z.string().nullable(),
  familia_sugerida: z.string().nullable(),
  destino: z.string(),
  storage_path: z.string().nullable().optional(),
});

export const criarImportBatch = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        nome: z.string().default("Importação"),
        origem: z.string().nullable().optional(),
        itens: z.array(analiseSchema),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const contadores = {
      total_arquivos: data.itens.length,
      total_imagens: 0, total_videos: 0, total_pdf: 0, total_powerpoint: 0,
      total_excel: 0, total_adobe: 0, total_3d: 0, total_desconhecidos: 0,
    };
    for (const it of data.itens) {
      switch (it.tipo_detectado) {
        case "imagem": contadores.total_imagens++; break;
        case "video": contadores.total_videos++; break;
        case "pdf": contadores.total_pdf++; break;
        case "powerpoint": contadores.total_powerpoint++; break;
        case "excel": contadores.total_excel++; break;
        case "adobe": contadores.total_adobe++; break;
        case "3d": contadores.total_3d++; break;
        case "desconhecido": contadores.total_desconhecidos++; break;
      }
    }
    const { data: batch, error } = await supabase
      .from("import_batches" as never)
      .insert({
        nome: data.nome,
        origem: data.origem ?? null,
        status: "analisado",
        ...contadores,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const batchId = (batch as { id: string }).id;

    const rows = data.itens.map((it) => ({
      batch_id: batchId,
      nome_arquivo: it.nome_arquivo,
      pasta: it.pasta,
      caminho_original: it.caminho_original,
      storage_path: it.storage_path ?? null,
      mime: it.mime ?? null,
      tamanho: it.tamanho ?? null,
      tipo_detectado: it.tipo_detectado,
      produto_sugerido: it.produto_sugerido,
      material_sugerido: it.material_sugerido,
      categoria_sugerida: it.categoria_sugerida,
      familia_sugerida: it.familia_sugerida,
      destino: it.destino,
      status: "pendente",
    }));
    if (rows.length) {
      const { error: e2 } = await supabase.from("import_items" as never).insert(rows as never);
      if (e2) throw new Error(e2.message);
    }
    return { batch_id: batchId };
  });

// helpers
function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function acharOuCriarProduto(
  supabase: ReturnType<typeof getClient>,
  nome: string,
  categoria_id: string | null,
  familia_id: string | null,
): Promise<{ id: string; criado: boolean }> {
  const { data: existente } = await supabase
    .from("produtos")
    .select("id")
    .ilike("nome", nome)
    .maybeSingle();
  if (existente) return { id: existente.id, criado: false };
  const { data, error } = await supabase
    .from("produtos")
    .insert({
      nome,
      slug: slugify(nome) || `produto-${Date.now()}`,
      categoria_id: categoria_id ?? undefined,
      familia_id: familia_id ?? undefined,
      status: "ativo",
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id, criado: true };
}

async function acharOuCriarMaterial(
  supabase: ReturnType<typeof getClient>,
  nome: string,
): Promise<{ id: string; criado: boolean }> {
  const { data: existente } = await supabase
    .from("materiais_pdv")
    .select("id")
    .ilike("nome", nome)
    .maybeSingle();
  if (existente) return { id: existente.id, criado: false };
  const { data, error } = await supabase
    .from("materiais_pdv")
    .insert({
      nome,
      slug: slugify(nome) || `material-${Date.now()}`,
      tipo: "display",
      status: "ativo",
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id, criado: true };
}

async function resolverIdCategoria(
  supabase: ReturnType<typeof getClient>,
  nome: string | null,
): Promise<string | null> {
  if (!nome) return null;
  const { data } = await supabase.from("categorias").select("id").ilike("nome", nome).maybeSingle();
  return data?.id ?? null;
}
async function resolverIdFamilia(
  supabase: ReturnType<typeof getClient>,
  nome: string | null,
): Promise<string | null> {
  if (!nome) return null;
  const { data } = await supabase.from("familias").select("id").ilike("nome", nome).maybeSingle();
  return data?.id ?? null;
}

export const executarImportacao = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ batch_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const t0 = Date.now();
    const supabase = getClient();
    const { data: itens, error } = await supabase
      .from("import_items" as never)
      .select("*")
      .eq("batch_id", data.batch_id)
      .eq("status", "pendente");
    if (error) throw new Error(error.message);

    let criados_produtos = 0, criados_materiais = 0, criados_assets = 0;
    let relacionamentos = 0, ignorados = 0, duplicados = 0;

    for (const raw of (itens ?? []) as Array<Record<string, unknown>>) {
      const it = raw as {
        id: string; nome_arquivo: string; storage_path: string | null; mime: string | null;
        tamanho: number | null; tipo_detectado: string; produto_sugerido: string | null;
        material_sugerido: string | null; categoria_sugerida: string | null;
        familia_sugerida: string | null; destino: string;
      };
      try {
        if (it.destino === "ignorar") {
          ignorados++;
          await supabase.from("import_items" as never).update({ status: "ignorado" } as never).eq("id", it.id);
          continue;
        }

        // 1) Criar Asset central
        const { data: assetRow, error: eAsset } = await supabase
          .from("assets" as never)
          .insert({
            nome: it.nome_arquivo,
            tipo: mapTipoAsset(it.tipo_detectado),
            formato: it.nome_arquivo.split(".").pop() ?? null,
            peso_bytes: it.tamanho ?? null,
            storage_path: it.storage_path ?? `imports/${data.batch_id}/${it.nome_arquivo}`,
            status: "ativo",
            tags: [it.produto_sugerido, it.material_sugerido, it.categoria_sugerida]
              .filter(Boolean),
          } as never)
          .select("id")
          .single();
        if (eAsset) throw new Error(eAsset.message);
        const assetId = (assetRow as { id: string }).id;
        criados_assets++;

        let produtoId: string | null = null;
        let materialId: string | null = null;

        const catId = await resolverIdCategoria(supabase, it.categoria_sugerida);
        const famId = await resolverIdFamilia(supabase, it.familia_sugerida);

        if (it.produto_sugerido) {
          const r = await acharOuCriarProduto(supabase, it.produto_sugerido, catId, famId);
          produtoId = r.id;
          if (r.criado) criados_produtos++; else duplicados++;
          await supabase.from("asset_vinculos" as never).upsert(
            { asset_id: assetId, entidade_tipo: "produto", entidade_id: produtoId } as never,
            { onConflict: "asset_id,entidade_tipo,entidade_id" },
          );
          relacionamentos++;
        }

        if (it.material_sugerido) {
          const r = await acharOuCriarMaterial(supabase, it.material_sugerido);
          materialId = r.id;
          if (r.criado) criados_materiais++; else duplicados++;
          await supabase.from("asset_vinculos" as never).upsert(
            { asset_id: assetId, entidade_tipo: "material", entidade_id: materialId } as never,
            { onConflict: "asset_id,entidade_tipo,entidade_id" },
          );
          relacionamentos++;
        }

        await supabase.from("import_items" as never).update({
          status: "importado",
          asset_id: assetId,
          produto_id: produtoId,
          material_id: materialId,
        } as never).eq("id", it.id);
      } catch (e) {
        await supabase.from("import_items" as never).update({
          status: "erro",
          erro: (e as Error).message,
        } as never).eq("id", it.id);
      }
    }

    await supabase.from("import_batches" as never).update({
      status: "concluido",
      criados_produtos, criados_materiais, criados_assets,
      relacionamentos, ignorados, duplicados,
      tempo_ms: Date.now() - t0,
    } as never).eq("id", data.batch_id);

    return { criados_produtos, criados_materiais, criados_assets, relacionamentos, ignorados, duplicados };
  });

function mapTipoAsset(t: string): string {
  switch (t) {
    case "imagem": return "imagem";
    case "video": return "video";
    case "pdf": return "pdf";
    case "powerpoint": return "powerpoint";
    case "excel": return "excel";
    case "word": return "word";
    case "adobe": return "ai";
    case "3d": return "stl";
    case "zip": return "zip";
    default: return "outro";
  }
}

export const listarImportBatches = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("import_batches" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const obterImportBatch = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ batch_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: batch } = await supabase.from("import_batches" as never).select("*").eq("id", data.batch_id).maybeSingle();
    const { data: itens } = await supabase.from("import_items" as never).select("*").eq("batch_id", data.batch_id).order("created_at");
    return { batch, itens: itens ?? [] };
  });

export const atualizarImportItem = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        produto_sugerido: z.string().nullable().optional(),
        material_sugerido: z.string().nullable().optional(),
        categoria_sugerida: z.string().nullable().optional(),
        familia_sugerida: z.string().nullable().optional(),
        destino: z.string().optional(),
        tipo_detectado: z.string().optional(),
      }),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("import_items" as never).update(data.patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reverterImportacao = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ batch_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { data: itens } = await supabase
      .from("import_items" as never)
      .select("asset_id")
      .eq("batch_id", data.batch_id);
    const assetIds = ((itens ?? []) as Array<{ asset_id: string | null }>)
      .map((i) => i.asset_id).filter((v): v is string => !!v);
    if (assetIds.length) {
      await supabase.from("asset_vinculos" as never).delete().in("asset_id", assetIds);
      await supabase.from("assets" as never).delete().in("id", assetIds);
    }
    await supabase.from("import_batches" as never).update({ status: "revertido" } as never).eq("id", data.batch_id);
    return { revertidos: assetIds.length };
  });
