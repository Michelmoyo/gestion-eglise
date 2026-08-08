import { z } from "zod";

export const parametresEgliseSchema = z.object({
  adresse: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
});

export type ParametresEgliseFormValues = z.infer<typeof parametresEgliseSchema>;
