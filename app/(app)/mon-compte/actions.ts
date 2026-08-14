"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TAILLE_MAX = 3 * 1024 * 1024;

export async function mettreAJourPhoto(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) return { error: "Utilisateur introuvable." };

  const fichier = formData.get("photo") as File | null;
  if (!fichier || fichier.size === 0) return { error: "Aucun fichier sélectionné." };
  if (!fichier.type.startsWith("image/")) return { error: "Le fichier doit être une image." };
  if (fichier.size > TAILLE_MAX) return { error: "Image trop volumineuse (3 Mo maximum)." };

  const chemin = `${moi.id}/avatar`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(chemin, fichier, { upsert: true, contentType: fichier.type });

  if (uploadError) return { error: `Erreur lors de l'envoi de la photo : ${uploadError.message}` };

  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(chemin);
  const photoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  // Un ouvrier ne peut pas modifier sa propre fiche via un UPDATE direct
  // (reserve au pasteur/assistant) -- cette RPC dediee l'autorise à changer
  // uniquement sa propre photo_url.
  const { error: updateError } = await supabase.rpc("rpc_definir_photo_profil", {
    p_photo_url: photoUrl,
  });

  if (updateError) return { error: `Erreur lors de l'enregistrement : ${updateError.message}` };

  revalidatePath("/mon-compte");
  revalidatePath("/mon-espace");
  return { success: true, photoUrl };
}

// Dediee a "Mon compte" : contrairement a updatePassword() (app/(auth)/actions.ts),
// utilisee pour la definition initiale du mot de passe et qui redirige
// ensuite vers l'accueil, celle-ci reste sur place et affiche une
// confirmation -- changer son mot de passe depuis ses reglages ne doit pas
// faire quitter la page sans un retour visible.
export async function changerMotDePasse(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const password = formData.get("password") as string;
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: "Impossible de mettre à jour le mot de passe." };

  return { success: true };
}

export async function modifierCoordonnees(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const telephone = (formData.get("telephone") as string) || "";
  const adresse = (formData.get("adresse") as string) || "";

  const { error } = await supabase.rpc("rpc_modifier_coordonnees_ouvrier", {
    p_telephone: telephone,
    p_adresse: adresse,
  });

  if (error) return { error: `Erreur lors de l'enregistrement : ${error.message}` };

  revalidatePath("/mon-compte");
  return { success: true };
}
