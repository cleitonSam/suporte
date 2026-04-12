# Sistema de Chamados — Fluxo Digital Tech

**Versão:** 0.1 (rascunho inicial)
**Data:** 2026-04-11
**Autor:** Cleiton Sampaio (com apoio do Claude)

---

## 1. Visão geral

Sistema web de helpdesk / chamados para a Fluxo Digital Tech, atendendo múltiplos clientes (empresas) que abrem chamados para o time interno de T.I.

O produto tem **dois lados**:

1. **Portal do cliente** — onde contatos dos clientes abrem e acompanham seus chamados.
2. **Painel administrativo (agentes)** — onde o time da Fluxo trata os chamados, gerencia inventário e trabalha em filas.

O sistema convive com o Chatwoot já instalado (atendimento multicanal), mas é **independente** — banco próprio (`suporte`) no mesmo cluster Postgres.

---

## 2. Personas

| Persona | Quem é | O que faz no sistema |
|---|---|---|
| **Admin (Fluxo)** | Dono / gestor da operação | Cria clientes, usuários, filas, categorias, equipamentos. Vê todos os chamados e métricas. |
| **Agente / Técnico (Fluxo)** | Time de T.I. interno | Atende chamados, puxa da fila, atualiza status, consulta inventário do cliente. |
| **Contato do cliente** | Colaborador da empresa-cliente | Abre chamado, anexa arquivo, acompanha andamento, responde no thread. |

---

## 3. Escopo MVP (1ª entrega)

Confirmado com Cleiton em 2026-04-11:

- [x] Portal do cliente (login + abrir chamado + listar meus chamados + thread)
- [x] Dashboard admin (KPIs: abertos, em andamento, fechados hoje/semana/mês)
- [x] Lista de chamados com busca e filtros (status, prioridade, cliente, agente, fila)
- [x] Inventário de equipamentos vinculado a cada cliente
- [x] Fila de atendimento por agente (puxar próximo da fila)

**Fora do MVP (fica para V2):**
- Integração com Chatwoot (importar conversas como chamados)
- SLA automático e alertas de violação
- Portal multi-idioma
- Base de conhecimento / FAQ
- Notificações por WhatsApp/email transacional
- Relatórios BI avançados
- Aplicativo mobile

---

## 4. Arquitetura

### 4.1 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | **Next.js 14** (App Router) + **TypeScript** + **React 18** |
| Estilização | **Tailwind CSS** + **shadcn/ui** (componentes acessíveis) |
| Formulários | **React Hook Form** + **Zod** (validação) |
| Backend | Next.js API routes + Server Actions |
| ORM | **Prisma** |
| Banco | **PostgreSQL 15+** (já disponível no server da Fluxo) |
| Cache / fila | **Redis** (já disponível; usado para sessão e bloqueios de fila) |
| Autenticação | **Auth.js v5** (NextAuth) — Credentials provider |
| Upload de arquivos | Armazenamento local em `/uploads` (V1) ou S3/MinIO (V2) |
| Deploy | Docker Compose no servidor `server.fluxodigitaltech.com.br` |
| Logs | Pino + rotação por data |

### 4.2 Topologia de deploy

```
┌─────────────────────────────────────────────────┐
│  server.fluxodigitaltech.com.br                 │
│                                                  │
│  ┌────────────┐      ┌──────────────────┐      │
│  │  Chatwoot  │      │  Sistema Chamados │     │
│  │  (porta X) │      │  (Next.js, 3001)  │     │
│  └────────────┘      └────────┬──────────┘     │
│                                │                │
│  ┌────────────────────────────┴────────┐       │
│  │  Postgres (porta 5440)              │       │
│  │   - chatwoot  (db existente)        │       │
│  │   - suporte   (db novo) ← nosso     │       │
│  └──────────────────────────────────────┘      │
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │  Redis (porta 6379)                  │      │
│  └──────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```

