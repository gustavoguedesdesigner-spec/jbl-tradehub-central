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

// ============================================================
// TIPOS
// ============================================================

export interface AnaliseIA {
  fonte: "url" | "texto" | "arquivo" | "imagens" | "chat";
  ok: boolean;
  erro?: string;
  bloqueado?: boolean;
  produto: {
    nome: string;
    marca: string;
    categoria_sugerida: string;
    familia_sugerida: string;
    linha_sugerida: string;
    posicionamento: "entrada" | "intermediario" | "premium" | "hero" | null;
    campanha_sugerida: string;
    features: string[];
    descricao_curta: string;
    descricao: string;
  };
  imagens: string[];
  imagem_principal: string | null;
  documentos_sugeridos: string[];
  materiais_recomendados: Array<{
    tipo: string;
    nome_sugerido: string;
    motivo: string;
    obrigatorio: boolean;
  }>;
  materiais_especiais_sugestoes: Array<{
    nome: string;
    descricao: string;
    objetivo: string;
  }>;
  url_origem?: string;
  raw_text?: string;
}

// ============================================================
// SCRAPE HTML
// ============================================================

function absolutize(base: string, src: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

function extractPageContent(html: string, baseUrl: string): {
  title: string | null;
  description: string | null;
  images: string[];
  bodyText: string;
} {
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1] ??
    null;
  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    null;

  const imgs: string[] = [];
  const ogImages = Array.from(
    html.matchAll(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi),
  ).map((m) => m[1]);
  imgs.push(...ogImages);
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) imgs.push(m[1]);
  for (const m of html.matchAll(/<img[^>]+data-src=["']([^"']+)["']/gi)) imgs.push(m[1]);

  const abs = imgs
    .map((u) => absolutize(baseUrl, u))
    .filter((u): u is string => !!u)
    .filter((u) => /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u));

  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const u of abs) {
    const k = u.split("?")[0];
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(u);
  }

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  return { title: ogTitle, description: ogDesc, images: dedup.slice(0, 30), bodyText };
}

// ============================================================
// LOVABLE AI
// ============================================================

