# Email → Ticket: setup do Cloudflare Email Workers

Esse guia configura o pipeline:

```
cliente@empresa.com.br  ───[email]──▶  chamados-{token}@suporte.fluxodigitaltech.com.br
                                         │
                                         ▼   (Cloudflare Email Routing)
                                       Email Worker (JS na borda)
                                         │
                                         ▼   POST com X-Fluxo-Secret
                                  /api/inbound/email  (Next)
                                         │
                                         ▼
                                   processInboundEmail()
                                         │
                                         ▼
                                  Ticket criado + audit log
```

Por que **Cloudflare Email Workers**: grátis ilimitado, sem precisar contratar Postmark/SendGrid/Mailgun (que cobram após free tier de 100/dia ou 10k/mês). Roda na borda, latência baixa.

---

## Passo 1 — Habilitar Email Routing no domínio

1. Dashboard Cloudflare → selecione `fluxodigitaltech.com.br`
2. Sidebar: **Email** → **Email Routing**
3. Clique **Enable Email Routing**
4. Cloudflare vai pedir pra adicionar **registros MX** e **SPF TXT** — confirme
5. Aguarde "Active" (~1 min)

> **Importante:** isso adiciona MX no domínio raiz `fluxodigitaltech.com.br`. Se você já usa Hostinger pra email institucional (`ti@fluxodigitaltech.com.br`), os MX da Hostinger serão sobrescritos. Veja Passo 2 pra usar **subdomínio dedicado** e evitar isso.

---

## Passo 2 — Usar subdomínio `suporte.fluxodigitaltech.com.br` (recomendado)

Pra não conflitar com email institucional, isole o inbound num subdomínio:

1. Cloudflare → DNS → adicione registros MX no subdomínio:

   | Type | Name      | Mail server                  | Priority |
   |------|-----------|------------------------------|----------|
   | MX   | suporte   | route1.mx.cloudflare.net     | 13       |
   | MX   | suporte   | route2.mx.cloudflare.net     | 22       |
   | MX   | suporte   | route3.mx.cloudflare.net     | 27       |

2. Adicione SPF (TXT):

   | Type | Name      | Content                                   |
   |------|-----------|-------------------------------------------|
   | TXT  | suporte   | `v=spf1 include:_spf.mx.cloudflare.net ~all` |

3. Cloudflare → Email Routing → **Settings** → **Custom address** vai precisar do domínio principal habilitado pra "ativar" o roteamento — o subdomínio entra automaticamente nos MX se eles apontam pra `*.mx.cloudflare.net`.

---

## Passo 3 — Criar o Email Worker

1. Cloudflare → **Workers & Pages** → **Create Worker**
2. Nome: `fluxo-inbound-email`
3. Cole o código:

```js
import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    try {
      const raw = await new Response(message.raw).arrayBuffer();
      const parser = new PostalMime();
      const parsed = await parser.parse(raw);

      const payload = {
        from: parsed.from?.address
          ? `${parsed.from.name ? `"${parsed.from.name}" ` : ''}<${parsed.from.address}>`
          : message.from,
        to: message.to,
        subject: parsed.subject ?? '(sem assunto)',
        text: parsed.text ?? '',
        html: parsed.html ?? '',
        messageId: parsed.messageId ?? message.headers.get('Message-ID') ?? null,
      };

      const res = await fetch(env.FLUXO_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fluxo-Secret': env.FLUXO_SECRET,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('Fluxo webhook returned', res.status, await res.text());
      }
    } catch (err) {
      console.error('Email worker error', err);
    }
  },
};
```

> **Dependência:** o worker importa `postal-mime` (parser MIME). Adicione no `package.json` do worker: `npm install postal-mime` antes do deploy. Se preferir um worker sem deps, dá pra mandar o raw `Buffer.from(await new Response(message.raw).arrayBuffer())` direto e parsear no Next com a lib `mailparser` — fica mais pesado no servidor.

4. **Settings** → **Variables**:
   - `FLUXO_WEBHOOK_URL` = `https://seudominio.fluxoapp.com.br/api/inbound/email` (produção)
   - `FLUXO_SECRET` = um secret aleatório forte (ex: `openssl rand -hex 32`)

5. **Triggers** → **Email Routing routes**: adicione **Catch-all** apontando pro worker `fluxo-inbound-email`

---

## Passo 4 — Variável de ambiente no Next

Adicione no `.env` (e no provider de produção: Vercel/Coolify/etc.):

```env
INBOUND_EMAIL_SECRET=mesmo-valor-do-worker
INBOUND_EMAIL_DOMAIN=suporte.fluxodigitaltech.com.br
```

Restart o app.

---

## Passo 5 — Teste end-to-end

1. Vá em `/admin/clientes/[id]` de um cliente de teste — copie o endereço inbound exibido no card "Receber chamados por email"
2. Mande um email pra esse endereço **a partir do email de um contato cadastrado** do cliente
3. Em ~5 segundos o ticket aparece em `/admin/chamados` com status NEW
4. Audit log registra `ticket.create` com metadata `source: inbound_email`

### Casos rejeitados (silenciosamente, sem bounce)

| Cenário | Comportamento |
|---|---|
| Email de remetente não cadastrado | Loga warn, retorna `{ ok: false, reason: 'unknown_sender' }` |
| Token inválido no `to:` | Loga warn, retorna `{ ok: false, reason: 'unknown_token' }` |
| Cliente suspenso/inativo | Mesma coisa que token inválido |

> **Por que rejeitar silencioso?** Evita spam ricochete. Se um bot manda email pra `chamados-x@suporte...`, a gente engole sem bouncing.

---

## Limites e considerações

- **Anexos:** V1 não suporta. Email com anexo cria o ticket com texto, mas o anexo é descartado. Próxima sprint: salvar em Cloudflare R2 + linkar no `TicketAttachment`.
- **HTML rich:** o service faz strip pra texto puro. Email-html-template-with-images vai virar texto cru.
- **Loop:** se um cliente final responde ao email automático que o Fluxo manda (notify), ele pode criar um ticket novo em vez de comentar no existente. Próxima sprint: detectar `In-Reply-To` e converter em mensagem.
- **DKIM/SPF:** Cloudflare Email Workers filtra spam básico. Pra produção séria, adicionar verificação de SPF no service.

---

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| Email não chega no worker | MX errado / SPF errado / domain Email Routing não ativado |
| Worker recebe mas Fluxo retorna 401 | Secret diferente entre worker e Next |
| Webhook 200 mas ticket não aparece | Contato não cadastrado, ou token errado — checar logs do Next |
| Worker retorna 503 | `INBOUND_EMAIL_SECRET` não setado no Next |
