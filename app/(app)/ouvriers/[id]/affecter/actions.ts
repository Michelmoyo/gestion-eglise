"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { affectationSchema } from "@/lib/validations/departement";

export async function affecter(ouvrierId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) return { error: "Accès refusé." };

  const parsed = affectationSchema.safeParse({
    ouvrier_id: ouvrierId,
    departement_id: formData.get("departement_id"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { error } = await supabase.from("affectations").insert(parsed.data);

  if (error) {
    if (error.code === "23505") return { error: "Cet ouvrier est déjà affecté à ce département." };
    return { error: "Erreur lors de l'affectation." };
  }

  revalidatePath(`/ouvriers/${ouvrierId}`);
  redirect(`/ouvriers/${ouvrierId}`);
}
