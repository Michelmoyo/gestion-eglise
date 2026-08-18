"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDonneesRapport } from "@/lib/rapport";

export async function soumettrerapport(departementId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) return { error: "Utilisateur introuvable." };

  const isPilotage = !!moi.role_global;
  if (!isPilotage) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", departementId)
      .eq("statut", "actif")
      .single();
    const rolesGestion = ["president", "vice_president", "secretaire"];
    if (!aff || !rolesGestion.includes(aff.role)) {
      return { error: "Accès refusé." };
    }
  }

  const periodeDebut = formData.get("periode_debut") as string;
  const periodeFin = formData.get("periode_fin") as string;
  if (!periodeDebut || !periodeFin) return { error: "Période requise." };
  if (periodeFin < periodeDebut) return { error: "La date de fin doit suivre la date de début." };

  // Le suivi ne se saisit plus par rapport : on capture ici un instantané de
  // ce qui est ouvert (ou résolu pendant cette période) dans chaque liste
  // marquée "inclure dans le rapport" au moment de la soumission.
  const { suiviInclus } = await getDonneesRapport(supabase, departementId, periodeDebut, periodeFin, {
    peutVoirDetailCaisse: false,
  });

  const { error } = await supabase.from("rapports").upsert(
    {
      departement_id: departementId,
      periode_debut: periodeDebut,
      periode_fin: periodeFin,
      suivi_snapshot: suiviInclus,
      auteur_id: moi.id,
      date_soumission: new Date().toISOString(),
    },
    { onConflict: "departement_id,periode_debut,periode_fin" }
  );

  if (error) return { error: "Erreur lors de la soumission." };

  revalidatePath(`/departements/${departementId}/rapport`);
  return { success: true };
}
