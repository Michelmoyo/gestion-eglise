"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function marquerLue(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  await supabase.from("notifications").update({ lue: true }).eq("id", notificationId);
  revalidatePath("/notifications");
}

export async function marquerToutesLues() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (moi) {
    await supabase
      .from("notifications")
      .update({ lue: true })
      .eq("destinataire_id", moi.id)
      .eq("lue", false);
  }

  revalidatePath("/notifications");
}
