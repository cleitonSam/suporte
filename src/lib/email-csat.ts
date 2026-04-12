import { sendEmail as sendEmailService } from './email';

/**
 * Send CSAT survey email to client
 * Asks the client to rate their experience with the support ticket
 */
export async function sendCsatEmail({
  to,
  clientName,
  ticketNumber,
  ticketTitle,
  surveyUrl,
}: {
  to: string;
  clientName: string;
  ticketNumber: string;
  ticketTitle: string;
  surveyUrl: string;
}): Promise<boolean> {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body {
      font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
      background: #f1f5f9;
      margin: 0;
      padding: 0;
      color: #0f172a;
    }
    .wrap {
      max-width: 600px;
      margin: 32px auto;
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0, 102, 255, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #0066FF 0%, #0052CC 60%, #00F2FE 200%);
      padding: 28px 32px;
      position: relative;
    }
    .header h1 {
      color: #fff;
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .header p {
      color: #CCE0FF;
      margin: 6px 0 0;
      font-size: 13px;
      font-weight: 500;
    }
    .body {
      padding: 32px;
    }
    .body p {
      color: #374151;
      font-size: 14px;
      line-height: 1.65;
      margin: 0 0 16px;
    }
    .body strong {
      color: #0f172a;
    }
    .box {
      background: #f1f5f9;
      border-left: 3px solid #0066FF;
      border-radius: 6px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .box p {
      margin: 4px 0;
      font-size: 13px;
      color: #374151;
    }
    .box strong {
      color: #0A1F3D;
    }
    .btn {
      display: inline-block;
      background: #0066FF;
      color: #fff !important;
      text-decoration: none;
      padding: 13px 26px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      margin: 8px 0;
      box-shadow: 0 4px 14px rgba(0, 102, 255, 0.3);
    }
    .btn:hover {
      background: #0052CC;
    }
    .emoji-section {
      text-align: center;
      margin: 20px 0;
      font-size: 40px;
      letter-spacing: 8px;
    }
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 22px 32px;
      text-align: center;
    }
    .footer p {
      color: #64748b;
      font-size: 11px;
      margin: 2px 0;
      letter-spacing: 0.01em;
    }
    .fluxo-mark {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #0066FF;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Como foi o atendimento?</h1>
      <p>Sua opinião é muito importante para nós</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${clientName}</strong>!</p>
      <p>Recentemente você abriu um chamado conosco. Gostaríamos de saber sua opinião sobre o atendimento que você recebeu.</p>
      <p>Sua avaliação nos ajuda a melhorar continuamente nossos serviços.</p>

      <div class="box">
        <p><strong>Chamado:</strong> ${ticketNumber}</p>
        <p><strong>Assunto:</strong> ${ticketTitle}</p>
      </div>

      <p style="text-align: center; margin: 24px 0;">
        <a href="${surveyUrl}" class="btn">Responder pesquisa</a>
      </p>

      <div class="emoji-section">
        😠 😕 😐 😊 🤩
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        A pesquisa leva apenas 30 segundos para ser respondida e é muito importante para nós.
      </p>
    </div>
    <div class="footer">
      <p class="fluxo-mark">Fluxo Digital Tech</p>
      <p>ti@fluxodigitaltech.com.br · Suporte técnico especializado</p>
      <p style="margin-top: 8px; color: #94a3b8;">Este é um email automático do sistema de chamados.</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmailService({
    to,
    subject: `Como foi o atendimento? — ${ticketNumber}`,
    html,
  });
}
