// Validação de uploads de anexos.

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

/** MIME types aceitos — whitelist. */
export const ALLOWED_MIME = new Set<string>([
  // Imagens
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Arquivos
  'application/zip',
  'application/x-7z-compressed',
  'application/vnd.rar',
]);

/** Extensões nunca permitidas, mesmo com MIME "correto". */
const BLOCKED_EXTENSIONS = new Set<string>([
  'exe',
  'bat',
  'cmd',
  'com',
  'cpl',
  'dll',
  'msi',
  'vbs',
  'ps1',
  'sh',
  'jar',
  'app',
  'scr',
  'js',
  'mjs',
  'cjs',
  'html',
  'htm',
  'svg', // svg pode carregar JS; permita só explicitamente
  'php',
  'phtml',
  'asp',
  'aspx',
  'jsp',
]);

export interface UploadValidationResult {
  ok: boolean;
  error?: 'too_large' | 'bad_mime' | 'bad_extension' | 'empty_name';
  sanitizedName?: string;
}

export function validateUpload(file: {
  name: string;
  size: number;
  type: string;
}): UploadValidationResult {
  if (!file.name || !file.name.trim()) {
    return { ok: false, error: 'empty_name' };
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE) {
    return { ok: false, error: 'too_large' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ext || BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, error: 'bad_extension' };
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: 'bad_mime' };
  }

  // Sanitiza o nome: remove caracteres perigosos + path traversal
  const sanitizedName = file.name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\.\./g, '_')
    .slice(0, 200);

  return { ok: true, sanitizedName };
}

export function friendlySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
