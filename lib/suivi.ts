import type { StatutPointSuiviEnum } from "@/lib/supabase/types";

export const STATUTS_POINT_SUIVI: { value: StatutPointSuiviEnum; label: string }[] = [
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
];

export const STATUT_POINT_SUIVI_LABEL: Record<StatutPointSuiviEnum, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
};

export const STATUT_POINT_SUIVI_STYLE: Record<StatutPointSuiviEnum, string> = {
  a_faire: "bg-secondary text-muted-foreground",
  en_cours: "bg-amber-100 text-amber-700",
  termine: "bg-green-100 text-green-700",
};
