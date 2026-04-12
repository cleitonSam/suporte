// Script de diagnóstico SMTP da Fluxo Suporte
// Uso: npm run test:smtp [email-destino-opcional]
// Lê as variáveis do .env e tenta conectar + enviar um email de teste
// para o endereço fornecido (ou para o próprio SMTP_USER).

import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';

// Carrega .env manualmente (sem depender do pacote dotenv)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('[test-smtp] Arquivo .env nao encontrado em', envPath);
    return;
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Remove aspas envolventes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnv();

const destino = process.argv[2] || process.env.SMTP_USER;

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  TESTE SMTP — Fluxo Suporte');
  console.log('═══════════════════════════════════════');
  console.log('HOST     :', process.env.SMTP_HOST ?? 'smtp.hostinger.com');
  console.log('PORT     :', process.env.SMTP_PORT ?? 587);
  console.log('USER     :', process.env.SMTP_USER ?? '(não definido)');
  console.log('FROM     :', process.env.SMTP_FROM ?? '(usando USER)');
  console.log('PASSWORD :', process.env.SMTP_PASSWORD ? `✓ definida (${process.env.SMTP_PASSWORD.length} chars)` : '✗ NÃO definida');
  console.log('DESTINO  :', destino);
  console.log('───────────────────────────────────────');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('✗ SMTP_USER ou SMTP_PASSWORD ausentes no .env — interrompendo.');
    process.exit(1);
  }

  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    console.log('➡ Verificando credenciais...');
    await t.verify();
    console.log('✓ Credenciais OK (servidor aceitou autenticação)');
  } catch (e: any) {
    console.error('✗ Falha no verify():');
    console.error('  code         :', e?.code);
    console.error('  responseCode :', e?.responseCode);
    console.error('  response     :', e?.response);
    console.error('  message      :', e?.message);
    process.exit(2);
  }

  try {
    console.log(`➡ Enviando email de teste para ${destino}...`);
    const info = await t.sendMail({
      from: process.env.SMTP_FROM ?? `Fluxo Suporte <${process.env.SMTP_USER}>`,
      to: destino!,
      subject: 'TESTE Fluxo Suporte — ' + new Date().toLocaleString('pt-BR'),
      html: `
        <div style="font-family:Poppins,Arial,sans-serif;max-width:500px;margin:auto">
          <div style="background:linear-gradient(135deg,#0066FF 0%,#00F2FE 100%);padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">Fluxo Suporte · Teste SMTP</h2>
          </div>
          <div style="padding:20px;background:#f8fafc;border-radius:0 0 8px 8px">
            <p>Se você está vendo este email, o envio pelo nodemailer + Hostinger está <strong>funcionando</strong>.</p>
            <p>Horário do envio: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      `,
    });
    console.log('✓ Email enviado!');
    console.log('  messageId :', info.messageId);
    console.log('  response  :', info.response);
    console.log('  accepted  :', info.accepted);
    console.log('  rejected  :', info.rejected);
    console.log('───────────────────────────────────────');
    console.log('✓ Diagnóstico OK. Confira a caixa de entrada (e spam) de', destino);
  } catch (e: any) {
    console.error('✗ Falha no sendMail:');
    console.error('  code         :', e?.code);
    console.error('  responseCode :', e?.responseCode);
    console.error('  response     :', e?.response);
    console.error('  message      :', e?.message);
    process.exit(3);
  }
}

main().catch((e) => {
  console.error('✗ Erro inesperado:', e);
  process.exit(99);
});
