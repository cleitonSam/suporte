#!/usr/bin/env node
// Script de teste: simula o Cloudflare Email Worker chamando o webhook /api/inbound/email
// Uso: node scripts/test-inbound-email.mjs

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const SECRET = process.env.INBOUND_EMAIL_SECRET ?? 'dev-secret-trocar-em-prod-9f2c8e1a4b6d';
const WEBHOOK = process.env.WEBHOOK_URL ?? 'http://localhost:3001/api/inbound/email';
const DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'suporte.fluxodigitaltech.com.br';

async function main() {
  // Pega um cliente ACTIVE com inboundToken + 1 contato cadastrado
  const client = await db.client.findFirst({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      inboundToken: { not: null },
      users: {
        some: { userType: 'CLIENT_CONTACT', isActive: true, deletedAt: null },
      },
    },
    include: {
      users: {
        where: { userType: 'CLIENT_CONTACT', isActive: true, deletedAt: null },
        take: 1,
      },
    },
  });

  if (!client) {
    console.error('❌ Nenhum cliente ACTIVE com inboundToken + contato encontrado.');
    console.error('   Vá em /admin/clientes, crie um cliente, cadastre um contato.');
    process.exit(1);
  }

  const contact = client.users[0];
  const toAddress = `chamados-${client.inboundToken}@${DOMAIN}`;
  const fromAddress = `"${contact.name}" <${contact.email}>`;

  const payload = {
    from: fromAddress,
    to: toAddress,
    subject: 'Internet caiu no escritório',
    text: 'Boa tarde,\n\nA internet aqui no escritório caiu hoje umas 14h. Já reiniciei o roteador 2x. Conseguem dar uma olhada?\n\nObrigado.',
    html: '<p>Boa tarde,</p><p>A internet aqui no escritório caiu hoje umas 14h. Já reiniciei o roteador 2x. Conseguem dar uma olhada?</p><p>Obrigado.</p>',
    messageId: `<test-${Date.now()}@local>`,
  };

  console.log('📧 Simulando email inbound:');
  console.log(`   De:       ${fromAddress}`);
  console.log(`   Pra:      ${toAddress}`);
  console.log(`   Cliente:  ${client.name} (${client.id})`);
  console.log(`   Contato:  ${contact.name} (${contact.email})`);
  console.log(`   Assunto:  ${payload.subject}`);
  console.log('');

  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Fluxo-Secret': SECRET,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));

  console.log(`📨 HTTP ${res.status}`);
  console.log(`   ${JSON.stringify(body, null, 2)}`);

  if (res.ok && body.ok) {
    console.log('');
    console.log(`✅ Ticket #${body.ticketNumber} criado!`);
    console.log(`   http://localhost:3001/admin/chamados/${body.ticketId}`);
  } else {
    console.log('');
    console.log(`⚠️  Não criou ticket (motivo: ${body.reason ?? 'erro'}).`);
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error('💥', err);
  await db.$disconnect();
  process.exit(1);
});