async function chamarIA(prompt: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Você é um Copiloto de Trade Marketing da JBL. Analisa briefings, PDFs e páginas de produto para extrair dados estruturados. Responda SEMPRE com JSON válido, sem markdown.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`IA falhou (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function normalizarAnalise(
  ia: Record<string, unknown>,
  fallback: { title: string | null; description: string | null; url?: string },
): AnaliseIA["produto"] {
  const p = (ia.produto ?? ia) as Record<string, unknown>;
  const asStr = (v: unknown, def = "") =>
    typeof v === "string" ? v : v == null ? def : String(v);
  const posic = asStr(p.posicionamento).toLowerCase();
  const posValida: AnaliseIA["produto"]["posicionamento"] = [
    "entrada",
    "intermediario",
    "premium",
    "hero",
  ].includes(posic)
    ? (posic as never)
    : null;

  return {
    nome: asStr(p.nome, fallback.title ?? "Novo Produto"),
    marca: asStr(p.marca, "JBL"),
    categoria_sugerida: asStr(p.categoria_sugerida ?? p.categoria),
    familia_sugerida: asStr(p.familia_sugerida ?? p.familia),
    linha_sugerida: asStr(p.linha_sugerida ?? p.linha),
    posicionamento: posValida,
    campanha_sugerida: asStr(p.campanha_sugerida ?? ia.campanha ?? ""),
    features: Array.isArray(p.features)
      ? p.features.map(String).slice(0, 12)
      : [],
    descricao_curta: asStr(p.descricao_curta, fallback.description ?? "").slice(0, 500),
    descricao: asStr(p.descricao, fallback.description ?? "").slice(0, 4000),
  };
}

function normalizarMateriais(ia: Record<string, unknown>): AnaliseIA["materiais_recomendados"] {
  const arr = (ia.materiais_recomendados ?? ia.materiais ?? []) as unknown[];
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .slice(0, 12)
    .map((m) => ({
      tipo: String(m.tipo ?? m.categoria ?? "Material"),
      nome_sugerido: String(m.nome_sugerido ?? m.nome ?? m.tipo ?? "Material"),
      motivo: String(m.motivo ?? m.justificativa ?? ""),
      obrigatorio: Boolean(m.obrigatorio ?? m.essencial ?? false),
    }));
}

function normalizarEspeciais(ia: Record<string, unknown>): AnaliseIA["materiais_especiais_sugestoes"] {
  const arr = (ia.materiais_especiais_sugestoes ?? ia.especiais ?? []) as unknown[];
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .slice(0, 6)
    .map((m) => ({
      nome: String(m.nome ?? "Material especial"),
      descricao: String(m.descricao ?? ""),
      objetivo: String(m.objetivo ?? ""),
    }));
}

// ============================================================
// SERVER FN: ANALISAR
// ============================================================

const analisarInput = z.object({
  fonte: z.enum(["url", "texto", "arquivo", "imagens", "chat"]),
  url: z.string().url().optional(),
  texto: z.string().max(20_000).optional(),
  imagens_urls: z.array(z.string()).max(30).optional(),
  objetivo_especial: z.string().max(500).optional(),
});

export const analisarBriefingIA = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => analisarInput.parse(data))
  .handler(async ({ data }): Promise<AnaliseIA> => {
    let ogTitle: string | null = null;
    let ogDesc: string | null = null;
    let imagens: string[] = data.imagens_urls ?? [];
    let bodyText = data.texto ?? "";
    let bloqueado = false;

    if (data.fonte === "url" && data.url) {
      try {
        const res = await fetch(data.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!res.ok) {
          if (res.status === 403 || res.status === 429) bloqueado = true;
          return {
            fonte: data.fonte,
            ok: false,
            bloqueado,
            erro: `HTTP ${res.status}`,
            produto: {
              nome: "",
              marca: "JBL",
              categoria_sugerida: "",
              familia_sugerida: "",
              linha_sugerida: "",
              posicionamento: null,
              campanha_sugerida: "",
              features: [],
              descricao_curta: "",
              descricao: "",
            },
            imagens: [],
            imagem_principal: null,
            documentos_sugeridos: [],
            materiais_recomendados: [],
            materiais_especiais_sugestoes: [],
            url_origem: data.url,
          };
        }
        const html = await res.text();
        const parsed = extractPageContent(html, data.url);
        ogTitle = parsed.title;
        ogDesc = parsed.description;
        imagens = parsed.images;
        bodyText = parsed.bodyText;
      } catch (e) {
        return {
          fonte: data.fonte,
          ok: false,
          erro: e instanceof Error ? e.message : "Erro ao acessar URL",
          bloqueado: true,
          produto: {
            nome: "",
            marca: "JBL",
            categoria_sugerida: "",
            familia_sugerida: "",
            linha_sugerida: "",
            posicionamento: null,
            campanha_sugerida: "",
            features: [],
            descricao_curta: "",
            descricao: "",
          },
          imagens: [],
          imagem_principal: null,
          documentos_sugeridos: [],
          materiais_recomendados: [],
          materiais_especiais_sugestoes: [],
          url_origem: data.url,
        };
      }
    }

    const contextoBase = [
      ogTitle ? `Título da página: ${ogTitle}` : null,
      ogDesc ? `Descrição: ${ogDesc}` : null,
      bodyText ? `Conteúdo:\n${bodyText}` : null,
      data.objetivo_especial ? `Objetivo especial: ${data.objetivo_especial}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const prompt = `Analise o material abaixo (briefing, página de produto ou apresentação de um produto de áudio da JBL/Harman) e retorne um JSON com o seguinte formato exato:

{
  "produto": {
    "nome": "string",
    "marca": "JBL | Harman Kardon | AKG",
    "categoria_sugerida": "Portátil | Fone de Ouvido | Gaming | Home | Party | Soundbar | Outros",
    "familia_sugerida": "Flip | Charge | PartyBox | Tune | Live | Quantum | Bar | ...",
    "linha_sugerida": "string",
    "posicionamento": "entrada | intermediario | premium | hero",
    "campanha_sugerida": "string (ex: Verão 2026, Black Friday, Volta às Aulas)",
    "features": ["até 8 features de destaque, curtas"],
    "descricao_curta": "1 frase de até 200 caracteres",
    "descricao": "3-6 frases descrevendo o produto"
  },
  "materiais_recomendados": [
    { "tipo": "Display | Wobbler | Testeira | Totem | Banner | Adesivo | Cubo | Faixa | Mockup",
      "nome_sugerido": "string",
      "motivo": "curta justificativa",
      "obrigatorio": true|false }
  ],
  "materiais_especiais_sugestoes": [
    { "nome": "Display Iluminado | Mockup Gigante | Halo | QR Experience | Painel Interativo | Produto Gigante | Display Giratório | Totem Digital",
      "descricao": "curta",
      "objetivo": "chamar atenção | demonstrar feature | criar experiência | gerar desejo | reforçar design" }
  ]
}

Sempre responda com pelo menos 4 materiais_recomendados (marcando os essenciais como obrigatorio=true) e 2 sugestões de materiais especiais.

Conteúdo:
${contextoBase || "(sem conteúdo textual — infira a partir das imagens/URL)"}
`;

    let ia: Record<string, unknown> = {};
    try {
      ia = await chamarIA(prompt);
    } catch (e) {
      return {
        fonte: data.fonte,
        ok: false,
        erro: e instanceof Error ? e.message : "Erro IA",
        produto: {
          nome: ogTitle ?? "Novo Produto",
          marca: "JBL",
          categoria_sugerida: "",
          familia_sugerida: "",
          linha_sugerida: "",
          posicionamento: null,
          campanha_sugerida: "",
          features: [],
          descricao_curta: ogDesc ?? "",
          descricao: ogDesc ?? "",
        },
        imagens,
        imagem_principal: imagens[0] ?? null,
        documentos_sugeridos: [],
        materiais_recomendados: [],
        materiais_especiais_sugestoes: [],
        url_origem: data.url,
      };
    }

    return {
      fonte: data.fonte,
      ok: true,
      produto: normalizarAnalise(ia, { title: ogTitle, description: ogDesc, url: data.url }),
      imagens,
      imagem_principal: imagens[0] ?? null,
      documentos_sugeridos: [],
      materiais_recomendados: normalizarMateriais(ia),
      materiais_especiais_sugestoes: normalizarEspeciais(ia),
      url_origem: data.url,
      raw_text: bodyText.slice(0, 500),
    };
  });

