import { z } from 'zod';

export const createEquipmentSchema = z.object({
  clientId: z.string().cuid(),
  categoryId: z.string().cuid(),
  name: z.string().min(2).max(200),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  patrimony: z.string().max(100).optional().nullable(),
  ipAddress: z.string().max(45).optional().nullable(),
  macAddress: z.string().max(17).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  purchaseDate: z.coerce.date().optional().nullable(),
  warrantyExpiresAt: z.coerce.date().optional().nullable(),
  status: z.enum(['ACTIVE', 'IN_REPAIR', 'RETIRED']).default('ACTIVE'),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
