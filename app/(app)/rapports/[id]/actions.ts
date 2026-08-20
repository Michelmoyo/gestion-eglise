"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function supprimerRapport(rapportId: string, departementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { error } = await supabase.from("rapports").delete().eq("id", rapportId);
  if (error) return { error: "Erreur lors de la suppression." };

  revalidatePath(`/departements/${departementId}/rapports`);
  revalidatePath("/rapports");
  return { success: true };
}
