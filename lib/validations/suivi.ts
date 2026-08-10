import { z } from "zod";

export const pointSuiviSchema = z.object({
  liste_id: z.string().uuid("Liste invalide"),
  contenu: z.string().min(2, "Trop court"),
});

export const detailPointSuiviSchema = z.object({
  contenu: z.string().min(2, "Trop court"),
  description: z.string().optional(),
});

export const listeSuiviSchema = z.object({
  nom: z.string().min(2, "Trop court").max(40, "Trop long"),
});

export type PointSuiviFormValues = z.infer<typeof pointSuiviSchema>;
export type DetailPointSuiviFormValues = z.infer<typeof detailPointSuiviSchema>;
export type ListeSuiviFormValues = z.infer<typeof listeSuiviSchema>;

export const MAX_TAILLE_PIECE_JOINTE = 10 * 1024 * 1024; // 10 Mo
