"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StatutPresenceEnum } from "@/lib/supabase/types";

async function getContexteActivite(departementId: string) {
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

  if (!isPilotage) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", departementId)
      .eq("statut", "actif")
      .single();

    if (!aff) redirect("/departements");
    peutGerer = ["president", "vice_president", "secretaire"].includes(aff.role);
  }

  return { supabase, peutGerer };
}

export async function enregistrerPresences(
  departementId: string,
  activiteId: string,
  formData: FormData
) {
  const { supabase, peutGerer } = await getContexteActivite(departementId);
  if (!peutGerer) redirect(`/departements/${departementId}/activites/${activiteId}`);

  const upserts: { activite_id: string; ouvrier_id: string; statut: StatutPresenceEnum }[] = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("statut_")) {
      const ouvrierId = key.replace("statut_", "");
      const statut = value as string;
      if (statut === "present" || statut === "absent" || statut === "excuse") {
        upserts.push({ activite_id: activiteId, ouvrier_id: ouvrierId, statut });
      }
    }
  }

  if (upserts.length > 0) {
    await supabase.from("presences").upsert(upserts, {
      onConflict: "activite_id,ouvrier_id",
    });
  }

  redirect(`/departements/${departementId}/activites/${activiteId}`);
}
