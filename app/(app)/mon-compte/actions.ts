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

  if (uploadError) return { error: "Erreur lors de l'envoi de la photo." };

  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(chemin);
  const photoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("ouvriers")
    .update({ photo_url: photoUrl })
    .eq("id", moi.id);

  if (updateError) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/mon-compte");
  revalidatePath("/mon-espace");
  return { success: true, photoUrl };
}
