import { z } from 'zod';

export const createChatSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tag: z.string().min(1),
});

export const updateChatSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
});