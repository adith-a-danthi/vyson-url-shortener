import { z } from "zod";

export const createUrlSchema = z.object({
  url: z.string().url(),
  shortCode: z.string().min(1).max(255).optional(),
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(1).optional(),
});

export const createUrlBatchSchema = z.object({
  urls: z.array(createUrlSchema),
});

export const redirectUrlSchema = z.object({
  code: z.string().min(1),
  pw: z.string().optional(),
});

export const deleteUrlSchema = z.object({
  code: z.string().min(1),
});

export const updateUrlSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
  password: z.string().min(1).nullable().optional(),
});

export const updateUrlParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});
