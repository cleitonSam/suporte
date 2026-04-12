import { describe, it, expect } from 'vitest';
import { validateUpload, MAX_UPLOAD_SIZE, friendlySize } from '../upload';

describe('validateUpload', () => {
  it('aceita arquivo válido', () => {
    const result = validateUpload({
      name: 'relatorio.pdf',
      size: 1024 * 100,
      type: 'application/pdf',
    });

    expect(result.ok).toBe(true);
    expect(result.sanitizedName).toBe('relatorio.pdf');
  });

  it('rejeita arquivo vazio', () => {
    const result = validateUpload({ name: '', size: 100, type: 'application/pdf' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('empty_name');
  });

  it('rejeita arquivo maior que o limite', () => {
    const result = validateUpload({
      name: 'big.pdf',
      size: MAX_UPLOAD_SIZE + 1,
      type: 'application/pdf',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('too_large');
  });

  it('rejeita arquivo com tamanho 0', () => {
    const result = validateUpload({
      name: 'empty.pdf',
      size: 0,
      type: 'application/pdf',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('too_large');
  });

  it('rejeita extensão bloqueada', () => {
    const result = validateUpload({
      name: 'virus.exe',
      size: 100,
      type: 'application/octet-stream',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('bad_extension');
  });

  it('rejeita MIME não permitido', () => {
    const result = validateUpload({
      name: 'video.mp4',
      size: 100,
      type: 'video/mp4',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('bad_mime');
  });

  it('sanitiza nome com caracteres perigosos', () => {
    const result = validateUpload({
      name: 'my../file<>name?.pdf',
      size: 100,
      type: 'application/pdf',
    });
    expect(result.ok).toBe(true);
    expect(result.sanitizedName).toBe('my__file__name_.pdf');
    expect(result.sanitizedName).not.toContain('..');
    expect(result.sanitizedName).not.toContain('<');
    expect(result.sanitizedName).not.toContain('>');
  });

  it('trunca nome longo', () => {
    const longName = 'a'.repeat(300) + '.pdf';
    const result = validateUpload({
      name: longName,
      size: 100,
      type: 'application/pdf',
    });
    expect(result.ok).toBe(true);
    expect(result.sanitizedName!.length).toBeLessThanOrEqual(200);
  });

  it('aceita todos os MIME types de imagem', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
      const ext = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
      const result = validateUpload({ name: `foto.${ext}`, size: 100, type });
      expect(result.ok).toBe(true);
    }
  });

  it('rejeita .js e .html mesmo com MIME válido', () => {
    expect(validateUpload({ name: 'app.js', size: 100, type: 'text/plain' }).ok).toBe(false);
    expect(validateUpload({ name: 'page.html', size: 100, type: 'text/plain' }).ok).toBe(false);
  });
});

describe('friendlySize', () => {
  it('formata bytes', () => {
    expect(friendlySize(512)).toBe('512 B');
  });

  it('formata KB', () => {
    expect(friendlySize(1536)).toBe('1.5 KB');
  });

  it('formata MB', () => {
    expect(friendlySize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
