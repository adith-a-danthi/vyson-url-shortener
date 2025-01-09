import { z } from "zod";

export const createUrlSchema = z.object({
  url: z.string().url(),
  shortCode: z.string().min(1).max(255).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const createUrlBatchSchema = z.object({
  urls: z.array(createUrlSchema),
});

export const redirectUrlSchema = z.object({
  code: z.string().min(1),
});

export const deleteUrlSchema = z.object({
  code: z.string().min(1),
});
