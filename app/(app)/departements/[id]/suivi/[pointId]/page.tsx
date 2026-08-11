import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft } from "lucide-react";
import { PointSuiviDetail } from "@/components/departements/point-suivi-detail";
import { CommentairesSuivi } from "@/components/departements/commentaires-suivi";
import {
  modifierPointSuivi,
  changerStatutPointSuivi,
  supprimerPointSuivi,
  uploaderPieceJointe,
  supprimerPieceJointe,
  ajouterCommentaire,
  supprimerCommentaire,
  ajouterMembreTache,
  retirerMembreTache,
} from "../actions";

export default async function PointSuiviDetailPage({
  params,
}: {
  params: Promise<{ id: string; pointId: string }>;
}) {
  const { id, pointId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // La RLS (fn_peut_voir_tache) filtre deja tout ce que l'appelant ne
  // devrait pas voir : pas de tache trouvee = pas d'acces, pas d'existence.
  const { data: point } = await supabase
    .from("points_suivi")
    .select(
      "id, contenu, description, statut, date_debut, date_fin, date_creation, date_resolution, piece_jointe_path, piece_jointe_nom, liste_id"
    )
    .eq("id", pointId)
    .eq("departement_id", id)
    .single();

  if (!point) notFound();

  // Peut etre null pour un ouvrier ajoute a cette seule tache (sans acces a
  // la liste elle-meme) -- cf. liste?.nom en repli plus bas.
  const { data: liste } = await supabase
    .from("listes_suivi")
    .select("nom")
    .eq("id", point.liste_id)
    .single();

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
      .select("id, role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", id)
      .eq("statut", "actif")
      .single();

    peutGerer = ["president", "vice_president", "secretaire"].includes(aff?.role ?? "");
  }

  // Voir + agir (changer le statut, commenter) : peutGerer, ou membre
  // ajoute a la liste, ou membre de cette tache precise.
  let peutAgir = peutGerer;
  if (!peutAgir) {
    const { data: membreListe } = await supabase
      .from("liste_suivi_membres")
      .select("id")
      .eq("liste_id", point.liste_id)
      .eq("ouvrier_id", moi.id)
      .single();
    const { data: membreTache } = await supabase
      .from("point_suivi_membres")
      .select("id")
      .eq("point_id", pointId)
      .eq("ouvrier_id", moi.id)
      .single();
    peutAgir = !!membreListe || !!membreTache;
  }

  let pieceJointeUrl: string | null = null;
  if (point.piece_jointe_path) {
    const { data: signed } = await supabase.storage
      .from("pieces-jointes")
      .createSignedUrl(point.piece_jointe_path, 60 * 60);
    pieceJointeUrl = signed?.signedUrl ?? null;
  }

  const { data: commentairesData } = await supabase
    .from("commentaires_suivi")
    .select("id, contenu, created_at, auteur_id, mentions")
    .eq("point_suivi_id", pointId)
    .order("created_at", { ascending: true });

  const { data: taguables } = await supabase.rpc("fn_personnes_taguables_suivi", {
    p_point_id: pointId,
  });

  const auteurIds = [...new Set((commentairesData ?? []).map((c) => c.auteur_id))];
  const { data: auteurs } = auteurIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", auteurIds)
    : { data: [] };
  const auteurNomById = Object.fromEntries((auteurs ?? []).map((a) => [a.id, `${a.prenom} ${a.nom}`]));
  const nomById = Object.fromEntries((taguables ?? []).map((t) => [t.id, `${t.prenom} ${t.nom}`]));

  const commentaires = (commentairesData ?? []).map((c) => ({
    ...c,
    auteurNom: auteurNomById[c.auteur_id] ?? "—",
    mentionsNoms: (c.mentions ?? []).map((mid) => nomById[mid]).filter((n): n is string => !!n),
  }));

  // Membres de la tache : uniquement utile (et visible) pour les managers,
  // qui sont seuls a pouvoir gerer cette liste.
  let membresTache: { id: string; prenom: string; nom: string }[] = [];
  let candidatsTache: { id: string; prenom: string; nom: string; email?: string }[] = [];
  if (peutGerer) {
    const { data: membresLiens } = await supabase
      .from("point_suivi_membres")
      .select("ouvrier_id")
      .eq("point_id", pointId);
    const membreIds = (membresLiens ?? []).map((m) => m.ouvrier_id);
    const { data: membresOuvriers } = membreIds.length
      ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", membreIds)
      : { data: [] };
    membresTache = membresOuvriers ?? [];

    // Candidats : ouvriers actifs du departement (hors managers, qui ont
    // deja acces) + le pasteur (role global, pas rattache a un departement).
    const { data: affectationsRoster } = await supabase
      .from("affectations")
      .select("ouvrier_id, role")
      .eq("departement_id", id)
      .eq("statut", "actif")
      .not("role", "in", "(president,vice_president,secretaire)");
    const rosterIds = (affectationsRoster ?? []).map((a) => a.ouvrier_id);
    const { data: rosterOuvriers } = rosterIds.length
      ? await supabase.from("ouvriers").select("id, prenom, nom, email").in("id", rosterIds).order("nom")
      : { data: [] };

    const { data: pasteurs } = await supabase
      .from("ouvriers")
      .select("id, prenom, nom, email")
      .eq("role_global", "pasteur");

    const tousCandidats = [...(rosterOuvriers ?? []), ...(pasteurs ?? [])].filter(
      (o, i, arr) => arr.findIndex((x) => x.id === o.id) === i
    );
    candidatsTache = tousCandidats.filter((o) => !membresTache.some((m) => m.id === o.id));
  }

  // Un ouvrier ajoute a une seule tache (pas la liste) n'a pas acces a la
  // page de la liste -- le "retour" doit alors pointer vers "Mes tâches".
  const retourHref = liste
    ? `/departements/${id}/suivi/liste/${point.liste_id}`
    : "/mon-espace/mes-taches";
  const retourLabel = liste ? liste.nom : "Mes tâches";

  return (
    <>
      <TopBar title={liste?.nom ?? "Suivi"} />

      <div className="p-4 space-y-4">
        <Link
          href={retourHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {retourLabel}
        </Link>

        <PointSuiviDetail
          departementId={id}
          point={point}
          pieceJointeUrl={pieceJointeUrl}
          peutGerer={peutGerer}
          peutAgir={peutAgir}
          modifierAction={modifierPointSuivi.bind(null, id, pointId)}
          changerStatutAction={changerStatutPointSuivi.bind(null, id, pointId)}
          supprimerAction={supprimerPointSuivi.bind(null, id, pointId)}
          uploaderAction={uploaderPieceJointe.bind(null, id, pointId)}
          supprimerPieceJointeAction={supprimerPieceJointe.bind(null, id, pointId)}
          membresTache={membresTache}
          candidatsTache={candidatsTache}
          ajouterMembreTacheAction={ajouterMembreTache.bind(null, id, pointId)}
          retirerMembreTacheAction={retirerMembreTache.bind(null, id, pointId)}
        />

        <CommentairesSuivi
          commentaires={commentaires}
          moiId={moi.id}
          peutSupprimerTout={peutGerer}
          personnesTaguables={taguables ?? []}
          ajouterAction={ajouterCommentaire.bind(null, id, pointId)}
          supprimerAction={supprimerCommentaire.bind(null, id, pointId)}
        />
      </div>
    </>
  );
}
