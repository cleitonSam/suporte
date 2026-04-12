'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

// Slugify utility: converts text to URL-safe slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ==============================================================
// KB CATEGORY ACTIONS
// ==============================================================

export async function createKbCategoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');

  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const name = (formData.get('name') as string)?.trim();
  let slug = (formData.get('slug') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const icon = (formData.get('icon') as string)?.trim() || null;

  if (!name) throw new Error('Nome é obrigatório');

  // Auto-generate slug if empty
  if (!slug) {
    slug = slugify(name);
  } else {
    slug = slugify(slug);
  }

  // Check for duplicate slug
  const existing = await db.kbCategory.findUnique({ where: { slug } });
  if (existing) throw new Error('Este slug já existe');

  try {
    const last = await db.kbCategory.findFirst({ orderBy: { sortOrder: 'desc' } });

    await db.kbCategory.create({
      data: {
        name,
        slug,
        description,
        icon,
        isActive: true,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });

    await audit({
      action: 'kb.category_create',
      actorId: user.id,
      entity: 'KbCategory',
      metadata: { name, slug },
    });

    revalidatePath('/admin/conhecimento');
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    throw error;
  }
}

export async function updateKbCategoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');

  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const id = formData.get('id') as string;
  const name = (formData.get('name') as string)?.trim();
  let slug = (formData.get('slug') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const icon = (formData.get('icon') as string)?.trim() || null;

  if (!id || !name) throw new Error('ID e nome são obrigatórios');

  const category = await db.kbCategory.findUnique({ where: { id } });
  if (!category) throw new Error('Categoria não encontrada');

  // Auto-generate slug if empty, or use provided
  if (!slug) {
    slug = slugify(name);
  } else {
    slug = slugify(slug);
  }

  // Check if slug changed and if new slug is unique
  if (slug !== category.slug) {
    const existing = await db.kbCategory.findUnique({ where: { slug } });
    if (existing) throw new Error('Este slug já existe');
  }

  try {
    await db.kbCategory.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        icon,
      },
    });

    await audit({
      action: 'kb.category_update',
      actorId: user.id,
      entity: 'KbCategory',
      entityId: id,
      metadata: { name, slug },
    });

    revalidatePath('/admin/conhecimento');
    revalidatePath(`/admin/conhecimento/${category.slug}`);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    throw error;
  }
}

export async function deleteKbCategoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');

  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const id = formData.get('id') as string;
  if (!id) throw new Error('ID é obrigatório');

  const category = await db.kbCategory.findUnique({ where: { id } });
  if (!category) throw new Error('Categoria não encontrada');

  try {
    await db.kbCategory.update({
      where: { id },
      data: { isActive: false },
    });

    await audit({
      action: 'kb.category_delete',
      actorId: user.id,
      entity: 'KbCategory',
      entityId: id,
      metadata: { name: category.name },
    });

    revalidatePath('/admin/conhecimento');
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    throw error;
  }
}

// ==============================================================
// KB ARTICLE ACTIONS
// ==============================================================

export async function createKbArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');

  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const categoryId = formData.get('categoryId') as string;
  const title = (formData.get('title') as string)?.trim();
  let slug = (formData.get('slug') as string)?.trim();
  const excerpt = (formData.get('excerpt') as string)?.trim() || null;
  const body = (formData.get('body') as string)?.trim();
  const isPublished = formData.get('isPublished') === 'on';

  if (!categoryId || !title || !body) {
    throw new Error('Categoria, título e corpo são obrigatórios');
  }

  // Verify category exists
  const category = await db.kbCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error('Categoria não encontrada');

  // Auto-generate slug if empty
  if (!slug) {
    slug = slugify(title);
  } else {
    slug = slugify(slug);
  }

  // Check for duplicate slug
  const existing = await db.kbArticle.findUnique({ where: { slug } });
  if (existing) throw new Error('Este slug já existe');

  try {
    await db.kbArticle.create({
      data: {
        categoryId,
        title,
        slug,
        excerpt,
        body,
        isPublished,
      },
    });

    await audit({
      action: 'kb.article_create',
      actorId: user.id,
      entity: 'KbArticle',
      metadata: { title, categoryId },
    });

    revalidatePath(`/admin/conhecimento/${category.slug}`);
  } catch (error) {
    console.error('Erro ao criar artigo:', error);
    throw error;
  }
}

