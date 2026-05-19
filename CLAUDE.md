# Fluxo Suporte — guia rápido pro Claude

Stack: Next.js 14 (App Router) + Prisma + PostgreSQL + Tailwind + NextAuth v5 beta + Radix UI + Recharts. Idioma: pt-BR (incluindo commits e código quando inevitável).

## Comandos

```bash
npm run dev               # dev server na porta 3001
npm run build             # prisma generate + next build
npm test                  # vitest run (31 testes)
npm run db:migrate        # prisma migrate dev (interativo)
npx prisma migrate deploy # aplica migrations pending (não-interativo)
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel ./prisma/schema.prisma --script
                          # gera SQL de diff sem aplicar
npx tsc --noEmit          # type-check standalone
```

`typescript.ignoreBuildErrors: true` está ligado em `next.config.mjs`. **NÃO confie no build de produção pra detectar erros de tipo.** Rode `tsc --noEmit` antes de mergear.

## Regras de delete / soft-delete

**Soft-delete via `deletedAt: DateTime?`** é o padrão. Models que usam:

| Model | deletedAt | Notas |
|---|---|---|
| Client | ✅ | Cascade manual: users + equipment + tickets do cliente (ver `deleteClientAction`) |
| User | ✅ | Também seta `isActive: false` |
| Equipment | ✅ | |
| Ticket | ✅ | |
| ResponseTemplate | ✅ | Também seta `isActive: false` |
| KbArticle | ✅ | Também seta `isPublished: false` |
| AutomationRule | ✅ | Também seta `isActive: false` (evita execução) |
| KbCategory | ❌ usa `isActive` | "Fake delete" via toggle de visibilidade. Não tem audit recovery. |
| TicketMessage | ✅ | |

**Regras:**

1. **Sempre filtrar `deletedAt: null` em queries** que listam pra usuário, exceto se for auditoria/análise.
2. **`findUnique({ where: { id } })` ignora soft-delete.** Use `findFirst({ where: { id, deletedAt: null } })` quando quiser excluir deletados.
3. **`audit()` em toda ação destrutiva**, com `metadata` incluindo o que foi afetado (counts de cascade quando aplicável).
4. **`ConfirmDialog` em toda destrutiva pela UI** — nunca `window.confirm()` nativo. Usa `destructive` prop pra cor de risco.
5. **Server actions destrutivas devem `redirect()` com `?ok=` ou `?error=`** — `ToastFromQuery` (montado em `admin/layout` e `portal/layout`) escuta e dispara toast.

**Catálogo de toast keys** está em `src/components/toast-from-query.tsx`. Adicione novas conforme criar actions.

## Inline vs página separada (edição)

- **Inline** (sem nova rota): campos simples sem validação composta — status, prioridade, fila, ordem, toggles. Ex: `EquipmentStatusSelect`, toggle de automação.
- **Página separada** (`[id]/editar/page.tsx`): dados multi-campo com validação — cliente, contato, equipamento, template, artigo KB, regra de automação.
- **Delete**: sempre via `ConfirmDialog` (não inline).

## Permissões

- Todas as actions verificam `session.user.userType === 'AGENT'` (interno) ou `=== 'CLIENT_CONTACT'` (cliente).
- Ações destrutivas críticas (deletar cliente, deletar automação) exigem `role === 'ADMIN'`.
- Permission failures redirecionam com `?error=forbidden` ou registram audit `*.forbidden`.

## Estrutura

```
src/
  app/
    admin/      # área dos agentes (sidebar deep navy)
    portal/     # área do cliente (header simples + hero)
    api/        # routes /search, /tickets/[id]/attachments, /kb, /cron, /relatorios
    login/      # tela split (hero esquerda + form direita)
  components/
    confirm-dialog.tsx     # Radix Dialog + SubmitButton (reusável)
    toast-from-query.tsx   # bridge server-action → toast
    cnpj-input.tsx         # input com máscara live
    warranty-badge.tsx     # pill de status de garantia
    equipment-form.tsx     # form compartilhado entre novo e editar
    equipment-status-select.tsx  # dropdown inline
    dashboard/             # KpiCard, ActivityIcon
  server/
    actions/               # server actions agrupadas por entidade
    services/              # business logic (ticket-service etc.)
  lib/
    db.ts                  # PrismaClient singleton
    auth.ts                # NextAuth config + middleware
    audit.ts               # audit() helper + AuditAction enum
    cnpj.ts                # validação + format
    automation-engine.ts   # runtime de regras
    sla.ts                 # cálculo de SLA
```

## Audit Log

Tipo `AuditAction` em `src/lib/audit.ts` é union literal. Toda nova ação destrutiva ou mudança de estado deve:
1. Adicionar a string ao tipo `AuditAction`
2. Chamar `audit({ action, actorId, entity, entityId, metadata })`
3. Nunca depender do audit pra rollback — é só registro

`AuditAction` cobre: auth.*, user.*, client.*, ticket.*, template.*, automation.*, kb.*, equipment.*, rate_limit.hit.

## Convenções de UI

- `font-display` (Montserrat) em headers, `font-sans` (Poppins) em corpo
- Cores: `fluxo-*` (azul deep) + `cyan-*` (accent). Gradiente: `bg-fluxo-gradient` ou `bg-fluxo-gradient-dark`
- Shadows: `shadow-fluxo`, `shadow-fluxo-lg` pra elementos com identidade
- Dark mode: ativo por default, override via `<html className="dark">` + localStorage. Estilos globais em `globals.css` cobrem `.bg-white`, `.text-slate-*`, etc.
- Formulários: sempre `id` + `htmlFor` em label/input (WCAG 1.3.1)
- Tabelas: `<th scope="col">` em todas
- Botões só-ícone: `aria-label` obrigatório; `Icon aria-hidden="true"`
- Loading state: `<SubmitButton pendingText="...">` (usa `useFormStatus`)

## Padrões NÃO recomendados

- ❌ `window.confirm()` ou `window.alert()` — use `ConfirmDialog` ou banner com `searchParams.error`
- ❌ `db.X.delete()` em models com `deletedAt` — use `update({ data: { deletedAt: new Date() } })`
- ❌ Server action retornando `{ error }` quando usada por `<form action>` — Next 14 espera `Promise<void>`. Redirecione com `?error=`.
- ❌ Banner inline (`searchParams.saved === '1'`) — use `?ok=...` + `ToastFromQuery`
- ❌ `findUnique` em models com soft-delete sem filtrar `deletedAt: null` — vazaria deletados