// ============================================================
// SERVER FN: CRIAR PROJETO
// ============================================================

const criarInput = z.object({
  produto: z.object({
    sku: z.string().min(1).max(64),
    nome: z.string().min(1).max(200),
    marca: z.string().max(80).optional().nullable(),
    descricao_curta: z.string().max(500).optional().nullable(),
    descricao: z.string().max(8000).optional().nullable(),
    features: z.array(z.string()).default([]),
    categoria_id: z.string().uuid().optional().nullable(),
    familia_id: z.string().uuid().optional().nullable(),
    linha_id: z.string().uuid().optional().nullable(),
    posicionamento: z.enum(["entrada", "intermediario", "premium", "hero"]).optional().nullable(),
    url_origem: z.string().url().optional().nullable(),
    status: z.enum(["ativo", "lancamento", "em_desenvolvimento"]).default("lancamento"),
  }),
  imagens_urls: z.array(z.string().url()).default([]),
  criar_lancamento: z.boolean().default(true),
  lancamento: z
    .object({
      nome: z.string().min(1).max(200),
      campanha_id: z.string().uuid().optional().nullable(),
      responsavel_id: z.string().uuid().optional().nullable(),
      data_prevista: z.string().optional().nullable(),
      status: z.enum(["planejado", "em_andamento", "lancado", "cancelado"]).default("planejado"),
    })
    .optional(),
  materiais_ids: z.array(z.string().uuid()).default([]),
  materiais_especiais: z
    .array(z.object({ nome: z.string(), descricao: z.string().optional(), objetivo: z.string().optional() }))
    .default([]),
});

