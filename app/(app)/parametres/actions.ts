"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parametresEgliseSchema } from "@/lib/validations/parametres";

export async function enregistrerParametresEglise(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (moi?.role_global !== "pasteur") return { error: "Réservé au pasteur." };

  const parsed = parametresEgliseSchema.safeParse({
    nomEglise: formData.get("nomEglise") || undefined,
    reseau: formData.get("reseau") || undefined,
    adresse: formData.get("adresse") || undefined,
    telephone: formData.get("telephone") || undefined,
    email: formData.get("email") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { data: existant } = await supabase
    .from("parametres_eglise")
    .select("id")
    .limit(1)
    .single();

  if (!existant) return { error: "Paramètres introuvables." };

  const { error } = await supabase
    .from("parametres_eglise")
    .update({
      nom_eglise: parsed.data.nomEglise || null,
      reseau: parsed.data.reseau || null,
      adresse: parsed.data.adresse || null,
      telephone: parsed.data.telephone || null,
      email: parsed.data.email || null,
    })
    .eq("id", existant.id);

  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/parametres");
  return { success: true };
}
