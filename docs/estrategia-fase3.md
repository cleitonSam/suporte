# Fase 3 — Opportunity Solution Tree

Sessão rodada em 2026-05-19. Baseado no HMW da Fase 2.

---

## Outcome (objetivo de negócio)

> **Carlos para de receber ligações bravas porque 100% dos chamados aparecem registrados com SLA mostrável.**

Métrica de saída: redução de "chamados perdidos" reportados pelo Carlos de 10+/mês pra <1/mês em 90 dias após adoção.

---

## Árvore

```
OUTCOME: Carlos não perde chamado e prova SLA
│
├── OPP-1: Captura via WhatsApp (canal #1 do BR)
│   ├── S1.1: Integração oficial WhatsApp Business API (Meta/360dialog)
│   ├── S1.2: Bot via Evolution API / Z-API (não-oficial, mais barato)
│   └── S1.3: Forward manual: técnico aperta "criar ticket" no celular
│
├── OPP-2: Captura via email
│   ├── S2.1: Mailbox dedicada (suporte@msp.com.br) com IMAP polling
│   ├── S2.2: Forward de email pro Fluxo (forward+token@fluxo.app) [QUICK WIN]
│   └── S2.3: Plug-in Outlook/Gmail "abrir ticket"
│
└── OPP-3: SLA mostrável (pro cliente final do MSP)
    ├── S3.1: Dashboard SLA no portal do cliente (tempo real)
    ├── S3.2: Relatório mensal auto-enviado por email (PDF) [DIFERENCIAL COMERCIAL]
    └── S3.3: Widget público "selo SLA" pro site do MSP
```

---

## Análise Reach × Confidence × Effort (RCE)

| Solução | Reach (1-5) | Confidence (1-5) | Effort (1-5, menor=melhor) | Score = R×C/E |
|---|---|---|---|---|
| **S2.2** Forward email | 5 | 5 | 1 | **25** |
| **S3.1** Dashboard SLA tempo real | 5 | 4 | 2 | **10** |
| **S3.2** Relatório mensal PDF | 5 | 5 | 2 | **12.5** |
| **S1.2** Bot Evolution API | 5 | 3 | 3 | 5 |
| **S1.1** WhatsApp Business API oficial | 5 | 5 | 5 | 5 |
| S2.1 IMAP polling | 4 | 4 | 3 | 5.3 |
| S2.3 Plug-in Outlook | 2 | 3 | 4 | 1.5 |
| S1.3 Forward manual | 3 | 4 | 1 | 12 |
| S3.3 Selo SLA público | 2 | 3 | 2 | 3 |

Critérios:
- **Reach**: % dos MSPs no público-alvo que se beneficiam
- **Confidence**: confiança que a solução resolve a dor sem efeito colateral
- **Effort**: dias de dev (Cleiton solo)

---

## POC recomendado (semanas 1-3 da execução)

### Sprint POC: **"Captura + Prova"**

| # | Solução | Por quê | Effort |
|---|---|---|---|
| 1 | **S2.2 Forward email** | Quick win: tecnologia trivial (postal/imap), cobre 50%+ dos chamados que somem hoje. Carlos configura forward do email institucional pra `cliente-abc@fluxo.app` e pronto. | 3-5 dias |
| 2 | **S3.2 Relatório mensal PDF auto-enviado** | Diferencial comercial direto. Argumento de renovação. Carlos manda print e fecha contrato. | 4-6 dias |
| 3 | **S3.1 Dashboard SLA tempo real (versão admin)** | Já existe SlaBadge nos chamados; falta o painel agregado. Mostra pro Carlos quantos % estão OK. | 3-5 dias |
| 4 | **S1.3 Forward manual WhatsApp** | Versão covarde: técnico recebe no WhatsApp e clica num link `wa.me/fluxo?text=...` que abre o ticket pré-preenchido. Latrocínio. Quick win pré-WhatsApp API. | 2-3 dias |

**Total POC: ~12-19 dias de dev solo = 3 semanas.**

Bate com o que o Cleiton já vem entregando em ritmo (Phase 1 + 2 do log de commits mostram velocidade alta).

---

## O que fica pra DEPOIS do POC

| Solução | Quando entrar | Por quê adiar |
|---|---|---|
| S1.1 WhatsApp Business oficial | Q3 após POC | Compliance, conta business, custo Meta. Faz sentido depois de 10+ MSPs pagantes. |
| S1.2 Bot Evolution API | Q3 (paralelo a S1.1) | Risco de quebra (não-oficial). Pode virar tier intermediário. |
| S2.1 IMAP polling | Quando S2.2 não cobrir cliente que recusa forward | Mais complexo, mais frágil. Forward resolve 80%. |
| S3.3 Selo SLA público | Quando tiver 20+ MSPs ativos | Sem volume não vira social proof. |
| S2.3 Plug-in Outlook/Gmail | Talvez nunca | Reach baixo, effort alto. Forward mata 90% do problema. |

---

## Hipóteses a testar no POC

1. **H1:** Forward de email captura ≥50% dos chamados que hoje somem.
   *Como medir:* Beta com 3 MSPs por 30 dias. Pré-baseline (chamados perdidos/mês) → pós.

2. **H2:** Relatório mensal auto-enviado vira argumento de renovação em ≥30% dos casos.
   *Como medir:* Entrevista com clientes finais dos MSPs beta após receberem 2 relatórios.

3. **H3:** Dashboard SLA aumenta uso diário do Fluxo pelo Carlos.
   *Como medir:* DAU/MAU do dashboard vs DAU/MAU de outras telas. Heatmap.

---

## Próxima fase (4): Priorização + Roadmap

Com a OST + POC definidos, vou:
- Sequenciar os 4 itens do POC em ordem de risco (mais arriscado primeiro pra falhar barato)
- Definir releases (Sprint 1, 2, 3)
- Listar epics secundários (white-label, multi-tenant branding) pra Q2/Q3
- Tudo isso num roadmap de 3 horizontes (Now, Next, Later) em `docs/estrategia-fase4.md`
