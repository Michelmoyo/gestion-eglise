import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft } from "lucide-react";
import { ListeSuiviDetail } from "@/components/departements/liste-suivi-detail";
import {
  ajouterPointSuivi,
  changerStatutPointSuivi,
  supprimerPointSuivi,
  modifierListe,
  supprimerListe,
  changerInclureRapport,
  ajouterMembreListe,
  retirerMembreListe,
} from "../../actions";

export default async function ListeSuiviDetailPage({
  params,
}: {
  params: Promise<{ id: string; listeId: string }>;
}) {
  const { id, listeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // La RLS (managers/pilotage OU fn_est_membre_liste) filtre deja tout ce
  // que l'appelant ne devrait pas voir : pas de liste trouvee = pas d'acces.
  const { data: liste } = await supabase
    .from("listes_suivi")
    .select("id, nom, description, inclure_rapport")
    .eq("id", listeId)
    .eq("departement_id", id)
    .single();

  if (!liste) notFound();

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

  // Voir + agir (changer le statut des taches) : peutGerer, ou membre
  // ajoute a cette liste.
  let peutAgir = peutGerer;
  if (!peutAgir) {
    const { data: membreListe } = await supabase
      .from("liste_suivi_membres")
      .select("id")
      .eq("liste_id", listeId)
      .eq("ouvrier_id", moi.id)
      .single();
    peutAgir = !!membreListe;
  }

  const { data: points } = await supabase
    .from("points_suivi")
    .select("id, contenu, statut, piece_jointe_nom")
    .eq("liste_id", listeId)
    .order("date_creation", { ascending: false });

  // Membres + candidats : uniquement utile (et visible) pour les managers.
  let membresListe: { id: string; prenom: string; nom: string }[] = [];
  let candidatsListe: { id: string; prenom: string; nom: string; email?: string }[] = [];
  if (peutGerer) {
    const { data: membresLiens } = await supabase
      .from("liste_suivi_membres")
      .select("ouvrier_id")
      .eq("liste_id", listeId);
    const membreIds = (membresLiens ?? []).map((m) => m.ouvrier_id);
    const { data: membresOuvriers } = membreIds.length
      ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", membreIds)
      : { data: [] };
    membresListe = membresOuvriers ?? [];

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
    candidatsListe = tousCandidats.filter((o) => !membresListe.some((m) => m.id === o.id));
  }

  // Un ouvrier ajoute a cette liste sans etre responsable de departement
  // n'a pas acces a l'apercu d'ensemble -- le "retour" doit alors pointer
  // vers "Mes tâches".
  const retourHref = peutGerer ? `/departements/${id}/suivi` : "/mon-espace/mes-taches";
  const retourLabel = peutGerer ? "Suivi" : "Mes tâches";

  return (
    <>
      <TopBar title={liste.nom} />

      <div className="p-4 space-y-4">
        <Link
          href={retourHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {retourLabel}
        </Link>

        <ListeSuiviDetail
          departementId={id}
          liste={liste}
          items={points ?? []}
          peutGerer={peutGerer}
          peutAgir={peutAgir}
          modifierListeAction={peutGerer ? modifierListe.bind(null, id, listeId) : undefined}
          supprimerListeAction={peutGerer ? supprimerListe.bind(null, id, listeId) : undefined}
          changerInclureRapportAction={peutGerer ? changerInclureRapport.bind(null, id, listeId) : undefined}
          ajouterAction={peutGerer ? ajouterPointSuivi.bind(null, id, listeId) : undefined}
          changerStatutAction={changerStatutPointSuivi.bind(null, id)}
          supprimerAction={peutGerer ? supprimerPointSuivi.bind(null, id) : undefined}
          membresListe={membresListe}
          candidatsListe={candidatsListe}
          ajouterMembreListeAction={peutGerer ? ajouterMembreListe.bind(null, id, listeId) : undefined}
          retirerMembreListeAction={peutGerer ? retirerMembreListe.bind(null, id, listeId) : undefined}
        />
      </div>
    </>
  );
}
