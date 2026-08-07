"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StatutPresenceEnum } from "@/lib/supabase/types";

export async function enregistrerPresencesCulte(culteId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect(`/cultes/${culteId}`);

  const upserts: { culte_id: string; ouvrier_id: string; statut: StatutPresenceEnum }[] = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("statut_")) {
      const ouvrierId = key.replace("statut_", "");
      const statut = value as string;
      if (statut === "present" || statut === "absent" || statut === "excuse") {
        upserts.push({ culte_id: culteId, ouvrier_id: ouvrierId, statut });
      }
    }
  }

  if (upserts.length > 0) {
    await supabase.from("presences_culte").upsert(upserts, {
      onConflict: "culte_id,ouvrier_id",
    });
  }

  redirect(`/cultes/${culteId}`);
}
