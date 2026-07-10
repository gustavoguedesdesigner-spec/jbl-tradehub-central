# Deploy na Vercel

O projeto foi ajustado para gerar output compatível com a Vercel via Nitro (`preset: "vercel"` em `vite.config.ts`). A Vercel detecta automaticamente a pasta `.vercel/output` gerada pelo build.

## Variáveis de ambiente OBRIGATÓRIAS na Vercel

Configure em **Project Settings → Environment Variables** (Production, Preview e Development):

### Client (expostas no bundle — prefixo VITE_)
```
VITE_SUPABASE_URL=https://ndfzhmwmgezvpoboqxie.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vG4Quk_cZiPbyKP9IBgDjw_2h-euvLf
VITE_SUPABASE_PROJECT_ID=ndfzhmwmgezvpoboqxie
```

### Server (server functions — SEM prefixo VITE_)
```
SUPABASE_URL=https://ndfzhmwmgezvpoboqxie.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_vG4Quk_cZiPbyKP9IBgDjw_2h-euvLf
SUPABASE_SERVICE_ROLE_KEY=<obter no painel do backend>
LOVABLE_API_KEY=<obter no painel do backend, se usar IA>
```

> **Sem `SUPABASE_SERVICE_ROLE_KEY` na Vercel, todas as server functions falham e as páginas ficam sem dados.** Esta é a causa mais comum de "página em branco / não carrega" na Vercel.

## Após configurar

1. Salve as variáveis nos 3 ambientes (Production, Preview, Development).
2. Faça **Redeploy** (não basta reiniciar — o Vite injeta `VITE_*` em build time).
3. Verifique **Vercel → Deployments → Function Logs** para confirmar que não há mais `Missing Supabase environment variable(s)`.

## Auth Supabase — URLs permitidas

No painel de Auth do backend, adicione a URL da Vercel em **Site URL** e **Redirect URLs**:
```
https://<seu-projeto>.vercel.app
https://<seu-projeto>.vercel.app/**
```
Sem isso, login com Google/OAuth falha em produção.
