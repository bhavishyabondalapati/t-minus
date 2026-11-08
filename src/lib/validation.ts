import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(128);

export const credentialsSchema = z.object({ email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

const stopId = z.string().regex(/^[A-Za-z0-9_.:-]{1,64}$/);

export const commuteInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  routeId: z.string().regex(/^[A-Za-z0-9-]{1,32}$/),
  originStopId: stopId,
  destStopId: stopId,
  walkMinutes: z.coerce.number().int().min(0).max(60),
});
export type CommuteInput = z.infer<typeof commuteInputSchema>;

export const streamQuerySchema = z.object({
  stop: stopId,
  route: z.string().regex(/^[A-Za-z0-9-]{1,32}$/),
  direction: z.coerce.number().int().min(0).max(1),
});
