import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET handler - renders the CSAT survey HTML page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // Look up the survey by token
  const survey = await db.csatSurvey.findUnique({
    where: { token },
    include: {
      ticket: {
        select: {
          ticketNumber: true,
          title: true,
        },
      },
    },
  });

  if (!survey) {
    return new Response(
      `<!DOCTYPE html>
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
    }
    .header h1 {
      color: #fff;
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .body {
      padding: 32px;
      text-align: center;
    }
    .body p {
      color: #374151;
      font-size: 14px;
      line-height: 1.65;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Pesquisa de satisfação</h1>
    </div>
    <div class="body">
      <p style="color: #ef4444; font-weight: 600;">Pesquisa não encontrada</p>
      <p>O link fornecido é inválido ou expirou.</p>
    </div>
  </div>
</body>
</html>`,
      { status: 404, headers: { 'content-type': 'text/html' } }
    );
  }

  // Check if already answered
  const isAnswered = survey.rating > 0;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Pesquisa de satisfação — Fluxo Suporte</title>
  <style>
    * {
      box-sizing: border-box;
    }
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
    .ticket-info {
      background: #f8fafc;
      border-left: 3px solid #0066FF;
      border-radius: 6px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .ticket-info p {
      margin: 6px 0;
      font-size: 13px;
      color: #374151;
    }
    .ticket-info strong {
      color: #0f172a;
    }
    .ticket-number {
      font-size: 14px;
      font-weight: 600;
      color: #0066FF;
    }
    .rating-section {
      margin: 28px 0;
    }
    .rating-label {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .rating-buttons {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 24px;
    }
    .rating-btn {
      flex: 1;
      padding: 20px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 36px;
      font-weight: 600;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .rating-btn:hover {
      border-color: #0066FF;
      background: #f0f5ff;
    }
    .rating-btn.selected {
      border-color: #0066FF;
      background: #e6f0ff;
    }
    .rating-label-text {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }
    .comment-section {
      margin: 24px 0;
    }
    .comment-label {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 8px;
      display: block;
    }
    textarea {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
      resize: vertical;
      min-height: 100px;
      color: #0f172a;
    }
    textarea:focus {
      outline: none;
      border-color: #0066FF;
      box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
    }
    .submit-section {
      margin-top: 28px;
      text-align: center;
    }
    button[type="submit"] {
      background: #0066FF;
      color: #fff;
      border: none;
      padding: 13px 32px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 102, 255, 0.3);
      transition: background 0.2s ease;
    }
    button[type="submit"]:hover {
      background: #0052CC;
    }
    button[type="submit"]:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
      box-shadow: none;
    }
    .already-answered {
      background: #d1fae5;
      border: 1px solid #6ee7b7;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
    }
    .already-answered p {
      color: #065f46;
      font-weight: 600;
      margin: 0;
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
      <p>Sua opinião é muito importante</p>
    </div>
    <div class="body">
      ${
        isAnswered
          ? `
            <div class="already-answered">
              <p>✓ Pesquisa já respondida</p>
              <p style="margin-top: 8px; font-size: 13px; color: #047857;">Obrigado pela sua avaliação!</p>
            </div>
          `
          : `
            <div class="ticket-info">
              <p class="ticket-number">${survey.ticket.ticketNumber}</p>
              <p><strong>${survey.ticket.title}</strong></p>
            </div>

            <form method="POST" id="csatForm">
              <div class="rating-section">
                <div class="rating-label">Qual sua avaliação?</div>
                <div class="rating-buttons">
                  <button type="button" class="rating-btn" data-rating="1" title="Péssimo">
                    <span>😠</span>
                    <span class="rating-label-text">Péssimo</span>
                  </button>
                  <button type="button" class="rating-btn" data-rating="2" title="Ruim">
                    <span>😕</span>
                    <span class="rating-label-text">Ruim</span>
                  </button>
                  <button type="button" class="rating-btn" data-rating="3" title="Regular">
                    <span>😐</span>
                    <span class="rating-label-text">Regular</span>
                  </button>
                  <button type="button" class="rating-btn" data-rating="4" title="Bom">
                    <span>😊</span>
                    <span class="rating-label-text">Bom</span>
                  </button>
                  <button type="button" class="rating-btn" data-rating="5" title="Ótimo">
                    <span>🤩</span>
                    <span class="rating-label-text">Ótimo</span>
                  </button>
                </div>
              </div>

              <input type="hidden" name="rating" id="ratingInput" value="" required>

              <div class="comment-section">
                <label for="comment" class="comment-label">Comentário (opcional)</label>
                <textarea id="comment" name="comment" placeholder="Sua sugestão ou feedback nos ajuda a melhorar..."></textarea>
              </div>

              <div class="submit-section">
                <button type="submit" id="submitBtn" disabled>Enviar avaliação</button>
              </div>
            </form>

            <script>
              const ratingBtns = document.querySelectorAll('.rating-btn');
              const ratingInput = document.getElementById('ratingInput');
              const submitBtn = document.getElementById('submitBtn');
              const form = document.getElementById('csatForm');

              ratingBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                  ratingBtns.forEach(b => b.classList.remove('selected'));
                  btn.classList.add('selected');
                  ratingInput.value = btn.dataset.rating;
                  submitBtn.disabled = false;
                });
              });

              form.addEventListener('submit', async (e) => {
                e.preventDefault();
                submitBtn.disabled = true;
                submitBtn.textContent = 'Enviando...';

                try {
                  const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      rating: parseInt(ratingInput.value),
                      comment: document.getElementById('comment').value || null,
                    }),
                  });

                  if (response.ok) {
                    form.innerHTML = '<div style="text-align: center; padding: 40px 0;"><p style="font-size: 36px; margin: 0;">🎉</p><p style="color: #065f46; font-weight: 600; font-size: 16px; margin: 16px 0;">Obrigado pela sua avaliação!</p><p style="color: #64748b; font-size: 13px;">Seus comentários nos ajudam a melhorar continuamente.</p></div>';
                  } else {
                    alert('Erro ao enviar avaliação. Tente novamente.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Enviar avaliação';
                  }
                } catch (err) {
                  console.error(err);
                  alert('Erro ao enviar avaliação. Tente novamente.');
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Enviar avaliação';
                }
              });
            </script>
          `
      }
    </div>
    <div class="footer">
      <p class="fluxo-mark">Fluxo Digital Tech</p>
      <p>ti@fluxodigitaltech.com.br · Suporte técnico especializado</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

/**
 * POST handler - saves rating and comment to the CSAT survey
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    const body = await request.json();
    const { rating, comment } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Look up the survey by token
    const survey = await db.csatSurvey.findUnique({
      where: { token },
    });

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Check if already answered
    if (survey.rating > 0) {
      return NextResponse.json(
        { error: 'Survey already answered' },
        { status: 409 }
      );
    }

    // Update the survey with the response
    await db.csatSurvey.update({
      where: { token },
      data: {
        rating,
        comment: comment || null,
        answeredAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[CSAT] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
