"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const periode = formData.get("periode") as string;
  if (!periode) return { error: "Période requise." };

  function joindreEntrees(champ: string) {
    const entrees = formData
      .getAll(champ)
      .map((v) => String(v).trim())
      .filter(Boolean);
    return entrees.length ? entrees.join("\n") : null;
  }

  const { error } = await supabase.from("rapports").upsert(
    {
      departement_id: departementId,
      periode,
      difficultes: joindreEntrees("difficultes"),
      besoins: joindreEntrees("besoins"),
      objectifs: joindreEntrees("objectifs"),
      auteur_id: moi.id,
      date_soumission: new Date().toISOString(),
    },
    { onConflict: "departement_id,periode" }
  );

  if (error) return { error: "Erreur lors de la soumission." };

  revalidatePath(`/departements/${departementId}/rapport`);
  return { success: true };
}
