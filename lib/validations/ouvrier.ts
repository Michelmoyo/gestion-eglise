import { z } from "zod";

export const ouvrierSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  postnom: z.string().optional(),
  prenom: z.string().min(1, "Prénom requis"),
  email: z.string().email("Email invalide"),
  sexe: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["M", "F"]).optional()
  ),
  date_naissance: z.string().optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  date_integration: z.string().optional(),
  role_global: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(["pasteur", "assistant"]).nullable().optional()
  ),
});

export type OuvrierInput = z.infer<typeof ouvrierSchema>;
