"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { affectationSchema } from "@/lib/validations/departement";

type RoleDept = "president" | "vice_president" | "secretaire" | "tresorier" | "membre";

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

  const { data: monAff } = await supabase
    .from("affectations")
    .select("role")
    .eq("ouvrier_id", moi.id)
    .eq("departement_id", departementId)
    .eq("statut", "actif")
    .single();

  const isPresident = monAff?.role === "president";
  const peutGerer = isPilotage || isPresident;

  return { supabase, moi, isPilotage, isPresident, peutGerer };
}

export async function affecterOuvrier(departementId: string, formData: FormData) {
  const { supabase, isPilotage } = await getContexte(departementId);
  if (!isPilotage) return { error: "Seul le pasteur ou l'assistant peut affecter un ouvrier." };

  const parsed = affectationSchema.safeParse({
    ouvrier_id: formData.get("ouvrier_id"),
    departement_id: departementId,
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { error } = await supabase.from("affectations").insert(parsed.data);

  if (error) {
    if (error.code === "23505") {
      return { error: "Cet ouvrier est déjà affecté à ce département, ou un président actif existe déjà." };
    }
    return { error: "Erreur lors de l'affectation." };
  }

  revalidatePath(`/departements/${departementId}/equipe`);
  return { success: true };
}

export async function assignerRole(
  departementId: string,
  affectationId: string,
  formData: FormData
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const role = formData.get("role") as RoleDept;

  const { error } = await supabase.rpc("rpc_assigner_role", {
    p_affectation_id: affectationId,
    p_nouveau_role: role,
  });

  if (error) return { error: error.message };

  revalidatePath(`/departements/${departementId}/equipe`);
  return { success: true };
}

export async function suspendreOuvrier(
  departementId: string,
  affectationId: string,
  dateFinSuspension: string | null
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase.rpc("rpc_suspendre_ouvrier", {
    p_affectation_id: affectationId,
    p_date_fin_suspension: dateFinSuspension,
  });

  if (error) return { error: error.message };

  revalidatePath(`/departements/${departementId}/equipe`);
  return { success: true };
}

export async function reactiverOuvrier(departementId: string, affectationId: string) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase.rpc("rpc_reactiver_ouvrier", {
    p_affectation_id: affectationId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/departements/${departementId}/equipe`);
  return { success: true };
}

export async function marquerQuitte(departementId: string, affectationId: string) {
  const { supabase, isPilotage } = await getContexte(departementId);
  if (!isPilotage) return { error: "Seul le pasteur ou l'assistant peut marquer un départ définitif." };

  const { error } = await supabase.rpc("rpc_marquer_quitte", {
    p_affectation_id: affectationId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/departements/${departementId}/equipe`);
  return { success: true };
}
