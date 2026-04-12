import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { validateUpload, friendlySize, MAX_UPLOAD_SIZE } from '@/lib/upload';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

const ERROR_MSG: Record<string, string> = {
  too_large: `Arquivo excede o limite de ${friendlySize(MAX_UPLOAD_SIZE)}`,
  bad_mime: 'Tipo de arquivo não permitido',
  bad_extension: 'Extensão de arquivo bloqueada',
  empty_name: 'Nome de arquivo inválido',
};

export async function POST(
  req: NextRequest,
  { params }: { params: { ticketId: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verifica se o chamado existe e o usuário tem acesso
  const ticket = await db.ticket.findFirst({
    where: {
      id: params.ticketId,
      deletedAt: null,
      ...(session.user.userType === 'CLIENT_CONTACT' && {
        clientId: session.user.clientId,
      }),
    },
    select: { id: true },
  });

  if (!ticket) {
    return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const messageId = formData.get('messageId') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  }

  // Validação com lib/upload.ts
  const validation = validateUpload({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (!validation.ok) {
    return NextResponse.json(
      { error: ERROR_MSG[validation.error!] ?? 'Arquivo inválido' },
      { status: 400 },
    );
  }

  // Salva no disco
  const ticketDir = path.join(UPLOAD_DIR, params.ticketId);
  await mkdir(ticketDir, { recursive: true });

  const uniqueName = `${Date.now()}_${validation.sanitizedName}`;
  const filePath = path.join(ticketDir, uniqueName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Persiste no banco
  const attachment = await db.ticketAttachment.create({
    data: {
      ticketId: params.ticketId,
      messageId: messageId || null,
      fileName: validation.sanitizedName!,
      filePath: filePath,
      mimeType: file.type,
      size: file.size,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json({
    id: attachment.id,
    fileName: attachment.fileName,
    size: attachment.size,
    mimeType: attachment.mimeType,
  });
}
