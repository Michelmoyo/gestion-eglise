import { z } from "zod";

export const pointSuiviSchema = z.object({
  liste_id: z.string().uuid("Liste invalide"),
  contenu: z.string().min(2, "Trop court"),
});

export const detailPointSuiviSchema = z
  .object({
    contenu: z.string().min(2, "Trop court"),
    description: z.string().optional(),
    date_debut: z.string().optional(),
    date_fin: z.string().optional(),
  })
  .refine(
    (data) => !data.date_debut || !data.date_fin || data.date_fin >= data.date_debut,
    { message: "La date de fin doit être après la date de début", path: ["date_fin"] }
  );

export const listeSuiviSchema = z.object({
  nom: z.string().min(2, "Trop court").max(40, "Trop long"),
});

export const modifierListeSchema = z.object({
  nom: z.string().min(2, "Trop court").max(40, "Trop long"),
  description: z.string().optional(),
});

export const commentaireSuiviSchema = z.object({
  contenu: z.string().min(1, "Commentaire vide"),
});

export type PointSuiviFormValues = z.infer<typeof pointSuiviSchema>;
export type DetailPointSuiviFormValues = z.infer<typeof detailPointSuiviSchema>;
export type ListeSuiviFormValues = z.infer<typeof listeSuiviSchema>;
export type ModifierListeFormValues = z.infer<typeof modifierListeSchema>;
export type CommentaireSuiviFormValues = z.infer<typeof commentaireSuiviSchema>;

export const MAX_TAILLE_PIECE_JOINTE = 10 * 1024 * 1024; // 10 Mo
