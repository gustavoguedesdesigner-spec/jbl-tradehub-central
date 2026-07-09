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

// ---------- Preview (scrape) ----------

export interface JblPreview {
  url: string;
  ok: boolean;
  erro?: string;
  nome?: string;
  imagem_principal?: string;
  galeria: string[];
  bloqueado?: boolean;
}

function absolutize(base: string, src: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

function extractImagesFromHtml(html: string, baseUrl: string): { title: string | null; principal: string | null; gallery: string[] } {
  // og:title / title
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]
    ?? null;

  // og:image
  const ogImages = Array.from(html.matchAll(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi))
    .map((m) => m[1]);

  // JSON-LD Product image field
  const jsonLdImages: string[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const collect = (obj: unknown) => {
        if (!obj || typeof obj !== "object") return;
        const o = obj as Record<string, unknown>;
        if (o.image) {
          const imgs = Array.isArray(o.image) ? o.image : [o.image];
          for (const i of imgs) if (typeof i === "string") jsonLdImages.push(i);
        }
        for (const v of Object.values(o)) if (v && typeof v === "object") collect(v);
      };
      if (Array.isArray(parsed)) parsed.forEach(collect); else collect(parsed);
    } catch { /* ignore */ }
  }

  // All <img src> matching product-image CDNs
  const imgSrcs: string[] = [];
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) imgSrcs.push(m[1]);
  for (const m of html.matchAll(/<img[^>]+data-src=["']([^"']+)["']/gi)) imgSrcs.push(m[1]);
  // srcset
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    const first = m[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (first) imgSrcs.push(first);
  }

  const all = [...ogImages, ...jsonLdImages, ...imgSrcs]
    .map((u) => absolutize(baseUrl, u))
    .filter((u): u is string => !!u)
    // Only images
    .filter((u) => /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) || /image/i.test(u))
    // JBL-hosted (product / cdn media)
    .filter((u) => /jbl\.com|harmanaudio|cdn\.shopify|scene7|contentstack/i.test(u));

  // Deduplicate keeping first order, strip query if it's tracking
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const u of all) {
    const key = u.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(u);
  }

  const principal = ogImages[0] ? absolutize(baseUrl, ogImages[0]) : dedup[0] ?? null;
  const gallery = dedup.filter((u) => u !== principal);

  return {
    title: ogTitle ? ogTitle.replace(/\s*\|\s*JBL.*$/i, "").trim() : null,
    principal,
    gallery,
  };
}

export const previewJblUrls = createServerFn({ method: "POST" })
  .inputValidator((data: { urls: string[] }) => z.object({ urls: z.array(z.string().url()).min(1).max(20) }).parse(data))
  .handler(async ({ data }): Promise<JblPreview[]> => {
    const results: JblPreview[] = [];
    for (const url of data.urls) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          },
          redirect: "follow",
        });
        if (!res.ok) {
          results.push({ url, ok: false, galeria: [], erro: `HTTP ${res.status}`, bloqueado: res.status === 403 || res.status === 401 || res.status === 429 });
          continue;
        }
        const html = await res.text();
        const { title, principal, gallery } = extractImagesFromHtml(html, url);
        if (!principal && gallery.length === 0) {
          results.push({ url, ok: false, galeria: [], erro: "Nenhuma imagem encontrada (site pode estar bloqueando)", bloqueado: true, nome: title ?? undefined });
          continue;
        }
        results.push({
          url,
          ok: true,
          nome: title ?? undefined,
          imagem_principal: principal ?? undefined,
          galeria: gallery.slice(0, 20),
        });
      } catch (e) {
        results.push({ url, ok: false, galeria: [], erro: e instanceof Error ? e.message : "Falha ao acessar", bloqueado: true });
      }
    }
    return results;
  });

// ---------- Import ----------

const importItemSchema = z.object({
  url_origem: z.string().url(),
  nome: z.string().min(1).max(200),
  sku: z.string().min(1).max(64),
  categoria_id: z.string().uuid().nullable().optional(),
  familia_id: z.string().uuid().nullable().optional(),
  posicionamento: z.enum(["entrada", "intermediario", "premium", "hero"]).nullable().optional(),
  campanha_tamanho: z.enum(["P", "M", "G"]).nullable().optional(),
  status: z.enum(["ativo", "inativo", "descontinuado", "lancamento", "em_desenvolvimento"]).default("ativo"),
  imagens: z.array(z.string().url()).default([]),
  // Optional: paths of already-uploaded manual images in the "produtos" bucket
  imagens_manuais: z.array(z.object({ storage_path: z.string(), url_origem: z.string().optional() })).default([]),
});

export interface ImportLog {
  url_origem: string;
  produto_id?: string;
  criado: boolean;
  atualizado: boolean;
  imagens_encontradas: number;
  imagens_importadas: number;
  imagens_ignoradas: number;
  erros: string[];
}

function guessExt(url: string, contentType: string | null): string {
  const fromUrl = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUrl && /^(jpe?g|png|webp|avif|gif)$/.test(fromUrl)) return fromUrl === "jpeg" ? "jpg" : fromUrl;
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("avif")) return "avif";
  return "jpg";
}

