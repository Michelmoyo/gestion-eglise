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
import type { StatutPointSuiviEnum } from "@/lib/supabase/types";

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

  // Gestion structurelle du suivi (ajouter/supprimer une tache ou une liste,
  // changer l'inclusion au rapport, gerer les membres) : reservee aux
  // responsables du departement et au pilotage. Voir/agir sur une tache
  // precise est plus large (managers + membres ajoutes) -- gere directement
  // par les RLS/RPC concernees, pas ici (cf. rls_policies.sql).
  return { supabase, moi, peutGerer };
}

async function getUtilisateur() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  return { supabase, moi };
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

export async function changerInclureRapport(
  departementId: string,
  listeId: string,
  inclure: boolean
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("listes_suivi")
    .update({ inclure_rapport: inclure })
    .eq("id", listeId)
    .eq("departement_id", departementId);

  if (error) return { error: "Erreur." };

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

export async function ajouterMembreListe(
  departementId: string,
  listeId: string,
  ouvrierId: string
) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase.from("liste_suivi_membres").insert({
    liste_id: listeId,
    ouvrier_id: ouvrierId,
    ajoute_par: moi.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "Déjà membre de cette liste." };
    return { error: "Erreur lors de l'ajout." };
  }

  revalidatePath(`/departements/${departementId}/suivi`);
  return { success: true };
}

export async function retirerMembreListe(
  departementId: string,
  listeId: string,
  ouvrierId: string
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("liste_suivi_membres")
    .delete()
    .eq("liste_id", listeId)
    .eq("ouvrier_id", ouvrierId);

  if (error) return { error: "Erreur." };

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

// Ouvert aux managers ET aux membres ajoutes a la liste ou a cette tache
// precise (voir + agir). L'autorisation est verifiee par la fonction SQL
// elle-meme (fn_peut_voir_tache), pas ici -- la policy UPDATE directe sur
// points_suivi reste reservee aux managers (elle couvre aussi contenu/
// description), d'ou le passage par une fonction dediee.
export async function changerStatutPointSuivi(
  departementId: string,
  pointId: string,
  statut: StatutPointSuiviEnum
) {
  const { supabase } = await getUtilisateur();

  const { error } = await supabase.rpc("rpc_changer_statut_point_suivi", {
    p_point_id: pointId,
    p_statut: statut,
  });

  if (error) return { error: "Accès refusé ou erreur." };

  revalidatePath(`/departements/${departementId}/suivi`);
  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  revalidatePath("/mon-espace/mes-taches");
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

export async function ajouterMembreTache(
  departementId: string,
  pointId: string,
  ouvrierId: string
) {
  const { supabase, moi, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase.from("point_suivi_membres").insert({
    point_id: pointId,
    ouvrier_id: ouvrierId,
    ajoute_par: moi.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "Déjà membre de cette tâche." };
    return { error: "Erreur lors de l'ajout." };
  }

  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  return { success: true };
}

export async function retirerMembreTache(
  departementId: string,
  pointId: string,
  ouvrierId: string
) {
  const { supabase, peutGerer } = await getContexte(departementId);
  if (!peutGerer) return { error: "Accès refusé." };

  const { error } = await supabase
    .from("point_suivi_membres")
    .delete()
    .eq("point_id", pointId)
    .eq("ouvrier_id", ouvrierId);

  if (error) return { error: "Erreur." };

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

// Ouvert aux managers ET aux membres (liste ou tache) : la policy RLS
// commentaires_suivi_insert (fn_peut_voir_tache) fait foi.
export async function ajouterCommentaire(
  departementId: string,
  pointId: string,
  formData: FormData
) {
  const { supabase, moi } = await getUtilisateur();

  const parsed = commentaireSuiviSchema.safeParse({ contenu: formData.get("contenu") });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Commentaire invalide." };

  // Les mentions soumises par le client sont revalidees contre la meme
  // liste "taguable" cote serveur -- on ne fait jamais confiance aux ids
  // envoyes tels quels.
  const mentionsSoumises = formData.getAll("mentions").map(String);
  let mentions: string[] = [];
  if (mentionsSoumises.length) {
    const { data: taguables } = await supabase.rpc("fn_personnes_taguables_suivi", {
      p_point_id: pointId,
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

  if (error) return { error: "Erreur lors de l'envoi (accès refusé ?)." };

  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  return { success: true };
}

// Suppression : l'auteur (managers ou membres, sur leur propre commentaire)
// ou tout manager -- la policy RLS commentaires_suivi_delete fait foi, pas
// de gate peutGerer ici sinon un membre ne pourrait jamais retirer son propre
// commentaire.
export async function supprimerCommentaire(
  departementId: string,
  pointId: string,
  commentaireId: string
) {
  const { supabase } = await getUtilisateur();

  const { error } = await supabase
    .from("commentaires_suivi")
    .delete()
    .eq("id", commentaireId)
    .eq("point_suivi_id", pointId);

  if (error) return { error: "Erreur lors de la suppression (peut-être pas votre commentaire)." };

  revalidatePath(`/departements/${departementId}/suivi/${pointId}`);
  return { success: true };
}
