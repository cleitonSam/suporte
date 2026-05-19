# Fase 1 — Positioning + Persona + JTBD

Sessão rodada em 2026-05-19 com Cleiton (founder). Resultado da entrevista guiada de 8 perguntas.

---

## Positioning statement (template Geoffrey Moore)

> **Para** donos de MSPs pequenos (2-10 técnicos) no Brasil que atendem PMEs com 10-50 colaboradores e estão perdendo chamados entre WhatsApp, email e a cabeça do técnico,
> **o Fluxo Suporte é** um helpdesk em português especializado em MSP
> **que** dá ao cliente final um portal pra abrir e acompanhar chamado sozinho, reduzindo o ruído operacional do MSP em 30-50%.
>
> **Diferente de** Movidesk, Freshdesk ou ficar no WhatsApp+planilha,
> **o Fluxo cobra mensalidade fixa por MSP** (sem cobrança por agente), **fala português direito**, **vem com CNPJ/SLA/auditoria de série** e **foi desenhado pro fluxo de quem atende vários contratos** — não pra TI interna de uma única empresa.

---

## Proto-persona principal: "Carlos, dono do MSP"

| | |
|---|---|
| Idade | ~38 anos |
| Empresa | MSP com 5-8 técnicos, ~20-40 contratos ativos de PMEs (contabilidade, distribuidora, advogados, varejo) |
| Onde fica | SP, MG ou RS (capital ou cidade média) |
| Histórico | Era técnico, virou dono, saiu da operação há ~2 anos |
| Dia-a-dia | Vende contratos novos, cobra inadimplência, escala briga com cliente, olha relatório quando tem |
| Não testa software ele mesmo | Delega pro coordenador técnico, mas decide pela conta |

### O que pra ele importa de verdade

- **Pra o cliente final dele**: relatório mensal (X chamados, Y SLA OK, Z tempo médio) — virou argumento de renovação
- **Pra ele**: parar de ser pomboco entre cliente e técnico
- **Pra o time**: ferramenta que o técnico realmente usa (não abandona em 2 semanas)

### Como ele compra

- Indicação de outro dono de MSP (canal #1)
- Grupos de WhatsApp / fórums brasileiros de TI
- Eventos pequenos do setor
- **Não** compra por: cold email gringo, anúncio Google, gated demo de 30 dias

---

## Job-to-be-Done (formato Christensen)

> **Quando** um cliente final cobra status de um chamado ou questiona se eu cumpri SLA,
> **eu quero** ter um lugar único que ele e meu técnico veem com SLA visível + histórico completo + evidência do que foi feito,
> **pra eu poder** parar de servir de pombo-correio, cumprir o SLA que vendi no contrato e ter argumento pra renovar/aumentar.

JTBDs secundários:
- *Quando começo um novo contrato*, quero importar inventário e abrir chamados desde o dia 1, pra mostrar valor rápido.
- *Quando termino o mês*, quero mandar relatório bonito pro cliente sem montar à mão, pra reduzir hora administrativa.
- *Quando contrato um técnico júnior*, quero que ele veja histórico antes de bater no cliente, pra não reabrir trabalho.

---

## Cliente final (do MSP)

- PME 10-50 colaboradores genérica (contabilidade, advocacia, distribuidora, varejo)
- Sem TI interno
- SLA frouxo em horas, não minutos
- Quer ser ouvido, ver status, e receber relatório de vez em quando

---

## Pricing posture (hipótese)

- **Faixa-alvo: R$ 50-150/mês flat por MSP** (não por agente)
- Compete com:
  - WhatsApp+planilha (custo R$ 0 + dor de organização)
  - GLPI auto-hospedado (custo R$ 0 + dor de manutenção/UI)
  - Movidesk a R$ 49-89/agente (escala feio pra MSP de 5+)
- Implicação: margem por cliente é baixa → precisa de **muito self-service**, churn baixo, expansão por features avançadas (white-label, API)

---

## Aspiração 12 meses (norte estratégico)

**Cenário-alvo: ser desejável pra aquisição ou virar white-label de distribuidor.**

Implicações:
- Não é jogo de "1000 clientes pagantes". É jogo de **validar tese + métricas mostráveis + código mantível**.
- O que importa pra adquirente: traction (50-100 MSPs ativos basta), retention boa, CSAT alto, código com testes, mercado segmentado e claro.
- White-label / multi-tenancy / branding por MSP fica **prioritário** no roadmap.

---

## Diferencial #1 (validado nesta sessão)

**Portal do cliente onde o cliente final abre/acompanha sozinho.** Reduz ruído operacional do MSP em 30-50%. Já existe no produto.

---

## Decisão de continuidade

**Fase 1 concluída na base de hipóteses do founder.** Antes de passar à Fase 2 (Problem Framing) com confiança, recomendado:

- Validar persona "Carlos" com 3-5 entrevistas de donos de MSP reais (1h cada)
- Confirmar disposição-a-pagar com 3 propostas/pricing tests
- Listar 5 concorrentes diretos no Brasil (Movidesk, Tomticket, Desk Manager, Octadesk, +1) e comparar feature-a-feature

Se Cleiton optar por **pular validação** e usar essas hipóteses, levanta o risco e prossegue pra Fase 2. Documentado aqui pra revisitar quando tiver dados.
