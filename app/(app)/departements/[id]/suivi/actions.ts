"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  pointSuiviSchema,
  detailPointSuiviSchema,
  listeSuiviSchema,
  commentaireSuiviSchema,
  MAX_TAILLE_PIECE_JOINTE,
} from "@/lib/validations/suivi";

const BUCKET_PIECES_JOINTES = "pieces-jointes";

async function getContexte(departementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;
  let peutGerer = isPilotage;

  if (!isPilotage) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", departementId)
      .eq("statut", "actif")
      .single();

    peutGerer = ["president", "vice_president", "secretaire"].includes(aff?.role ?? "");
  }

  // Le suivi est une information sensible : seuls les responsables du
  // departement et le pilotage y ont acces, meme en lecture (pas de notion
  // de "peutVoir" plus large pour un simple ouvrier -- cf. rls_policies.sql).
  return { supabase, moi, peutGerer };
}

export async function ajouterListe(departementId: string, formData: FormData) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const parsed = listeSuiviSchema.safeParse({ nom: formData.get("nom") });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Données invalides." };

  const { count } = await supabase
    .from("listes_suivi")
    .select("id", { count: "exact", head: true })
    .eq("departement_id", departementId);

  const { error } = await supabase.from("listes_suivi").insert({
    departement_id: departementId,
    nom: parsed.data.nom,
    ordre: count ?? 0,
    cree_par: moi.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "Une liste porte déjà ce nom." };
    return { error: "Erreur lors de l'ajout." };
  }

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function supprimerListe(departementId: string, listeId: string) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("listes_suivi")
    .delete()
    .eq("id", listeId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur lors de la suppression." };

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function ajouterPointSuivi(
  departementId: string,
  listeId: string,
  formData: FormData
) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const parsed = pointSuiviSchema.safeParse({
    liste_id: listeId,
    contenu: formData.get("contenu"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { error } = await supabase.from("points_suivi").insert({
    departement_id: departementId,
    liste_id: parsed.data.liste_id,
    contenu: parsed.data.contenu,
    cree_par: moi.id,
  });

  if (error) return { error: "Erreur lors de l'ajout." };

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function resoudrePointSuivi(departementId: string, pointId: string) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("points_suivi")
    .update({
      resolu: true,
      date_resolution: new Date().toISOString().split("T")[0],
      resolu_par: moi.id,
    })
    .eq("id", pointId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur." };

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function rouvrirPointSuivi(departementId: string, pointId: string) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("points_suivi")
    .update({ resolu: false, date_resolution: null, resolu_par: null })
    .eq("id", pointId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur." };

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function supprimerPointSuivi(departementId: string, pointId: string) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { data: point } = await supabase
    .from("points_suivi")
    .select("piece_jointe_path")
    .eq("id", pointId)
    .eq("departement_id", departementId)
    .single();

  const { error } = await supabase
    .from("points_suivi")
    .delete()
    .eq("id", pointId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur lors de la suppression." };

  if (point?.piece_jointe_path) {
    await supabase.storage.from(BUCKET_PIECES_JOINTES).remove([point.piece_jointe_path]);
  }

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function modifierPointSuivi(
  departementId: string,
  pointId: string,
  formData: FormData
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const parsed = detailPointSuiviSchema.safeParse({
    contenu: formData.get("contenu"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { error } = await supabase
    .from("points_suivi")
    .update({
      contenu: parsed.data.contenu,
      description: parsed.data.description || null,
    })
    .eq("id", pointId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  return { success: true };
}

export async function uploaderPieceJointe(
  departementId: string,
  pointId: string,
  formData: FormData
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { error: "Aucun fichier sélectionné." };
  }
  if (fichier.size > MAX_TAILLE_PIECE_JOINTE) {
    return { error: "Fichier trop volumineux (max 10 Mo)." };
  }

  const { data: point } = await supabase
    .from("points_suivi")
    .select("piece_jointe_path")
    .eq("id", pointId)
    .eq("departement_id", departementId)
    .single();

  const cheminSafe = fichier.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const chemin = `${departementId}/${pointId}-${Date.now()}-${cheminSafe}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_PIECES_JOINTES)
    .upload(chemin, fichier);

  if (uploadError) return { error: "Échec du téléversement." };

  const { error } = await supabase
    .from("points_suivi")
    .update({ piece_jointe_path: chemin, piece_jointe_nom: fichier.name })
    .eq("id", pointId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur lors de l'enregistrement." };

  if (point?.piece_jointe_path) {
    await supabase.storage.from(BUCKET_PIECES_JOINTES).remove([point.piece_jointe_path]);
  }

  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  return { success: true };
}

export async function supprimerPieceJointe(departementId: string, pointId: string) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { data: point } = await supabase
    .from("points_suivi")
    .select("piece_jointe_path")
    .eq("id", pointId)
    .eq("departement_id", departementId)
    .single();

  if (!point?.piece_jointe_path) return { success: true };

  await supabase.storage.from(BUCKET_PIECES_JOINTES).remove([point.piece_jointe_path]);

  const { error } = await supabase
    .from("points_suivi")
    .update({ piece_jointe_path: null, piece_jointe_nom: null })
    .eq("id", pointId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur." };

  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  return { success: true };
}

export async function ajouterCommentaire(
  departementId: string,
  pointId: string,
  formData: FormData
) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const parsed = commentaireSuiviSchema.safeParse({ contenu: formData.get("contenu") });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Commentaire invalide." };

  // Les mentions soumises par le client sont revalidees contre la meme
  // liste "taguable" cote serveur -- on ne fait jamais confiance aux ids
  // envoyes tels quels.
  const mentionsSoumises = formData.getAll("mentions").map(String);
  let mentions: string[] = [];
  if (mentionsSoumises.length) {
    const { data: taguables } = await supabase.rpc("fn_personnes_taguables_suivi", {
      p_departement_id: departementId,
    });
    const idsTaguables = new Set((taguables ?? []).map((t) => t.id));
    mentions = mentionsSoumises.filter((id) => idsTaguables.has(id));
  }

  const { error } = await supabase.from("commentaires_suivi").insert({
    point_suivi_id: pointId,
    departement_id: departementId,
    auteur_id: moi.id,
    contenu: parsed.data.contenu,
    mentions,
  });

  if (error) return { error: "Erreur lors de l'envoi." };

  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  return { success: true };
}

export async function supprimerCommentaire(
  departementId: string,
  pointId: string,
  commentaireId: string
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("commentaires_suivi")
    .delete()
    .eq("id", commentaireId)
    .eq("point_suivi_id", pointId);

  if (error) return { error: "Erreur lors de la suppression (peut-être pas votre commentaire)." };

  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  return { success: true };
}
