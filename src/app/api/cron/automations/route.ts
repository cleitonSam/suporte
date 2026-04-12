import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { runAutomations } from '@/lib/automation-engine';

// Executa regras de automação com trigger "cron.hourly"
// Agendar a cada hora

async function handle(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    // Buscar todas as regras ativas com trigger "cron.hourly"
    const rules = await db.automationRule.findMany({
      where: { trigger: 'cron.hourly', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    logger.info({ ruleCount: rules.length }, '[cron:automations] iniciando execução');

    if (rules.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, rules: 0 });
    }

    let processedCount = 0;

    // Para cada regra, encontrar tickets que correspondem às condições
    for (const rule of rules) {
      try {
        const conditions = typeof rule.conditions === 'string'
          ? JSON.parse(rule.conditions || '[]')
          : Array.isArray(rule.conditions) ? rule.conditions : [];

        // Se nenhuma condição, aplicar a todas as tickets ativas
        let ticketQuery: any = {
          where: {
            deletedAt: null,
            status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'REOPENED'] },
          },
          select: { id: true },
          take: 500,
        };

        // Se houver condições específicas baseadas em status, prioridade ou SLA,
        // filtrá-las aqui para performance
        const statusConditions = conditions.filter((c: any) => c.field === 'status');
        const slaConditions = conditions.filter((c: any) => c.field === 'slaBreached');
        const priorityConditions = conditions.filter((c: any) => c.field === 'priority');

        if (statusConditions.length > 0) {
          const statusValues = statusConditions
            .filter((c: any) => c.op === 'eq')
            .map((c: any) => c.value);
          if (statusValues.length > 0) {
            ticketQuery.where.status = { in: statusValues };
          }
        }

        if (slaConditions.length > 0) {
          const slaBreachedConds = slaConditions.filter((c: any) => c.op === 'eq');
          if (slaBreachedConds.length > 0) {
            ticketQuery.where.slaBreached = slaBreachedConds[0].value === true;
          }
        }

        if (priorityConditions.length > 0) {
          const priorityValues = priorityConditions
            .filter((c: any) => c.op === 'eq')
            .map((c: any) => c.value);
          if (priorityValues.length > 0) {
            ticketQuery.where.priority = { in: priorityValues };
          }
        }

        // Buscar tickets
        const tickets = await db.ticket.findMany(ticketQuery);

        logger.debug(
          { ruleId: rule.id, ruleName: rule.name, ticketCount: tickets.length },
          '[cron:automations] processando regra',
        );

        // Executar a regra para cada ticket
        for (const ticket of tickets) {
          await runAutomations('cron.hourly', ticket.id);
          processedCount++;
        }

        // Atualizar timestamp da última execução
        await db.automationRule.update({
          where: { id: rule.id },
          data: { lastRunAt: new Date() },
        });
      } catch (err) {
        logger.error(
          { err, ruleId: rule.id, ruleName: rule.name },
          '[cron:automations] erro ao processar regra',
        );
      }
    }

    logger.info(
      { rules: rules.length, processed: processedCount },
      '[cron:automations] conclusão',
    );

    return NextResponse.json({
      ok: true,
      rules: rules.length,
      processed: processedCount,
    });
  } catch (err) {
    logger.error({ err }, '[cron:automations] erro crítico');
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
