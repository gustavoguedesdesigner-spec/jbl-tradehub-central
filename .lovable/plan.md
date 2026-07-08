# JBL Trade Hub — Fundação

Vamos construir a base do sistema: infraestrutura, banco relacional, navegação e o shell dos três módulos. Sem login por enquanto (todos acessam livremente), mas com arquitetura preparada para adicionar papéis depois. Todos os textos em português.

## Escopo desta fase

- Ativar Lovable Cloud (banco Postgres, storage, RLS já preparado)
- Modelar as tabelas centrais compartilhadas entre os 3 módulos
- Definir design system e componentes reutilizáveis
- Criar layout com sidebar dos 3 módulos + navegação
- Base Mestre → Produtos JBL funcional (CRUD real com SKU, linha, categoria, imagens)
- Central de Lançamentos e Menu Merchandising → shell/estrutura vazia pronta para receber funcionalidades

## Arquitetura de banco (relacional, sem duplicação)

```text
categorias ─┐
linhas ─────┤
            ├──► produtos ──► produtos_imagens
fornecedores┤        │
            │        ├──► materiais_pdv (fase futura)
            │        ├──► lancamentos_produtos (join)
            │        └──► arquivos (via arquivos_vinculos polimórfico)
            │
            └──► materiais_pdv (fase futura)

lancamentos ──► lancamentos_produtos ──► produtos
    │
    └──► campanhas (fase futura) ──► briefings

arquivos ──► arquivos_vinculos (entidade_tipo, entidade_id)
    (biblioteca única compartilhada por todos os módulos)
```

Tabelas criadas agora:

- `categorias` — categorias de produto (nome, slug)
- `linhas` — linhas de produto JBL (nome, slug, descrição)
- `produtos` — SKU, nome, descrição, linha_id, categoria_id, status, timestamps
- `produtos_imagens` — múltiplas imagens por produto, ordem, principal
- `arquivos` — biblioteca central (nome, url no storage, tipo, tamanho)

Stubs (estrutura mínima para os módulos futuros já poderem referenciar):

- `fornecedores`
- `materiais_pdv`
- `lancamentos`
- `lancamentos_produtos`

Todas com RLS habilitada e políticas abertas nesta fase (anon+authenticated), comentadas para restringir quando login for adicionado. `GRANT` explícitos para `anon`, `authenticated` e `service_role`.

Storage bucket público: `produtos` (imagens).

## Arquitetura de código

```text
src/
  routes/
    __root.tsx                 → shell com SidebarProvider + header
    index.tsx                  → dashboard com atalhos aos 3 módulos
    base-mestre/
      route.tsx                → layout do módulo (Outlet)
      index.tsx                → visão geral
      produtos.tsx             → lista
      produtos.novo.tsx        → criar
      produtos.$id.tsx         → editar
    lancamentos/
      route.tsx
      index.tsx                → shell estruturado
    merchandising/
      route.tsx
      index.tsx                → shell estruturado
  components/
    layout/{AppSidebar,PageHeader}.tsx
    produtos/{ProdutoForm,ProdutoCard,ProdutoImagensUploader}.tsx
    ui/                        → shadcn
  lib/
    produtos.functions.ts      → server fns (list/get/create/update/delete)
    categorias.functions.ts
    linhas.functions.ts
    upload.functions.ts        → upload para storage
```

## Design system

- Paleta JBL: laranja de destaque sobre neutros, alto contraste
- Todos os tokens em `src/styles.css` (oklch); nada de cor hardcoded
- Sidebar recolhível (modo icon) para maximizar área útil
- Componentes reutilizáveis desde já: `PageHeader`, `DataTable`, `EmptyState`, `FormSection`

## Fluxo de Produtos (Base Mestre) — funcional

- Listagem com busca por SKU/nome, filtro por linha e categoria, paginação
- Formulário criar/editar com validação (zod)
- Upload de múltiplas imagens (bucket `produtos`), imagem principal e reordenação
- Vínculos com categoria e linha via selects (nunca digitados livres)
- Exclusão com confirmação

## Detalhes técnicos

- TanStack Start + React 19 + TS + Tailwind v4 + shadcn
- Dados via `createServerFn` + TanStack Query (`ensureQueryData` no loader + `useSuspenseQuery` no componente)
- Formulários: `react-hook-form` + `zod`
- Storage: Supabase Storage (bucket `produtos`, leitura pública)
- Migrations com `GRANT` + `ENABLE RLS` + policies em cada `CREATE TABLE`
- Preparado para papéis: quando login for adicionado, trocam-se as policies por `has_role(auth.uid(), ...)` sem mudar estrutura

## Fora desta fase (próximos passos)

- Autenticação + papéis (admin, trade, fornecedor, visualizador)
- CRUD de fornecedores, materiais PDV, arquivos/DAM
- Central de Lançamentos: cronograma, briefings, campanhas
- Menu Merchandising: definição funcional detalhada com o usuário

Ao aprovar, começo pela ativação do Cloud e criação das migrations, na sequência acima.