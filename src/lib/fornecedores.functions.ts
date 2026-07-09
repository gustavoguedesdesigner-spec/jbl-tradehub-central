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
  nome: z.string().min(1).max(200),
  cnpj: z.string().max(32).optional().nullable(),
  contato_nome: z.string().max(200).optional().nullable(),
  contato_email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  contato_telefone: z.string().max(64).optional().nullable(),
  observacoes: z.string().max(4000).optional().nullable(),
});

export const listarFornecedores = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getClient();
  const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const criarFornecedor = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data }) => {
    const supabase = getClient();
    const payload = { ...data, contato_email: data.contato_email || null };
    const { error } = await supabase.from("fornecedores").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
