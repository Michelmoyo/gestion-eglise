import { z } from "zod";

export const departementSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional(),
  date_creation: z.string().optional(),
});

export const affectationSchema = z.object({
  ouvrier_id: z.string().uuid("Ouvrier invalide"),
  departement_id: z.string().uuid("Département invalide"),
  role: z.enum(["membre", "secretaire", "tresorier", "vice_president", "president"]),
});

export type DepartementInput = z.infer<typeof departementSchema>;
export type AffectationInput = z.infer<typeof affectationSchema>;
