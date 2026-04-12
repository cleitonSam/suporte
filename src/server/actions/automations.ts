'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';

/**
 * Cria uma nova regra de automação (ADMIN apenas)
 */
export async function createAutomationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { error: { form: ['Não autenticado'] } };
  }
  if (session.user.role !== 'ADMIN') {
    await audit({
      action: 'automation.create.forbidden',
      actorId: session.user.id,
    });
    return { error: { form: ['Acesso negado'] } };
  }

  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const trigger = formData.get('trigger') as string;
    const conditionsStr = formData.get('conditions') as string;
    const actionsStr = formData.get('actions') as string;

    if (!name?.trim()) {
      return { error: { name: ['Nome obrigatório'] } };
    }
    if (!trigger?.trim()) {
      return { error: { trigger: ['Trigger obrigatório'] } };
    }

    // Validar JSON
    let conditions = [];
    let actions = [];

    try {
      if (conditionsStr?.trim()) {
        conditions = JSON.parse(conditionsStr);
      }
    } catch {
      return { error: { conditions: ['JSON de condições inválido'] } };
    }

    try {
      if (actionsStr?.trim()) {
        actions = JSON.parse(actionsStr);
      }
    } catch {
      return { error: { actions: ['JSON de ações inválido'] } };
    }

    // Criar regra
    const rule = await db.automationRule.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        trigger: trigger.trim(),
        conditions: conditions,
        actions: actions,
        isActive: true,
      },
    });

    await audit({
      action: 'automation.create',
      actorId: session.user.id,
      entity: 'AutomationRule',
      entityId: rule.id,
      metadata: { name: rule.name, trigger: rule.trigger },
    });

    revalidatePath('/admin/automacoes');

    return {
      ok: true,
      ruleId: rule.id,
    };
  } catch (err) {
    logger.error({ err }, '[automations:create] erro');
    return { error: { form: ['Erro ao criar regra'] } };
  }
}

/**
 * Atualiza uma regra de automação (ADMIN apenas)
 */
export async function updateAutomationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { error: { form: ['Não autenticado'] } };
  }
  if (session.user.role !== 'ADMIN') {
    await audit({
      action: 'automation.update.forbidden',
      actorId: session.user.id,
    });
    return { error: { form: ['Acesso negado'] } };
  }

  try {
    const ruleId = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const trigger = formData.get('trigger') as string;
    const conditionsStr = formData.get('conditions') as string;
    const actionsStr = formData.get('actions') as string;

    if (!ruleId) {
      return { error: { form: ['ID da regra obrigatório'] } };
    }

    if (!name?.trim()) {
      return { error: { name: ['Nome obrigatório'] } };
    }
    if (!trigger?.trim()) {
      return { error: { trigger: ['Trigger obrigatório'] } };
    }

    // Validar JSON
    let conditions = [];
    let actions = [];

    try {
      if (conditionsStr?.trim()) {
        conditions = JSON.parse(conditionsStr);
      }
    } catch {
      return { error: { conditions: ['JSON de condições inválido'] } };
    }

    try {
      if (actionsStr?.trim()) {
        actions = JSON.parse(actionsStr);
      }
    } catch {
      return { error: { actions: ['JSON de ações inválido'] } };
    }

    const rule = await db.automationRule.update({
      where: { id: ruleId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        trigger: trigger.trim(),
        conditions: conditions,
        actions: actions,
      },
    });

    await audit({
      action: 'automation.update',
      actorId: session.user.id,
      entity: 'AutomationRule',
      entityId: rule.id,
      metadata: { name: rule.name, trigger: rule.trigger },
    });

    revalidatePath('/admin/automacoes');

    return { ok: true };
  } catch (err) {
    logger.error({ err }, '[automations:update] erro');
    return { error: { form: ['Erro ao atualizar regra'] } };
  }
}

/**
 * Deleta uma regra de automação (ADMIN apenas)
 */
export async function deleteAutomationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { error: { form: ['Não autenticado'] } };
  }
  if (session.user.role !== 'ADMIN') {
    await audit({
      action: 'automation.delete.forbidden',
      actorId: session.user.id,
    });
    return { error: { form: ['Acesso negado'] } };
  }

  try {
    const ruleId = formData.get('id') as string;

    if (!ruleId) {
      return { error: { form: ['ID da regra obrigatório'] } };
    }

    const rule = await db.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) {
      return { error: { form: ['Regra não encontrada'] } };
    }

    await db.automationRule.delete({
      where: { id: ruleId },
    });

    await audit({
      action: 'automation.delete',
      actorId: session.user.id,
      entity: 'AutomationRule',
      entityId: ruleId,
      metadata: { name: rule.name, trigger: rule.trigger },
    });

    revalidatePath('/admin/automacoes');

    return { ok: true };
  } catch (err) {
    logger.error({ err }, '[automations:delete] erro');
    return { error: { form: ['Erro ao deletar regra'] } };
  }
}

/**
 * Ativa/desativa uma regra de automação (ADMIN apenas)
 */
export async function toggleAutomationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { error: { form: ['Não autenticado'] } };
  }
  if (session.user.role !== 'ADMIN') {
    await audit({
      action: 'automation.toggle.forbidden',
      actorId: session.user.id,
    });
    return { error: { form: ['Acesso negado'] } };
  }

  try {
    const ruleId = formData.get('id') as string;

    if (!ruleId) {
      return { error: { form: ['ID da regra obrigatório'] } };
    }

    const rule = await db.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) {
      return { error: { form: ['Regra não encontrada'] } };
    }

    const updated = await db.automationRule.update({
      where: { id: ruleId },
      data: { isActive: !rule.isActive },
    });

    await audit({
      action: 'automation.toggle',
      actorId: session.user.id,
      entity: 'AutomationRule',
      entityId: ruleId,
      metadata: { name: rule.name, isActive: updated.isActive },
    });

    revalidatePath('/admin/automacoes');

    return { ok: true, isActive: updated.isActive };
  } catch (err) {
    logger.error({ err }, '[automations:toggle] erro');
    return { error: { form: ['Erro ao alternar regra'] } };
  }
}
