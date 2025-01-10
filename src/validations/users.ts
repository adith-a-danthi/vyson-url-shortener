import { UserTier } from "@db/schema";
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  tier: z.nativeEnum(UserTier).optional(),
});

export const getUsersSchema = z.object({
  email: z.string().email(),
});
