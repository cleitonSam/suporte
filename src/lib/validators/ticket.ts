import { z } from 'zod';

export const createTicketSchema = z.object({
  title: z.string().min(5, 'Título precisa ter ao menos 5 caracteres').max(200),
  description: z.string().min(10, 'Descreva o problema com ao menos 10 caracteres').max(10000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  categoryId: z.string().cuid().optional().nullable(),
  equipmentId: z.string().cuid().optional().nullable(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const replyTicketSchema = z.object({
  ticketId: z.string().cuid(),
  body: z.string().min(1, 'Mensagem vazia').max(10000),
  isInternal: z.boolean().default(false),
});

export const updateTicketStatusSchema = z.object({
  ticketId: z.string().cuid(),
  status: z.enum([
    'NEW',
    'OPEN',
    'IN_PROGRESS',
    'WAITING_CLIENT',
    'RESOLVED',
    'CLOSED',
    'REOPENED',
  ]),
});

export const assignTicketSchema = z.object({
  ticketId: z.string().cuid(),
  assignedToId: z.string().cuid().nullable(),
});
