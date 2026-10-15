import { z } from 'zod';
import { kinds } from './policy.mjs';
export const credentials = z.object({ email: z.email().max(180).transform(s => s.toLowerCase().trim()), password: z.string().min(10).max(200), name: z.string().trim().min(1).max(60).optional() });
const data = z.object({
  title: z.string().trim().min(1).max(180), quantity: z.string().max(60).optional(), done: z.boolean().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), due: z.iso.datetime({ offset: true }).nullable().optional(),
  reminder: z.boolean().optional(), reminderMinutes: z.number().int().min(0).max(10080).optional(),
  assignee: z.string().uuid().nullable().optional(), portions: z.number().int().min(1).max(30).optional(),
  ingredients: z.array(z.object({ title: z.string().trim().min(1).max(180), quantity: z.string().max(60) })).max(100).optional(),
  instructions: z.string().max(10000).optional(), preparation: z.enum(['cook','leftovers','ready']).optional(),
  imageId: z.string().uuid().nullable().optional(), autoImage: z.boolean().optional(),
  amount: z.number().min(0).max(100000000).optional(), target: z.number().min(0).max(100000000).optional(),
  category: z.string().max(60).optional(), stock: z.enum(['available','low','empty']).optional(),
}).strict();
export const itemInput = z.object({ id: z.string().uuid(), kind: z.enum(kinds), visibility: z.enum(['private','shared']), data, expectedRev: z.number().int().min(0) }).strict();
export const settingsInput = z.object({
  shares: z.partialRecord(z.enum(kinds), z.boolean()).optional(),
  enabled: z.partialRecord(z.enum(kinds), z.boolean()).optional(), cozy: z.boolean().optional(),
  notifications: z.boolean().optional(),
}).strict();