export async function updateKbArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');

  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const id = formData.get('id') as string;
  const categoryId = formData.get('categoryId') as string;
  const title = (formData.get('title') as string)?.trim();
  let slug = (formData.get('slug') as string)?.trim();
  const excerpt = (formData.get('excerpt') as string)?.trim() || null;
  const body = (formData.get('body') as string)?.trim();
  const isPublished = formData.get('isPublished') === 'on';

  if (!id || !categoryId || !title || !body) {
    throw new Error('ID, categoria, título e corpo são obrigatórios');
  }

  const article = await db.kbArticle.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!article) throw new Error('Artigo não encontrado');

  // Verify category exists
  const category = await db.kbCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error('Categoria não encontrada');

  // Auto-generate slug if empty
  if (!slug) {
    slug = slugify(title);
  } else {
    slug = slugify(slug);
  }

  // Check if slug changed and if new slug is unique
  if (slug !== article.slug) {
    const existing = await db.kbArticle.findUnique({ where: { slug } });
    if (existing) throw new Error('Este slug já existe');
  }

  try {
    await db.kbArticle.update({
      where: { id },
      data: {
        categoryId,
        title,
        slug,
        excerpt,
        body,
        isPublished,
      },
    });

    await audit({
      action: 'kb.article_update',
      actorId: user.id,
      entity: 'KbArticle',
      entityId: id,
      metadata: { title, categoryId },
    });

    revalidatePath(`/admin/conhecimento/${article.category.slug}`);
    revalidatePath(`/admin/conhecimento/artigo/${id}`);
  } catch (error) {
    console.error('Erro ao atualizar artigo:', error);
    throw error;
  }
}

export async function deleteKbArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');

  const user = session.user as any;
  if (user.userType !== 'AGENT') throw new Error('Sem permissão');

  const id = formData.get('id') as string;
  if (!id) throw new Error('ID é obrigatório');

  const article = await db.kbArticle.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!article) throw new Error('Artigo não encontrado');

  try {
    await db.kbArticle.delete({ where: { id } });

    await audit({
      action: 'kb.article_delete',
      actorId: user.id,
      entity: 'KbArticle',
      entityId: id,
      metadata: { title: article.title },
    });

    revalidatePath(`/admin/conhecimento/${article.category.slug}`);
  } catch (error) {
    console.error('Erro ao deletar artigo:', error);
    throw error;
  }
}

// ==============================================================
// KB ARTICLE PUBLIC ACTIONS (no auth required)
// ==============================================================

export async function voteArticleAction(formData: FormData) {
  const id = formData.get('id') as string;
  const vote = (formData.get('vote') as string)?.trim();

  if (!id || !['yes', 'no'].includes(vote)) {
    throw new Error('ID e voto inválidos');
  }

  const article = await db.kbArticle.findUnique({ where: { id } });
  if (!article) throw new Error('Artigo não encontrado');

  try {
    if (vote === 'yes') {
      await db.kbArticle.update({
        where: { id },
        data: { helpfulYes: { increment: 1 } },
      });
    } else {
      await db.kbArticle.update({
        where: { id },
        data: { helpfulNo: { increment: 1 } },
      });
    }
  } catch (error) {
    console.error('Erro ao registrar voto:', error);
    throw error;
  }
}

export async function incrementViewAction(articleId: string) {
  if (!articleId) throw new Error('ID do artigo é obrigatório');

  const article = await db.kbArticle.findUnique({ where: { id: articleId } });
  if (!article) throw new Error('Artigo não encontrado');

  try {
    await db.kbArticle.update({
      where: { id: articleId },
      data: { viewCount: { increment: 1 } },
    });
  } catch (error) {
    console.error('Erro ao incrementar visualizações:', error);
    throw error;
  }
}
