# Fase 2 — Problem Framing + Problem Statement

Sessão rodada em 2026-05-19. Hipóteses de founder (não validadas com clientes externos).

---

## Problem Statement

> **Carlos** (dono de MSP pequeno) é interrompido **10+ vezes por mês** por clientes ligando bravos cobrando chamados que sumiram entre WhatsApp do técnico, email do escritório e a cabeça de quem atendeu primeiro.
>
> Isso acontece porque **a captura de chamados é informal** — técnico recebe pelo canal pessoal dele, abre na boa-vontade, esquece de registrar, e quando o cliente cobra ninguém tem como provar o que foi feito (ou não feito).
>
> O custo NÃO é só tempo perdido: é **erosão de credibilidade** ("vocês não anotam nada?"), **perda de contrato** quando o cliente acumula 3-4 esquecimentos e cancela, e **falta de munição** pra renovar contrato no fim do ano ("provem que cumpriram SLA").
>
> Carlos sabe que resolveu quando: **100% dos chamados aparecem num dashboard de SLA mostrável pro cliente final** — vira argumento de retenção em vez de motivo de briga.

---

## Estrutura Problem Framing Canvas

| Dimensão | Resposta |
|---|---|
| **Who suffers** | Carlos (dono MSP, saiu da operação) + cliente final do MSP |
| **What's the problem** | Chamados se perdem entre canais informais; sem registro nem SLA visível |
| **When does it happen** | Gatilho: cliente liga bravo cobrando. Frequência: 10+ por mês |
| **Why does it matter** | Perde credibilidade, perde contrato, sem prova pra renovar |
| **Where** | WhatsApp pessoal do técnico, email do escritório, telefone do dono |
| **Current solution** | WhatsApp Business + planilha + memória do time |
| **Why it fails** | Não força registro, não mostra SLA, não tem histórico mostrável |
| **Success metric** | 100% dos chamados com SLA registrado + dashboard pro cliente final |

---

## How Might We (a pergunta-chave)

> **Como podemos fazer com que TODO chamado — entre por WhatsApp, email, telefone ou portal — seja registrado automaticamente com SLA, sem depender do técnico lembrar?**

Esta é a pergunta acionável que guia a Fase 3 (Solution Exploration).

Subperguntas relacionadas:
- Como capturar chamado que entra por WhatsApp do técnico (canal #1)?
- Como capturar chamado por email institucional automaticamente?
- Como o Carlos *enxerga* o status de SLA em tempo real sem abrir 40 chamados?
- Como o cliente final *vê* prova de SLA sem precisar pedir relatório?

---

## Implicação produto (consequência direta do HMW)

Olhando o Fluxo Suporte hoje:

| Capacidade | Status atual | Importância pela tese |
|---|---|---|
| Portal do cliente (cliente abre direto) | ✅ Existe | **Crítico** — diferencial #1 |
| Dashboard de SLA com prova mostrável | ✅ Parcial (SLA badge, mas sem dashboard exec) | **Crítico** — métrica de sucesso de Carlos |
| Captura via email (forward → ticket) | ❌ Não tem | **Crítico se HMW** |
| Captura via WhatsApp (canal #1 do mercado) | ❌ Não tem | **Crítico se HMW** |
| Relatório mensal automático pro cliente final | ❌ Não tem (relatórios existem mas não auto-enviados) | **Alto** — argumento comercial direto |
| Inventário + chamado linkado | ✅ Existe | Médio — diferencial secundário |
| Macros, automation, KB | ✅ Existe | Médio — produtividade interna |

**Conclusão estratégica:**
A tese do produto é "tudo num lugar com SLA registrado". Mas o produto hoje **só captura o que entra pelo portal**. Se Carlos continua perdendo chamado no WhatsApp do técnico, o Fluxo não resolve a dor #1.

**Gap #1 do roadmap: integrações de canal (email-to-ticket e WhatsApp Business API).** Sem isso, o positioning não se sustenta — Fluxo vira "mais uma ferramenta", não "a solução".

---

## Decisão de continuidade

Fase 2 fechada com 1 HMW principal + 4 subperguntas + 1 gap claro de produto.

**Próxima fase (3): Solution Exploration.** Vou gerar uma Opportunity Solution Tree em cima desse HMW — 3 opportunities + 3 solutions cada, priorizando POC.
