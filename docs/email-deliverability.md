# Guia de Deliverability de E-mail — Fluxo Suporte

Este guia descreve as configurações de DNS necessárias para que os e-mails
transacionais do Fluxo Suporte (convites, notificações, reset de senha) sejam
entregues corretamente e não caiam em spam.

## Pré-requisitos

- Domínio próprio configurado (ex: `fluxodigital.com.br`)
- Acesso ao painel DNS do domínio (Cloudflare, Route53, Registro.br, etc.)
- Provedor SMTP configurado em `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`

## 1. SPF (Sender Policy Framework)

O SPF diz aos servidores de e-mail quais IPs estão autorizados a enviar em nome
do seu domínio.

Adicione um registro **TXT** na raiz do domínio:

```
Tipo:  TXT
Nome:  @
Valor: v=spf1 include:_spf.google.com include:amazonses.com ~all
```

Ajuste os `include:` de acordo com o provedor SMTP usado:

| Provedor       | Include                          |
|----------------|----------------------------------|
| Google / Gmail | `include:_spf.google.com`        |
| Amazon SES     | `include:amazonses.com`          |
| SendGrid       | `include:sendgrid.net`           |
| Mailgun        | `include:mailgun.org`            |
| Resend         | `include:_spf.resend.com`        |
| Brevo (Sendinblue) | `include:sendinblue.com`     |

> **Importante:** Use apenas um registro SPF por domínio. Combine tudo em uma
> única linha TXT.

## 2. DKIM (DomainKeys Identified Mail)

O DKIM assina digitalmente cada e-mail para provar que o conteúdo não foi
alterado em trânsito.

A configuração depende do provedor SMTP. Em geral, eles fornecem um par de
registros CNAME ou TXT para adicionar no DNS.

Exemplo para Amazon SES:

```
Tipo:  CNAME
Nome:  <selector>._domainkey.fluxodigital.com.br
Valor: <selector>.dkim.amazonses.com
```

Repita para cada seletor fornecido (geralmente 3 registros).

Para verificar:

```bash
dig TXT <selector>._domainkey.fluxodigital.com.br
```

## 3. DMARC (Domain-based Message Authentication, Reporting & Conformance)

O DMARC instrui servidores receptores sobre o que fazer quando SPF ou DKIM
falham, e para onde enviar relatórios.

Adicione um registro **TXT**:

```
Tipo:  TXT
Nome:  _dmarc
Valor: v=DMARC1; p=quarantine; rua=mailto:dmarc@fluxodigital.com.br; pct=100; adkim=r; aspf=r
```

Políticas possíveis:

| Valor      | Comportamento                       |
|------------|-------------------------------------|
| `p=none`   | Só monitora, não rejeita nada       |
| `p=quarantine` | Envia para spam se falhar       |
| `p=reject` | Rejeita completamente se falhar     |

Recomendação: comece com `p=none` por 2 semanas para coletar relatórios, depois
mude para `quarantine` e, finalmente, `reject`.

## 4. Reverse DNS (PTR)

Se o SMTP roda em IP próprio (não SaaS), configure o registro PTR no provedor de
infraestrutura para que o IP resolva de volta para o domínio.

## 5. Variáveis de ambiente

```env
# .env
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxx
SMTP_FROM="Fluxo Suporte <suporte@fluxodigital.com.br>"
```

## 6. Teste

Ferramentas para validar a configuração:

- [mail-tester.com](https://www.mail-tester.com/) — envie um e-mail para o
  endereço gerado e veja a pontuação (objetivo: 10/10)
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) — verifica SPF, DKIM,
  DMARC, blacklists
- `dig TXT fluxodigital.com.br` — verifica SPF no terminal
- `dig TXT _dmarc.fluxodigital.com.br` — verifica DMARC

## 7. Checklist

- [ ] Registro SPF adicionado com `include:` do provedor
- [ ] Registros DKIM configurados (CNAME ou TXT)
- [ ] Registro DMARC adicionado (`_dmarc`)
- [ ] E-mail de teste pontuando 9+ no mail-tester.com
- [ ] Variáveis SMTP configuradas no `.env` de produção
- [ ] Verificado que e-mails não caem em spam (testar Gmail, Outlook, Yahoo)
