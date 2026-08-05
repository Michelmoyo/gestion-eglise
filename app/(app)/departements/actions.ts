"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departementSchema } from "@/lib/validations/departement";

async function assertPilotage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!ouvrier?.role_global) throw new Error("Accès refusé.");
  return supabase;
}

export async function creerDepartement(formData: FormData) {
  const supabase = await assertPilotage();

  const parsed = departementSchema.safeParse({
    nom: formData.get("nom"),
    description: formData.get("description") || undefined,
    date_creation: formData.get("date_creation") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { error } = await supabase.from("departements").insert(parsed.data);

  if (error) {
    if (error.code === "23505") return { error: "Un département avec ce nom existe déjà." };
    return { error: "Erreur lors de la création." };
  }

  revalidatePath("/departements");
  redirect("/departements");
}

export async function modifierDepartement(id: string, formData: FormData) {
  const supabase = await assertPilotage();

  const parsed = departementSchema.safeParse({
    nom: formData.get("nom"),
    description: formData.get("description") || undefined,
    date_creation: formData.get("date_creation") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { error } = await supabase
    .from("departements")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Un département avec ce nom existe déjà." };
    return { error: "Erreur lors de la modification." };
  }

  revalidatePath("/departements");
  redirect(`/departements/${id}`);
}
