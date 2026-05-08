# Control GP — Gestão Financeira Pessoal

SaaS de gestão financeira pessoal com PWA offline-first, multi-tenant, e segurança enterprise.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 8 + TailwindCSS v4
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Offline:** Dexie.js (IndexedDB) + Delta Sync Engine
- **PWA:** Service Worker + Manifest + Installable

## Deploy na Vercel

### 1. Via CLI

```bash
npm install -g vercel
vercel --prod
```

### 2. Via GitHub

1. Importe o repositório `rorimlima/ControlGP` na Vercel
2. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Install command: `npm install`

## Dev Local

```bash
npm install
npm run dev
```

## Controle de Acesso

O sistema possui controle de acesso via **Control Master GP** (`/admin`):
- Apenas usuários autorizados (tabela `usuarios_autorizados`) podem acessar
- Admin Master: `onaeror@gmail.com`
- Admin pode autorizar, desativar e gerenciar planos dos usuários

## Licença

Proprietário — Todos os direitos reservados.