Um **Nginx reverse proxy** na frente expõe `suporte.fluxodigitaltech.com.br` → container Next.js.

### 4.3 Estrutura de pastas

```
suporte/
├── docs/                      # Documentação (este arquivo, decisões, etc.)
│   ├── SPEC.md
│   └── DB_SCHEMA.md
├── prisma/
│   ├── schema.prisma          # Modelo de dados
│   ├── seed.ts                # Dados iniciais (admin, categorias padrão)
│   └── migrations/            # Gerado pelo Prisma
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Rotas públicas de auth
│   │   │   ├── login/
│   │   │   └── cadastro/
│   │   ├── (portal)/          # Portal do cliente
│   │   │   ├── portal/
│   │   │   │   ├── page.tsx              # Home (meus chamados)
│   │   │   │   ├── novo/page.tsx         # Abrir chamado
│   │   │   │   └── chamado/[id]/page.tsx # Detalhe/thread
│   │   ├── (admin)/           # Painel admin
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx              # Dashboard KPIs
│   │   │   │   ├── chamados/
│   │   │   │   │   ├── page.tsx          # Listagem + filtros
│   │   │   │   │   └── [id]/page.tsx     # Detalhe
│   │   │   │   ├── fila/page.tsx         # Minha fila
│   │   │   │   ├── clientes/
│   │   │   │   │   ├── page.tsx          # Lista
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx      # Detalhe do cliente
│   │   │   │   │       └── equipamentos/page.tsx
│   │   │   │   ├── inventario/page.tsx   # Visão geral
│   │   │   │   └── configuracoes/
│   │   │   │       ├── usuarios/
│   │   │   │       ├── filas/
│   │   │   │       └── categorias/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── tickets/route.ts
│   │   │   └── uploads/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing → redireciona para login
│   ├── components/
│   │   ├── ui/                # shadcn/ui
│   │   ├── tickets/
│   │   ├── inventory/
│   │   └── shared/
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # NextAuth config
│   │   ├── validators/        # Schemas Zod
│   │   ├── permissions.ts     # Regras de acesso
│   │   └── utils.ts
│   ├── server/
│   │   ├── actions/           # Server actions
│   │   │   ├── tickets.ts
│   │   │   ├── equipment.ts
│   │   │   └── queue.ts
│   │   └── services/          # Lógica de domínio
│   ├── types/
│   └── middleware.ts          # Guarda de rota
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 5. Modelo de dados

Detalhe completo em `DB_SCHEMA.md` e no `prisma/schema.prisma`. Resumo das entidades:

### Entidades principais

| Entidade | Descrição |
|---|---|
| **User** | Tabela única para agentes **e** contatos de cliente, discriminada por `userType`. |
| **Client** | Empresa-cliente da Fluxo. CNPJ, razão social, contato. |
| **Ticket** | Chamado. Sempre pertence a um `Client` e a um `User` (abridor). |
| **TicketMessage** | Mensagens do thread (cliente e agente conversam aqui). Flag `internal` para notas que só agentes veem. |
| **TicketEvent** | Log de auditoria: mudanças de status, atribuição, reabertura. |
| **TicketAttachment** | Metadados dos arquivos anexados a um chamado ou mensagem. |
| **Equipment** | Equipamento no inventário. Sempre pertence a um `Client`. |
| **EquipmentCategory** | CPU, Notebook, Impressora, Switch, Roteador, Servidor, Outro. |
| **Queue** | Fila nomeada (ex: "Geral", "Redes", "Impressoras"). Agentes são membros. |
| **Category** | Categoria do chamado (Hardware, Software, Rede, Email, Acesso, Outro). |

### Enums

- `UserType`: `AGENT`, `CLIENT_CONTACT`
- `UserRole`: `ADMIN`, `AGENT`, `CLIENT` (dentro de cada tipo)
- `TicketStatus`: `NEW` → `OPEN` → `IN_PROGRESS` → `WAITING_CLIENT` → `RESOLVED` → `CLOSED` (+ `REOPENED`)
- `TicketPriority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `EquipmentStatus`: `ACTIVE`, `IN_REPAIR`, `RETIRED`

