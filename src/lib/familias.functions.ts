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

const input = z.object({
  nome: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  descricao: z.string().max(2000).optional().nullable(),
  ordem: z.number().int().min(0).optional(),
});

export const listarFamilias = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase.from("familias").select("*").order("ordem").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const criarFamilia = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const { error } = await supabase.from("familias").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