function extExtractor(url: string): string {
  const clean = url.split("?")[0];
  const m = clean.match(/\.(jpe?g|png|webp|avif)$/i);
  return m ? m[1].toLowerCase() : "jpg";
}

export const criarProjetoInteligente = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => criarInput.parse(data))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const log = {
      produto_id: "",
      produto_criado: false,
      produto_atualizado: false,
      imagens_importadas: 0,
      imagens_erros: 0,
      lancamento_id: null as string | null,
      materiais_vinculados: 0,
      checklist_itens: 0,
      especiais_criados: 0,
    };

    // 1. Produto (upsert por url_origem)
    let produtoId: string;
    if (data.produto.url_origem) {
      const { data: existente } = await supabase
        .from("produtos")
        .select("id")
        .eq("url_origem", data.produto.url_origem)
        .maybeSingle();
      if (existente) {
        produtoId = existente.id;
        await supabase
          .from("produtos")
          .update({
            nome: data.produto.nome,
            marca: data.produto.marca ?? null,
            descricao_curta: data.produto.descricao_curta ?? null,
            descricao: data.produto.descricao ?? null,
            features: data.produto.features,
            categoria_id: data.produto.categoria_id ?? null,
            familia_id: data.produto.familia_id ?? null,
            linha_id: data.produto.linha_id ?? null,
            posicionamento: data.produto.posicionamento ?? null,
            status: data.produto.status,
          })
          .eq("id", produtoId);
        log.produto_atualizado = true;
      } else {
        const { data: novo, error } = await supabase
          .from("produtos")
          .insert({
            sku: data.produto.sku,
            nome: data.produto.nome,
            marca: data.produto.marca ?? null,
            descricao_curta: data.produto.descricao_curta ?? null,
            descricao: data.produto.descricao ?? null,
            features: data.produto.features,
            categoria_id: data.produto.categoria_id ?? null,
            familia_id: data.produto.familia_id ?? null,
            linha_id: data.produto.linha_id ?? null,
            posicionamento: data.produto.posicionamento ?? null,
            url_origem: data.produto.url_origem,
            status: data.produto.status,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        produtoId = novo.id;
        log.produto_criado = true;
      }
    } else {
      const { data: novo, error } = await supabase
        .from("produtos")
        .insert({
          sku: data.produto.sku,
          nome: data.produto.nome,
          marca: data.produto.marca ?? null,
          descricao_curta: data.produto.descricao_curta ?? null,
          descricao: data.produto.descricao ?? null,
          features: data.produto.features,
          categoria_id: data.produto.categoria_id ?? null,
          familia_id: data.produto.familia_id ?? null,
          linha_id: data.produto.linha_id ?? null,
          posicionamento: data.produto.posicionamento ?? null,
          status: data.produto.status,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      produtoId = novo.id;
      log.produto_criado = true;
    }
    log.produto_id = produtoId;

    // 2. Imagens
    const { data: existentes } = await supabase
      .from("produtos_imagens")
      .select("url_origem, ordem, principal")
      .eq("produto_id", produtoId);
    const jaImp = new Set((existentes ?? []).map((i) => i.url_origem).filter(Boolean) as string[]);
    let ordem = (existentes ?? []).reduce((m, i) => Math.max(m, i.ordem ?? 0), -1);
    let temPrincipal = (existentes ?? []).some((i) => i.principal);

    for (const url of data.imagens_urls) {
      if (jaImp.has(url)) continue;
      try {
        const resp = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; JBLTradeHub/1.0)",
            Referer: data.produto.url_origem ?? url,
          },
        });
        if (!resp.ok) {
          log.imagens_erros++;
          continue;
        }
        const ct = resp.headers.get("content-type") ?? undefined;
        const buf = new Uint8Array(await resp.arrayBuffer());
        const ext = extExtractor(url);
        const path = `${produtoId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("produtos")
          .upload(path, buf, { contentType: ct ?? `image/${ext}`, upsert: false });
        if (upErr) {
          log.imagens_erros++;
          continue;
        }
        ordem++;
        const principal = !temPrincipal;
        if (principal) temPrincipal = true;
        await supabase.from("produtos_imagens").insert({
          produto_id: produtoId,
          storage_path: path,
          url_publica: path,
          url_origem: url,
          ordem,
          principal,
        });
        log.imagens_importadas++;
      } catch {
        log.imagens_erros++;
      }
    }

    // 3. Lançamento
    if (data.criar_lancamento && data.lancamento) {
      const { data: lanc, error } = await supabase
        .from("lancamentos")
        .insert({
          nome: data.lancamento.nome,
          campanha_id: data.lancamento.campanha_id ?? null,
          responsavel_id: data.lancamento.responsavel_id ?? null,
          data_prevista: data.lancamento.data_prevista ?? null,
          status: data.lancamento.status,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      log.lancamento_id = lanc.id;

      await supabase.from("lancamentos_produtos").insert({ lancamento_id: lanc.id, produto_id: produtoId });

      // materiais vinculados
      for (const mid of data.materiais_ids) {
        const { error: mErr } = await supabase.from("lancamentos_materiais").insert({
          lancamento_id: lanc.id,
          material_id: mid,
          origem: "decision_engine",
          acao: "usar_existente",
        });
        if (!mErr) log.materiais_vinculados++;
      }

      // checklist inicial
      const checklist = [
        { titulo: "Aprovar briefing", categoria: "briefing", ordem: 1 },
        { titulo: "Validar imagens hero e galeria", categoria: "assets", ordem: 2 },
        { titulo: "Confirmar materiais obrigatórios", categoria: "materiais", ordem: 3 },
        { titulo: "Definir data de PDV", categoria: "cronograma", ordem: 4 },
        { titulo: "Alinhar campanha e comunicação", categoria: "campanha", ordem: 5 },
      ];
      const { error: chkErr } = await supabase.from("lancamentos_checklist").insert(
        checklist.map((c) => ({ ...c, lancamento_id: lanc.id })),
      );
      if (!chkErr) log.checklist_itens = checklist.length;

      // Materiais especiais → registra como itens da lista de materiais especiais (se existir tabela)
      if (data.materiais_especiais.length > 0) {
        for (const esp of data.materiais_especiais) {
          const { error: esErr } = await supabase.from("materiais_especiais").insert({
            lancamento_id: lanc.id,
            nome: esp.nome,
            descricao: esp.descricao ?? null,
            objetivo: esp.objetivo ?? null,
            status: "sugerido",
          } as never);
          if (!esErr) log.especiais_criados++;
        }
      }

      await supabase.from("historico").insert({
        entidade_tipo: "lancamento",
        entidade_id: lanc.id,
        acao: "criado_via_ia",
        dados_depois: { origem: "projeto_inteligente" } as never,
      });
    }

    await supabase.from("historico").insert({
      entidade_tipo: "produto",
      entidade_id: produtoId,
      acao: log.produto_criado ? "criado_via_ia" : "atualizado_via_ia",
      dados_depois: { origem: "projeto_inteligente" } as never,
    });

    return log;
  });
