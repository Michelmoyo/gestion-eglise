import { z } from "zod";

export const pointSuiviSchema = z.object({
  type: z.enum(["difficulte", "besoin", "objectif"]),
  contenu: z.string().min(2, "Trop court"),
});

export type PointSuiviFormValues = z.infer<typeof pointSuiviSchema>;
