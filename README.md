# Fluxo Suporte — Sistema de Chamados

Helpdesk / sistema de chamados da **Fluxo Digital Tech**. Portal para clientes abrirem chamados, painel administrativo com dashboard, inventário de equipamentos e fila de atendimento por agente.

Construído em **Next.js 14** + **TypeScript** + **Prisma** + **PostgreSQL**.

---

## Funcionalidades

### Portal do Cliente
- Login com credenciais ou link de primeiro acesso
- Abertura de chamados com categoria e equipamento
- Thread de mensagens com equipe de suporte
- Reabertura de chamados resolvidos
- Notificações em tempo real (sino no header)

### Painel Administrativo
- Dashboard com KPIs em tempo real
- Listagem de chamados com filtros (status, cliente, fila, prioridade, SLA)
- Minha fila com "puxar próximo" (FOR UPDATE SKIP LOCKED)
- Detalhe do chamado: alterar status, prioridade, atribuir agente, notas internas
- Templates de resposta com variáveis (`{{nome}}`)
- Busca global com Ctrl+K (chamados, clientes, usuários)
- CRUD de clientes, contatos, equipamentos, filas, categorias
- Gestão de usuários com convite por email (link de primeiro acesso)
- Relatórios PDF e CSV (chamados, clientes, desempenho)
- Notificações in-app com polling
- Toggle de tema claro/escuro

### SLA
- Políticas por prioridade (Urgente 1h/4h, Alta 2h/8h, Média 4h/24h, Baixa 8h/72h)
- Badge visual com contagem regressiva
- Cron `sla-check` marca chamados estourados e notifica responsável
- Filtro de SLA na listagem (vencendo / estourados)

### Segurança
- Rate limiting por ação (login, criação, resposta)
- Audit log completo (todas as ações geram registro com IP/UA)
- Validação de uploads (whitelist MIME, extensões bloqueadas, limite 10MB)
- Tokens de senha com hash SHA-256, expiração e uso único
- Proteção de crons via `CRON_SECRET`

### Automações (Crons)
- `POST /api/cron/auto-close` — fecha chamados resolvidos há N dias
- `POST /api/cron/sla-check` — marca SLA estourado e notifica agente

---

## Pré-requisitos

- **Node.js 20+**
- **npm**
- **PostgreSQL 15+**

