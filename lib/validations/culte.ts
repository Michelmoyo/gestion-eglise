import { z } from "zod";

export const culteSchema = z.object({
  type: z.string().min(2, "Le type doit contenir au moins 2 caractères"),
  date_culte: z.string().min(1, "La date est obligatoire"),
  heure: z.string().optional(),
  lieu: z.string().optional(),
  description: z.string().optional(),
});

export type CulteFormValues = z.infer<typeof culteSchema>;
