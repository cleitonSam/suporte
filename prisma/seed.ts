import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seed iniciado...');

  // --- Categorias de chamado ---
  const ticketCategories = [
    { name: 'Hardware', slug: 'hardware', color: '#f97316', sortOrder: 1 },
    { name: 'Software', slug: 'software', color: '#3b82f6', sortOrder: 2 },
    { name: 'Rede', slug: 'rede', color: '#22c55e', sortOrder: 3 },
    { name: 'Email', slug: 'email', color: '#eab308', sortOrder: 4 },
    { name: 'Acesso', slug: 'acesso', color: '#a855f7', sortOrder: 5 },
    { name: 'Outro', slug: 'outro', color: '#64748b', sortOrder: 99 },
  ];
  for (const c of ticketCategories) {
    await db.ticketCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: c,
    });
  }
  console.log(`  ✓ ${ticketCategories.length} categorias de chamado`);

  // --- Categorias de equipamento ---
  const equipCats = [
    { name: 'CPU / Desktop', slug: 'cpu', sortOrder: 1 },
    { name: 'Notebook', slug: 'notebook', sortOrder: 2 },
    { name: 'Monitor', slug: 'monitor', sortOrder: 3 },
    { name: 'Impressora', slug: 'impressora', sortOrder: 4 },
    { name: 'Servidor', slug: 'servidor', sortOrder: 5 },
    { name: 'Switch', slug: 'switch', sortOrder: 6 },
    { name: 'Roteador', slug: 'roteador', sortOrder: 7 },
    { name: 'No-break', slug: 'nobreak', sortOrder: 8 },
    { name: 'Telefone IP', slug: 'telefone-ip', sortOrder: 9 },
    { name: 'Outro', slug: 'outro', sortOrder: 99 },
  ];
  for (const c of equipCats) {
    await db.equipmentCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: c,
    });
  }
  console.log(`  ✓ ${equipCats.length} categorias de equipamento`);

  // --- Fila "Geral" ---
  const geral = await db.queue.upsert({
    where: { name: 'Geral' },
    create: {
      name: 'Geral',
      description: 'Fila padrão — todos os chamados novos entram aqui',
      color: '#3b82f6',
      sortOrder: 1,
    },
    update: {},
  });
  console.log(`  ✓ Fila "Geral" pronta`);

  // --- Admin inicial ---
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL ?? 'admin@fluxodigitaltech.com.br';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminName = process.env.INITIAL_ADMIN_NAME ?? 'Administrador Fluxo';

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      name: adminName,
      userType: 'AGENT',
      role: 'ADMIN',
    },
    update: {},
  });

  // Coloca admin na fila Geral
  await db.queueMember.upsert({
    where: { queueId_userId: { queueId: geral.id, userId: admin.id } },
    create: { queueId: geral.id, userId: admin.id },
    update: {},
  });
  console.log(`  ✓ Admin: ${adminEmail}`);

  console.log('✅ Seed concluído.');
  console.log(`\n   Login: ${adminEmail}`);
  console.log(`   Senha: ${adminPassword}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