export const importarJblProdutos = createServerFn({ method: "POST" })
  .inputValidator((data: { itens: unknown[] }) => z.object({ itens: z.array(importItemSchema).min(1).max(50) }).parse(data))
  .handler(async ({ data }): Promise<ImportLog[]> => {
    const supabase = getClient();
    const logs: ImportLog[] = [];

    for (const item of data.itens) {
      const log: ImportLog = {
        url_origem: item.url_origem,
        criado: false,
        atualizado: false,
        imagens_encontradas: item.imagens.length + item.imagens_manuais.length,
        imagens_importadas: 0,
        imagens_ignoradas: 0,
        erros: [],
      };

      try {
        // find or create produto by url_origem
        const { data: existente } = await supabase
          .from("produtos")
          .select("id")
          .eq("url_origem", item.url_origem)
          .maybeSingle();

        let produtoId: string;
        if (existente) {
          produtoId = existente.id;
          const { error: upErr } = await supabase.from("produtos").update({
            nome: item.nome,
            categoria_id: item.categoria_id ?? null,
            familia_id: item.familia_id ?? null,
            posicionamento: item.posicionamento ?? null,
            campanha_tamanho: item.campanha_tamanho ?? null,
            status: item.status,
          }).eq("id", produtoId);
          if (upErr) throw upErr;
          log.atualizado = true;
        } else {
          const { data: novo, error: insErr } = await supabase.from("produtos").insert({
            sku: item.sku,
            nome: item.nome,
            url_origem: item.url_origem,
            categoria_id: item.categoria_id ?? null,
            familia_id: item.familia_id ?? null,
            posicionamento: item.posicionamento ?? null,
            campanha_tamanho: item.campanha_tamanho ?? null,
            status: item.status,
          }).select("id").single();
          if (insErr) throw insErr;
          produtoId = novo.id;
          log.criado = true;
        }
        log.produto_id = produtoId;

        // fetch existing images for this produto to dedupe
        const { data: existingImgs } = await supabase
          .from("produtos_imagens")
          .select("id, url_origem, ordem, principal")
          .eq("produto_id", produtoId);
        const jaImportadas = new Set((existingImgs ?? []).map((i) => i.url_origem).filter(Boolean) as string[]);
        let maxOrdem = (existingImgs ?? []).reduce((m, i) => Math.max(m, i.ordem ?? 0), -1);
        let temPrincipal = (existingImgs ?? []).some((i) => i.principal);

        // Manual images: already in storage
        for (const manual of item.imagens_manuais) {
          if (manual.url_origem && jaImportadas.has(manual.url_origem)) {
            log.imagens_ignoradas++;
            continue;
          }
          maxOrdem++;
          const principal = !temPrincipal;
          if (principal) temPrincipal = true;
          const { error } = await supabase.from("produtos_imagens").insert({
            produto_id: produtoId,
            storage_path: manual.storage_path,
            url_publica: manual.storage_path,
            url_origem: manual.url_origem ?? null,
            ordem: maxOrdem,
            principal,
          });
          if (error) log.erros.push(`imagem manual: ${error.message}`);
          else log.imagens_importadas++;
        }

        // Remote images: download + upload
        for (const imgUrl of item.imagens) {
          if (jaImportadas.has(imgUrl)) {
            log.imagens_ignoradas++;
            continue;
          }
          try {
            const resp = await fetch(imgUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; JBLImageImporter/1.0)",
                "Referer": item.url_origem,
              },
            });
            if (!resp.ok) {
              log.erros.push(`${imgUrl}: HTTP ${resp.status}`);
              continue;
            }
            const contentType = resp.headers.get("content-type");
            const buf = new Uint8Array(await resp.arrayBuffer());
            const ext = guessExt(imgUrl, contentType);
            const path = `${produtoId}/${crypto.randomUUID()}.${ext}`;
            const { error: upErr } = await supabase.storage.from("produtos").upload(path, buf, {
              contentType: contentType ?? `image/${ext}`,
              upsert: false,
            });
            if (upErr) {
              log.erros.push(`${imgUrl}: upload ${upErr.message}`);
              continue;
            }
            maxOrdem++;
            const principal = !temPrincipal;
            if (principal) temPrincipal = true;
            const { error: insImgErr } = await supabase.from("produtos_imagens").insert({
              produto_id: produtoId,
              storage_path: path,
              url_publica: path,
              url_origem: imgUrl,
              ordem: maxOrdem,
              principal,
            });
            if (insImgErr) log.erros.push(`${imgUrl}: ${insImgErr.message}`);
            else log.imagens_importadas++;
          } catch (e) {
            log.erros.push(`${imgUrl}: ${e instanceof Error ? e.message : "erro"}`);
          }
        }
      } catch (e) {
        log.erros.push(e instanceof Error ? e.message : "erro desconhecido");
      }

      logs.push(log);
    }

    return logs;
  });