### Regras importantes

1. **Vínculo automático cliente–chamado:** quando um `CLIENT_CONTACT` abre um chamado, o `clientId` é preenchido automaticamente a partir do vínculo do usuário — nunca o cliente escolhe qual empresa.
2. **Soft-delete em tudo** (`deletedAt`) — LGPD exige retenção de logs de atendimento.
3. **Numeração humana:** todo ticket tem `ticketNumber` no formato `CH-2026-00001` (sequencial por ano), além do `id` UUID/cuid.
4. **Fila sem concorrência:** ao "puxar próximo da fila", usar `SELECT ... FOR UPDATE SKIP LOCKED` dentro de uma transação para evitar que dois agentes peguem o mesmo ticket.
5. **Timestamps:** todos os registros têm `createdAt`, `updatedAt`. `Ticket` também tem `resolvedAt`, `closedAt`, `firstResponseAt` para relatórios.

---

## 6. Fluxos principais

### 6.1 Cliente abrindo chamado

```
1. Cliente acessa /login
2. Informa email + senha
3. Redirecionado para /portal
4. Clica "Abrir novo chamado"
5. Preenche: título, descrição, categoria, prioridade
6. (Opcional) Vincula a um equipamento seu
7. (Opcional) Anexa arquivos
8. Envia
   → Ticket criado com status NEW
   → clientId preenchido automaticamente do user.clientId
   → Evento "CREATED" gravado
   → Fila padrão: "Geral"
9. Cliente é redirecionado para /portal/chamado/[id]
```

### 6.2 Agente tratando chamado da fila

```
1. Agente acessa /admin/fila
2. Vê sua fila (filas onde é membro) + KPIs: "5 aguardando"
3. Clica "Puxar próximo"
   → SELECT ... FOR UPDATE SKIP LOCKED
   → Ticket atribuído ao agente (assignedToId = agente.id)
   → Status vira IN_PROGRESS
   → Evento "ASSIGNED" gravado
4. Vai para o detalhe do chamado
5. Responde mensagem → TicketMessage criada
6. Marca "Aguardando cliente" → status WAITING_CLIENT
7. Cliente responde → status volta para IN_PROGRESS (automático)
8. Agente marca "Resolvido" → status RESOLVED, resolvedAt preenchido
9. Cliente confirma ou após 48h sem resposta → CLOSED
```

### 6.3 Admin gerenciando inventário

```
1. Admin acessa /admin/clientes
2. Clica no cliente X
3. Vai para /admin/clientes/[id]/equipamentos
4. Cadastra: tipo, marca, modelo, serial, MAC, IP, localização, data de compra, garantia
5. Equipamento aparece disponível para vincular em chamados futuros desse cliente
```

---

## 7. Autenticação e autorização

### 7.1 Auth.js v5 (NextAuth)

- Provider: **Credentials** (email + senha). Google OAuth pode vir em V2.
- Sessão: JWT com cookie HttpOnly, `maxAge = 30 dias`.
- Hash de senha: **bcrypt** (cost 12).
- Payload do token: `{ userId, userType, clientId?, role }`.

### 7.2 Middleware de proteção

`src/middleware.ts` verifica antes de cada request:

| Rota | Quem pode acessar |
|---|---|
| `/portal/*` | `userType = CLIENT_CONTACT` (ou AGENT impersonando) |
| `/admin/*` | `userType = AGENT` |
| `/admin/configuracoes/*` | `role = ADMIN` |
| `/api/tickets/*` | Autenticado; filtro por `clientId` aplicado no service |

### 7.3 Regra de ouro

**Todo `SELECT` de dados tenant-sensíveis aplica filtro por `clientId` no service layer**, não confiando apenas em UI. Se `userType = CLIENT_CONTACT`, o filtro é forçado; se `AGENT`, é opcional (agente vê todos, mas pode filtrar).

