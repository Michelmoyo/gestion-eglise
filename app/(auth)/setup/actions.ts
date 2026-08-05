"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const setupSchema = z.object({
  prenom: z.string().min(2, "Prénom requis"),
  nom: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
});

export async function setupPasteur(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  // Vérifier qu'aucun pasteur n'existe déjà (protection contre les appels répétés)
  const supabase = await createClient();
  const { count } = await supabase
    .from("ouvriers")
    .select("id", { count: "exact", head: true })
    .eq("role_global", "pasteur");

  if ((count ?? 0) > 0) {
    redirect("/connexion");
  }

  const raw = {
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = setupSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Données invalides.";
    return { error: firstError };
  }

  const { prenom, nom, email, password } = parsed.data;
  const admin = createAdminClient();

  // Créer le compte Auth avec email confirmé d'emblée
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Impossible de créer le compte." };
  }

  // Créer la fiche ouvrier pasteur liée au compte Auth
  const { error: ouvrierError } = await admin.from("ouvriers").insert({
    auth_user_id: authData.user.id,
    prenom,
    nom,
    email,
    role_global: "pasteur",
    statut: "actif",
    date_integration: new Date().toISOString().split("T")[0],
  });

  if (ouvrierError) {
    // Rollback : supprimer le compte Auth créé
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "Impossible de créer la fiche pasteur." };
  }

  redirect("/connexion");
}
