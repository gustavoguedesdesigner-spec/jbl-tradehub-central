import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function getClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const input = z.object({
  codigo: z.string().min(1).max(64),
  nome: z.string().min(1).max(200),
  descricao: z.string().max(4000).optional().nullable(),
  tipo: z.string().max(64).optional().nullable(),
  dimensoes: z.string().max(120).optional().nullable(),
  fornecedor_id: z.string().uuid().optional().nullable(),
});

export const listarMateriais = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("materiais_pdv")
    .select("id, codigo, nome, descricao, tipo, dimensoes, updated_at, fornecedor:fornecedores(id,nome)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const criarMaterial = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("materiais_pdv").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
