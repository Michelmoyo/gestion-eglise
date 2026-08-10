"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pointSuiviSchema } from "@/lib/validations/suivi";

async function getContexte(departementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;
  let peutGerer = isPilotage;

  if (!peutGerer) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", departementId)
      .eq("statut", "actif")
      .single();

    peutGerer = ["president", "vice_president", "secretaire"].includes(aff?.role ?? "");
  }

  return { supabase, moi, peutGerer };
}

export async function ajouterPointSuivi(
  departementId: string,
  type: "difficulte" | "besoin" | "objectif",
  formData: FormData
) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const parsed = pointSuiviSchema.safeParse({
    type,
    contenu: formData.get("contenu"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { error } = await supabase.from("points_suivi").insert({
    departement_id: departementId,
    type: parsed.data.type,
    contenu: parsed.data.contenu,
    cree_par: moi.id,
  });

  if (error) return { error: "Erreur lors de l'ajout." };

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function resoudrePointSuivi(departementId: string, pointId: string) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("points_suivi")
    .update({
      resolu: true,
      date_resolution: new Date().toISOString().split("T")[0],
      resolu_par: moi.id,
    })
    .eq("id", pointId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur." };

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function rouvrirPointSuivi(departementId: string, pointId: string) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("points_suivi")
    .update({ resolu: false, date_resolution: null, resolu_par: null })
    .eq("id", pointId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur." };

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}
