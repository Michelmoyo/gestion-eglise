import { z } from "zod";

export const parametresEgliseSchema = z.object({
  nomEglise: z.string().optional(),
  reseau: z.string().optional(),
  adresse: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
});

export type ParametresEgliseFormValues = z.infer<typeof parametresEgliseSchema>;
