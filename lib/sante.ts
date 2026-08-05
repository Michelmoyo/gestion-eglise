export type Sante = "vert" | "orange" | "rouge";

export interface SanteDept {
  statut: Sante;
  alertes: string[];
}

interface DonneesSante {
  dernierActivite: string | null;    // date ISO
  tauxPresence30j: number | null;    // 0-100
  tauxPresencePrev: number | null;   // 0-100 (fenêtre J-60 à J-30)
  dernierRapport: string | null;     // date ISO
  absences3Consecutives: boolean;
}

export function calculerSante(d: DonneesSante): SanteDept {
  const now = new Date();
  const jours = (iso: string | null) =>
    iso ? Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000) : Infinity;

  const alertesRouge: string[] = [];
  const alertesOrange: string[] = [];

  // ── ROUGE ──────────────────────────────────────────────────────────────────
  if (jours(d.dernierActivite) > 30)
    alertesRouge.push("Aucune activité depuis plus de 30 jours");

  if (d.tauxPresence30j !== null && d.tauxPresence30j < 50)
    alertesRouge.push(`Taux de présence faible : ${d.tauxPresence30j}%`);

  if (jours(d.dernierRapport) > 60)
    alertesRouge.push("Aucun rapport soumis depuis plus de 60 jours");

  if (alertesRouge.length > 0)
    return { statut: "rouge", alertes: alertesRouge };

  // ── ORANGE ─────────────────────────────────────────────────────────────────
  if (d.tauxPresence30j !== null && d.tauxPresence30j >= 50 && d.tauxPresence30j < 70)
    alertesOrange.push(`Taux de présence moyen : ${d.tauxPresence30j}%`);

  if (
    d.tauxPresence30j !== null &&
    d.tauxPresencePrev !== null &&
    d.tauxPresencePrev - d.tauxPresence30j > 15
  )
    alertesOrange.push(
      `Baisse de ${Math.round(d.tauxPresencePrev - d.tauxPresence30j)} points vs mois précédent`
    );

  if (jours(d.dernierRapport) > 30)
    alertesOrange.push("Rapport non soumis depuis plus de 30 jours");

  if (d.absences3Consecutives)
    alertesOrange.push("Un ouvrier absent à 3 activités consécutives");

  if (alertesOrange.length > 0)
    return { statut: "orange", alertes: alertesOrange };

  return { statut: "vert", alertes: [] };
}
