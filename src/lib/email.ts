import nodemailer from 'nodemailer';

// Transporter singleton
let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.hostinger.com',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }
  return _transporter;
}

const FROM = process.env.SMTP_FROM ?? 'Fluxo Suporte <ti@fluxodigitaltech.com.br>';
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

// ─────────────────────────────────────────────
// Templates HTML base
// ─────────────────────────────────────────────
function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:'Poppins','Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;color:#0f172a}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 14px rgba(0,102,255,0.08)}
  .header{background:linear-gradient(135deg,#0066FF 0%,#0052CC 60%,#00F2FE 200%);padding:28px 32px;position:relative}
  .header h1{color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.01em}
  .header p{color:#CCE0FF;margin:6px 0 0;font-size:13px;font-weight:500}
  .brand{display:inline-block;padding:4px 10px;background:rgba(255,255,255,0.15);border:1px solid rgba(0,242,254,0.35);border-radius:99px;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#00F2FE;margin-bottom:10px}
  .body{padding:32px}
  .body p{color:#374151;font-size:14px;line-height:1.65;margin:0 0 16px}
  .body strong{color:#0f172a}
  .box{background:#f1f5f9;border-left:3px solid #0066FF;border-radius:6px;padding:16px 20px;margin:20px 0}
  .box p{margin:4px 0;font-size:13px;color:#374151}
  .box strong{color:#0A1F3D}
  .box a{color:#0066FF;text-decoration:none;font-weight:500}
  .btn{display:inline-block;background:#0066FF;color:#fff !important;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:14px;font-weight:600;margin:8px 0;box-shadow:0 4px 14px rgba(0,102,255,0.3)}
  .btn:hover{background:#0052CC}
  .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600}
  .badge-new{background:#E6F0FF;color:#003D99}
  .badge-progress{background:#fef3c7;color:#92400e}
  .badge-resolved{background:#d1fae5;color:#065f46}
  .badge-urgent{background:#fee2e2;color:#991b1b}
  .badge-high{background:#ffedd5;color:#9a3412}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:22px 32px;text-align:center}
  .footer p{color:#64748b;font-size:11px;margin:2px 0;letter-spacing:0.01em}
  .footer .fluxo-mark{display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#0066FF;margin-bottom:6px}
</style>
</head>
<body><div class="wrap">${content}
<div class="footer">
  <p class="fluxo-mark">Fluxo Digital Tech</p>
  <p>ti@fluxodigitaltech.com.br · Suporte técnico especializado</p>
  <p style="margin-top:8px;color:#94a3b8">Este é um email automático do sistema de chamados.</p>
</div></div></body>
</html>`;
}

// ─────────────────────────────────────────────
// Envio genérico (para uso por módulos como CSAT)
// ─────────────────────────────────────────────
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const info = await getTransporter().sendMail({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return !(info.rejected && info.rejected.length > 0);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// 1. Convite de novo contato (link de primeiro acesso)
// Em vez de enviar senha em texto plano, mandamos um link assinado
// que dá ao usuário a chance de definir a própria senha.
// ─────────────────────────────────────────────
export async function sendInviteEmail(params: {
  to: string;
  name: string;
  clientName: string;
  /** Token claro gerado via createPasswordToken(userId, 'invite') */
  token: string;
}) {
  const link = `${APP_URL}/primeiro-acesso/${encodeURIComponent(params.token)}`;

  const html = layout(`
    <div class="header">
      <h1>Bem-vindo ao Fluxo Suporte</h1>
      <p>Seu acesso ao portal de chamados</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${params.name}</strong>!</p>
      <p>Criamos sua conta no portal de suporte da <strong>Fluxo Digital Tech</strong> para a empresa <strong>${params.clientName}</strong>.</p>
      <p>Clique no botão abaixo para definir a sua senha e ativar o acesso:</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" class="btn">Definir minha senha</a>
      </p>
      <div class="box">
        <p><strong>🌐 Portal:</strong> <a href="${APP_URL}/login">${APP_URL}/login</a></p>
        <p><strong>📧 Seu login:</strong> ${params.to}</p>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#64748b">Este link é pessoal e expira em 48 horas. Se você não reconhece este convite, pode ignorar este email.</p>
    </div>
  `);

  return send({
    to: `${params.name} <${params.to}>`,
    subject: 'Bem-vindo ao portal Fluxo Suporte — defina sua senha',
    html,
  });
}

// ─────────────────────────────────────────────
// 1b. Reset de senha (link)
// ─────────────────────────────────────────────
export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  token: string;
}) {
  const link = `${APP_URL}/primeiro-acesso/${encodeURIComponent(params.token)}`;
  const html = layout(`
    <div class="header">
      <h1>Redefinir senha</h1>
      <p>Fluxo Suporte</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${params.name}</strong>!</p>
      <p>Recebemos um pedido de redefinição de senha para sua conta. Clique no botão abaixo para criar uma nova:</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" class="btn">Redefinir senha</a>
      </p>
      <p style="margin-top:24px;font-size:12px;color:#64748b">
        Se não foi você, ignore este email — sua senha atual permanece válida. O link expira em 1 hora.
      </p>
    </div>
  `);

  return send({
    to: params.to,
    subject: 'Redefinir senha — Fluxo Suporte',
    html,
  });
}

// ─────────────────────────────────────────────
// 2. Confirmação de chamado aberto (para o cliente)
// ─────────────────────────────────────────────
export async function sendTicketCreatedEmail(params: {
  to: string;
  name: string;
  ticketNumber: string;
  ticketId: string;
  title: string;
  priority: string;
}) {
  const priorityLabel: Record<string, string> = {
    LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
  };
  const priorityBadge: Record<string, string> = {
    LOW: 'badge-new', MEDIUM: 'badge-new', HIGH: 'badge-high', URGENT: 'badge-urgent',
  };

  const html = layout(`
    <div class="header">
      <h1>Chamado aberto com sucesso</h1>
      <p>${params.ticketNumber}</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${params.name}</strong>!</p>
      <p>Recebemos seu chamado e nossa equipe iniciará o atendimento em breve.</p>
      <div class="box">
        <p><strong>Número:</strong> ${params.ticketNumber}</p>
        <p><strong>Assunto:</strong> ${params.title}</p>
        <p><strong>Prioridade:</strong>
          <span class="badge ${priorityBadge[params.priority] ?? 'badge-new'}">
            ${priorityLabel[params.priority] ?? params.priority}
          </span>
        </p>
      </div>
      <p>Você pode acompanhar o andamento e responder pelo portal:</p>
      <a href="${APP_URL}/portal/chamado/${params.ticketId}" class="btn">Ver chamado</a>
    </div>
    
  `);

  return send({
    to: params.to,
    subject: `[${params.ticketNumber}] Chamado recebido: ${params.title}`,
    html,
  });
}

// ─────────────────────────────────────────────
// 3. Nova resposta do agente (para o cliente)
// ─────────────────────────────────────────────
export async function sendNewReplyToClientEmail(params: {
  to: string;
  clientName: string;
  ticketNumber: string;
  ticketId: string;
  ticketTitle: string;
  agentName: string;
  messagePreview: string;
}) {
  const preview = params.messagePreview.length > 300
    ? params.messagePreview.slice(0, 300) + '...'
    : params.messagePreview;

  const html = layout(`
    <div class="header">
      <h1>Você tem uma nova resposta</h1>
      <p>${params.ticketNumber}</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${params.clientName}</strong>!</p>
      <p>O técnico <strong>${params.agentName}</strong> respondeu ao seu chamado:</p>
      <div class="box">
        <p><strong>${params.ticketNumber} — ${params.ticketTitle}</strong></p>
        <p style="margin-top:12px;white-space:pre-wrap">${preview}</p>
      </div>
      <a href="${APP_URL}/portal/chamado/${params.ticketId}" class="btn">Ver e responder</a>
    </div>
    
  `);

  return send({
    to: params.to,
    subject: `[${params.ticketNumber}] Nova resposta: ${params.ticketTitle}`,
    html,
  });
}

// ─────────────────────────────────────────────
// 4. Cliente respondeu (para o agente atribuído)
// ─────────────────────────────────────────────
export async function sendClientReplyToAgentEmail(params: {
  to: string;
  agentName: string;
  clientName: string;
  ticketNumber: string;
  ticketId: string;
  ticketTitle: string;
  messagePreview: string;
}) {
  const preview = params.messagePreview.length > 300
    ? params.messagePreview.slice(0, 300) + '...'
    : params.messagePreview;

  const html = layout(`
    <div class="header">
      <h1>Cliente respondeu ao chamado</h1>
      <p>${params.ticketNumber}</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${params.agentName}</strong>!</p>
      <p>O cliente <strong>${params.clientName}</strong> respondeu ao chamado:</p>
      <div class="box">
        <p><strong>${params.ticketNumber} — ${params.ticketTitle}</strong></p>
        <p style="margin-top:12px;white-space:pre-wrap">${preview}</p>
      </div>
      <a href="${APP_URL}/admin/chamados/${params.ticketId}" class="btn">Abrir chamado no painel</a>
    </div>
    
  `);

  return send({
    to: params.to,
    subject: `[${params.ticketNumber}] ${params.clientName} respondeu — ${params.ticketTitle}`,
    html,
  });
}

// ─────────────────────────────────────────────
// 5. Status alterado para Resolvido (para o cliente)
// ─────────────────────────────────────────────
export async function sendTicketResolvedEmail(params: {
  to: string;
  clientName: string;
  ticketNumber: string;
  ticketId: string;
  ticketTitle: string;
}) {
  const html = layout(`
    <div class="header">
      <h1>Chamado marcado como resolvido</h1>
      <p>${params.ticketNumber}</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${params.clientName}</strong>!</p>
      <p>Nosso técnico marcou o chamado abaixo como <strong>resolvido</strong>:</p>
      <div class="box">
        <p><strong>${params.ticketNumber}</strong></p>
        <p>${params.ticketTitle}</p>
      </div>
      <p>Se o problema ainda persistir, acesse o portal e responda — o chamado será reaberto automaticamente.</p>
      <a href="${APP_URL}/portal/chamado/${params.ticketId}" class="btn">Ver chamado</a>
    </div>
  `);

  return send({
    to: params.to,
    subject: `[${params.ticketNumber}] Resolvido: ${params.ticketTitle}`,
    html,
  });
}

// ─────────────────────────────────────────────
// Helper interno
// ─────────────────────────────────────────────
async function send({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[email] SMTP_USER/SMTP_PASSWORD nao configurado - email NAO enviado:', subject);
    console.warn('[email] -> Confira o arquivo .env na raiz do projeto');
    return false;
  }
  console.log('[email] Enviando:', subject, '->', to);
  console.log('[email]   host=', process.env.SMTP_HOST ?? 'smtp.hostinger.com',
              'port=', process.env.SMTP_PORT ?? 587,
              'user=', process.env.SMTP_USER);
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log('[email] OK Enviado:', subject);
    console.log('[email]   messageId=', info.messageId);
    console.log('[email]   response=', info.response);
    console.log('[email]   accepted=', JSON.stringify(info.accepted));
    console.log('[email]   rejected=', JSON.stringify(info.rejected));
    if (info.rejected && info.rejected.length > 0) {
      console.error('[email] Servidor rejeitou destinatarios:', info.rejected);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[email] FALHA ao enviar:', subject);
    console.error('[email]   code=', err?.code);
    console.error('[email]   command=', err?.command);
    console.error('[email]   responseCode=', err?.responseCode);
    console.error('[email]   response=', err?.response);
    console.error('[email]   message=', err?.message);
    return false;
  }
}
