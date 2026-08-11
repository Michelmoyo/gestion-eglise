"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ouvrierSchema } from "@/lib/validations/ouvrier";
import { getOrigin } from "@/lib/url";

async function assertPilotage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!ouvrier?.role_global) {
    throw new Error("Accès refusé.");
  }
  return { supabase, user, ouvrierId: ouvrier.id };
}

export async function creerOuvrier(formData: FormData) {
  const { supabase } = await assertPilotage();

  const raw = {
    nom: formData.get("nom") as string,
    postnom: (formData.get("postnom") as string) || undefined,
    prenom: formData.get("prenom") as string,
    email: formData.get("email") as string,
    sexe: (formData.get("sexe") as string) || undefined,
    date_naissance: (formData.get("date_naissance") as string) || undefined,
    telephone: (formData.get("telephone") as string) || undefined,
    adresse: (formData.get("adresse") as string) || undefined,
    date_integration: (formData.get("date_integration") as string) || undefined,
    role_global: (formData.get("role_global") as string) || null,
  };

  const parsed = ouvrierSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { data, error } = await supabase
    .from("ouvriers")
    .insert(parsed.data)
    .select("id, email")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Cet email est déjà utilisé." };
    return { error: "Erreur lors de la création." };
  }

  // Envoyer l'invitation par email (service_role)
  const admin = createAdminClient();
  const origin = await getOrigin();
  await admin.auth.admin.inviteUserByEmail(data.email, {
    redirectTo: `${origin}/reinitialiser-mot-de-passe`,
  });

  revalidatePath("/ouvriers");
  redirect("/ouvriers");
}

// Le lien d'invitation Supabase est a usage unique et expire (parfois
// consomme prematurement par un scanneur de liens cote messagerie). Le
// compte Auth existe deja des le premier envoi (voir on_auth_user_created
// dans schema.sql), donc admin.inviteUserByEmail() echoue systematiquement
// au deuxieme essai avec "user already registered" -- meme si l'ouvrier n'a
// jamais defini de mot de passe. On utilise donc resetPasswordForEmail(),
// exactement le mecanisme deja employe par "mot de passe oublie" : il cible
// un compte existant qu'il soit confirme ou non, et renvoie vers la meme
// page de definition de mot de passe.
export async function renvoyerInvitation(id: string) {
  const { supabase } = await assertPilotage();

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("email")
    .eq("id", id)
    .single();

  if (!ouvrier) return { error: "Ouvrier introuvable." };

  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(ouvrier.email, {
    redirectTo: `${origin}/reinitialiser-mot-de-passe`,
  });

  if (error) return { error: "Erreur lors de l'envoi de l'invitation." };

  return { success: true };
}

export async function modifierOuvrier(id: string, formData: FormData) {
  const { supabase, ouvrierId } = await assertPilotage();

  const raw = {
    nom: formData.get("nom") as string,
    postnom: (formData.get("postnom") as string) || undefined,
    prenom: formData.get("prenom") as string,
    email: formData.get("email") as string,
    sexe: (formData.get("sexe") as string) || undefined,
    date_naissance: (formData.get("date_naissance") as string) || undefined,
    telephone: (formData.get("telephone") as string) || undefined,
    adresse: (formData.get("adresse") as string) || undefined,
    date_integration: (formData.get("date_integration") as string) || undefined,
    role_global: (formData.get("role_global") as string) || null,
  };

  const parsed = ouvrierSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  let error = null;

  // Si l'utilisateur modifie SON PROPRE rôle global pour le retirer (NULL),
  // la policy RLS empêchera l'opération car l'utilisateur perdrait ses droits
  // pendant la transaction. Utiliser le client admin (service_role) pour
  // effectuer cette opération spécifique évite ce blocage.
  if (id === ouvrierId && parsed.data.role_global === null) {
    const admin = createAdminClient();
    const res = await admin
      .from("ouvriers")
      .update(parsed.data)
      .eq("id", id);
    error = res.error;
  } else {
    const res = await supabase
      .from("ouvriers")
      .update(parsed.data)
      .eq("id", id);
    error = res.error;
  }

  if (error) {
    if (error.code === "23505") return { error: "Cet email est déjà utilisé." };
    return { error: "Erreur lors de la modification." };
  }

  revalidatePath("/ouvriers");
  redirect(`/ouvriers/${id}`);
}

export async function desactiverOuvrier(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (moi?.role_global !== "pasteur") {
    return { error: "Seul le pasteur peut désactiver un ouvrier." };
  }

  const { error } = await supabase
    .from("ouvriers")
    .update({ statut: "inactif" })
    .eq("id", id);

  if (error) return { error: "Erreur lors de la désactivation." };

  revalidatePath("/ouvriers");
  redirect("/ouvriers");
}