---

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3001` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Provedor SMTP |
| `SMTP_FROM` | Ex: `"Fluxo Suporte <suporte@fluxodigital.com.br>"` |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | Admin do seed |
| `CRON_SECRET` | Secret para proteger endpoints de cron |
| `AUTO_CLOSE_DAYS` | Dias para auto-close (padrão: 3) |
| `UPLOAD_DIR` | Diretório de uploads (padrão: `./uploads`) |

### 3. Banco de dados

```bash
npm run db:generate   # gera o Prisma Client
npm run db:migrate    # cria as tabelas
npm run db:seed       # popula dados iniciais
```

### 4. Iniciar em dev

```bash
npm run dev
```

Acesse **http://localhost:3001**.

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Desenvolvimento (porta 3001) |
| `npm run build` | Build de produção |
| `npm run start` | Produção (porta 3001) |
| `npm run lint` | ESLint |
| `npm test` | Testes com Vitest |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Cobertura de testes |
| `npm run db:migrate` | Nova migração Prisma |
| `npm run db:deploy` | Aplica migrações em prod |
| `npm run db:seed` | Seed inicial |
| `npm run db:studio` | Prisma Studio (GUI) |
| `npm run format` | Prettier |
| `npm run test:smtp` | Teste de envio de email |

---

## Estrutura do projeto

```
suporte/
├── docs/                      Documentação
│   ├── SPEC.md                Especificação técnica
│   ├── DB_SCHEMA.md           Modelo de dados
│   └── email-deliverability.md  Guia DNS SPF/DKIM/DMARC
├── prisma/
│   ├── schema.prisma          Modelo Prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── login/             Login
│   │   ├── primeiro-acesso/   Primeiro acesso via token
│   │   ├── esqueci-senha/     Reset de senha
│   │   ├── portal/            Portal do cliente
│   │   ├── admin/             Painel administrativo
│   │   │   ├── chamados/      Chamados (lista + detalhe)
│   │   │   ├── clientes/      CRUD de clientes
│   │   │   ├── fila/          Minha fila
│   │   │   ├── inventario/    Equipamentos
│   │   │   ├── templates/     Templates de resposta
│   │   │   ├── relatorios/    Relatórios
│   │   │   └── configuracoes/ Configurações
│   │   └── api/
│   │       ├── auth/          NextAuth handlers
│   │       ├── notifications/ API de notificações
│   │       ├── search/        Busca global
│   │       ├── relatorios/    PDF + CSV export
│   │       ├── tickets/       Upload de anexos
│   │       └── cron/          Automações (auto-close, sla-check)
│   ├── components/            Componentes React
│   │   ├── command-palette.tsx Busca Ctrl+K
│   │   ├── notifications-bell.tsx Sino de notificações
│   │   ├── reply-form.tsx     Form de resposta com templates
│   │   ├── sla-badge.tsx      Badge de SLA
│   │   ├── submit-button.tsx  Botão com loading state
│   │   ├── toast.tsx          Sistema de toasts
│   │   └── theme-toggle.tsx   Toggle claro/escuro
│   ├── lib/
│   │   ├── auth.ts            Auth.js v5 + rate limit
│   │   ├── db.ts              Prisma client singleton
│   │   ├── audit.ts           Audit log
│   │   ├── csv.ts             Gerador CSV
│   │   ├── logger.ts          Pino logger
│   │   ├── notifications.ts   Notificações in-app
│   │   ├── password-token.ts  Tokens de senha
│   │   ├── rate-limit.ts      Rate limiter in-memory
│   │   ├── sla.ts             Cálculo de SLA
│   │   ├── upload.ts          Validação de uploads
│   │   └── utils.ts           Helpers
│   ├── server/
│   │   ├── services/          Lógica de domínio
│   │   └── actions/           Server actions
│   └── middleware.ts          Guarda de rota
├── .github/workflows/ci.yml  CI (lint + typecheck + test + build)
├── Dockerfile
├── docker-compose.yml
└── vitest.config.ts
```

---

## Deploy

### Docker Compose (recomendado)

```bash
git clone <repo> /opt/fluxo-suporte
cd /opt/fluxo-suporte
cp .env.example .env
# edite .env com valores de produção
docker compose build
docker compose up -d
docker compose exec suporte-app npx prisma migrate deploy
docker compose exec suporte-app npm run db:seed
```

Configure Nginx como reverse proxy na porta 3001 com HTTPS (Let's Encrypt).

### Crons

Configure no crontab ou no scheduler do seu host:

```bash
# Auto-close chamados resolvidos (diário às 2h)
0 2 * * * curl -s -H "x-cron-secret: $CRON_SECRET" http://localhost:3001/api/cron/auto-close

# Verificação de SLA (a cada 5 min)
*/5 * * * * curl -s -H "x-cron-secret: $CRON_SECRET" http://localhost:3001/api/cron/sla-check
```

---

## Email Deliverability

Para que os emails transacionais não caiam em spam, configure SPF, DKIM e DMARC no DNS. Veja o guia completo em [`docs/email-deliverability.md`](docs/email-deliverability.md).

---

## CI/CD

O workflow `.github/workflows/ci.yml` roda automaticamente em push para `main`/`develop` e PRs:

1. Lint (ESLint)
2. TypeCheck (`tsc --noEmit`)
3. Testes (Vitest)
4. Build (Next.js)

---

## Segurança — Checklist de produção

- [ ] `NEXTAUTH_SECRET` com valor aleatório forte
- [ ] Trocar senha do admin após primeiro login
- [ ] HTTPS obrigatório (redirect 80 → 443)
- [ ] Firewall: expor só porta 443
- [ ] Backup diário do PostgreSQL
- [ ] `CRON_SECRET` configurado
- [ ] SPF/DKIM/DMARC no DNS
- [ ] `UPLOAD_DIR` fora do diretório público

---

## Autor

**Fluxo Digital Tech** — 2026
Desenvolvido por Cleiton Sampaio.

Licença: privada / uso interno.
# suporte
