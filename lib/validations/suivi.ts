import { z } from "zod";

export const pointSuiviSchema = z.object({
  liste_id: z.string().uuid("Liste invalide"),
  contenu: z.string().min(2, "Trop court"),
});

export const listeSuiviSchema = z.object({
  nom: z.string().min(2, "Trop court").max(40, "Trop long"),
});

export type PointSuiviFormValues = z.infer<typeof pointSuiviSchema>;
export type ListeSuiviFormValues = z.infer<typeof listeSuiviSchema>;