---

## 8. Interface (esboço das telas)

### Portal do cliente
1. **Login** — email, senha, "esqueci minha senha"
2. **Minhas chamados** — tabela com status colorido, busca, link para detalhe
3. **Novo chamado** — formulário com validação inline
4. **Detalhe do chamado** — cabeçalho (número, status, prioridade, equipamento), thread de mensagens, caixa de resposta

### Painel admin
1. **Dashboard** — 4 cards (abertos, em andamento, resolvidos hoje, violando SLA) + gráfico de chamados últimos 30 dias + últimos 10 chamados
2. **Lista de chamados** — tabela virtual com filtros persistentes na URL (status, prioridade, cliente, agente, fila, período), busca por texto no título/descrição, paginação
3. **Detalhe do chamado** — thread + painel lateral com ações (atribuir, mudar status, mudar prioridade, vincular equipamento, notas internas)
4. **Minha fila** — cards das filas que o agente participa + botão "Puxar próximo" por fila + lista dos tickets atualmente atribuídos
5. **Clientes** — lista com busca por nome/CNPJ, detalhe com abas (Dados, Contatos, Equipamentos, Chamados)
6. **Inventário global** — tabela de todos os equipamentos, filtro por cliente, tipo, status
7. **Configurações** — usuários, filas, categorias

---

## 9. Segurança (baseline)

- Senhas: bcrypt cost 12
- Cookies de sessão: HttpOnly + Secure + SameSite=Lax
- CSRF: NextAuth já trata para mutações
- Rate limit: 5 tentativas de login / 15 min por IP (via Redis)
- Sanitização: todo input renderizado como texto; HTML em descrições só via Markdown pré-processado
- Uploads: whitelist de MIME, tamanho máx 10 MB, scan de extensão
- SQL injection: Prisma (parametrizado)
- XSS: React escapa por padrão; nunca usar `dangerouslySetInnerHTML`
- Headers: CSP, HSTS, X-Frame-Options via `next.config.mjs`
- Logs não gravam senha nem token

---

## 10. LGPD

- Dados pessoais coletados: nome, email, telefone (opcional) de contatos dos clientes
- Base legal: execução de contrato de prestação de serviço
- Retenção: 5 anos após encerramento do contrato
- Titular pode solicitar exclusão — rota admin faz `deletedAt` em cascata e remove anexos do storage
- Audit trail (`TicketEvent`) preservado para defesa em eventual fiscalização

---

## 11. Roadmap

### V1 — MVP (4 a 6 semanas)
- Setup do projeto, auth, schema, migrações
- Portal do cliente completo
- Dashboard admin + listagem com filtros
- Inventário (CRUD)
- Fila básica com "puxar próximo"
- Deploy em produção

### V2 — Operação (4 semanas)
- Notificações por email (chamado criado, respondido, resolvido)
- SLA por prioridade com alerta visual
- Base de conhecimento (FAQ)
- Relatórios exportáveis (CSV)
- Busca full-text no thread

### V3 — Integrações (a definir)
- Importar conversas do Chatwoot como chamados
- WhatsApp transacional via Twilio / Evolution API
- API pública com token para integrações do cliente

---

## 12. Decisões em aberto

| # | Questão | Status |
|---|---|---|
| D1 | Qual storage para anexos: local, MinIO ou S3? | MVP: local (`/uploads`) |
| D2 | Cada agente pode pertencer a múltiplas filas? | Sim (M:N via `QueueMember`) |
| D3 | Cliente pode ter múltiplos contatos logando? | Sim |
| D4 | Contatos se auto-cadastram ou admin cria? | Admin cria (MVP); V2 pode ter auto-cadastro com aprovação |
| D5 | Prioridade pode ser mudada pelo cliente? | Cliente sugere; agente confirma |

---
