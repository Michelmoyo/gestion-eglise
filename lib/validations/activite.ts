import { z } from "zod";

export const activiteSchema = z.object({
  titre: z.string().min(2, "Le titre doit contenir au moins 2 caractères"),
  date_activite: z.string().min(1, "La date est obligatoire"),
  heure: z.string().optional(),
  lieu: z.string().optional(),
  description: z.string().optional(),
  responsable_id: z.string().uuid().optional().or(z.literal("")),
});

export type ActiviteFormValues = z.infer<typeof activiteSchema>;
