"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { activiteSchema } from "@/lib/validations/activite";

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

  // Vérifier que l'utilisateur est affecté au département ou pilotage
  if (!isPilotage) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", departementId)
      .eq("statut", "actif")
      .single();

    if (!aff) redirect("/departements");

    const peutGerer = ["president", "vice_president", "secretaire"].includes(aff.role);
    return { supabase, moi, peutGerer };
  }

  return { supabase, moi, peutGerer: true };
}

export async function creerActivite(departementId: string, formData: FormData) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) redirect(`/departements/${departementId}/activites`);

  const raw = {
    titre: formData.get("titre"),
    date_activite: formData.get("date_activite"),
    heure: formData.get("heure") || undefined,
    lieu: formData.get("lieu") || undefined,
    description: formData.get("description") || undefined,
    responsable_id: formData.get("responsable_id") || undefined,
  };

  const parsed = activiteSchema.safeParse(raw);
  if (!parsed.success) redirect(`/departements/${departementId}/activites/nouvelle`);

  const { data, error } = await supabase.from("activites").insert({
    departement_id: departementId,
    titre: parsed.data.titre,
    date_activite: parsed.data.date_activite,
    heure: parsed.data.heure || null,
    lieu: parsed.data.lieu || null,
    description: parsed.data.description || null,
    responsable_id: parsed.data.responsable_id || null,
    created_by: moi.id,
  }).select("id").single();

  if (error || !data) redirect(`/departements/${departementId}/activites`);

  redirect(`/departements/${departementId}/activites/${data.id}`);
}

export async function modifierActivite(
  departementId: string,
  activiteId: string,
  formData: FormData
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) redirect(`/departements/${departementId}/activites/${activiteId}`);

  const raw = {
    titre: formData.get("titre"),
    date_activite: formData.get("date_activite"),
    heure: formData.get("heure") || undefined,
    lieu: formData.get("lieu") || undefined,
    description: formData.get("description") || undefined,
    responsable_id: formData.get("responsable_id") || undefined,
  };

  const parsed = activiteSchema.safeParse(raw);
  if (!parsed.success) redirect(`/departements/${departementId}/activites/${activiteId}/modifier`);

  await supabase.from("activites").update({
    titre: parsed.data.titre,
    date_activite: parsed.data.date_activite,
    heure: parsed.data.heure || null,
    lieu: parsed.data.lieu || null,
    description: parsed.data.description || null,
    responsable_id: parsed.data.responsable_id || null,
  }).eq("id", activiteId).eq("departement_id", departementId);

  redirect(`/departements/${departementId}/activites/${activiteId}`);
}
