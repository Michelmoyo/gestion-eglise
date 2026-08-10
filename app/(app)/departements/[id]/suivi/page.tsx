import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft } from "lucide-react";
import { SuiviSection } from "@/components/departements/suivi-section";
import { NouvelleListeForm } from "@/components/departements/nouvelle-liste-form";
import {
  ajouterPointSuivi,
  changerStatutPointSuivi,
  supprimerPointSuivi,
  ajouterListe,
  supprimerListe,
  changerInclureRapport,
  ajouterMembreListe,
  retirerMembreListe,
} from "./actions";

export default async function SuiviPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: dept } = await supabase
    .from("departements")
    .select("id, nom")
    .eq("id", id)
    .single();

  if (!dept) notFound();

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

  // Aperçu d'ensemble (toutes les listes) : reserve aux responsables du
  // departement et au pilotage. Un ouvrier ajoute a une liste ou une tache
  // precise y accede via "Mes tâches", pas ici.
  if (!peutGerer) redirect(`/departements/${id}`);

  const { data: listes } = await supabase
    .from("listes_suivi")
    .select("id, nom, ordre, inclure_rapport")
    .eq("departement_id", id)
    .order("ordre", { ascending: true });

  const { data: points } = await supabase
    .from("points_suivi")
    .select("id, liste_id, contenu, statut, date_creation, date_resolution, piece_jointe_nom")
    .eq("departement_id", id)
    .order("date_creation", { ascending: false });

  // Candidats a l'ajout : ouvriers actifs du departement qui n'ont pas deja
  // acces via un role de gestion (ils l'ont deja, inutile de les "ajouter"),
  // plus le pasteur (role global, pas rattache a un departement precis).
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

  const candidatsDepartement = [...(rosterOuvriers ?? []), ...(pasteurs ?? [])].filter(
    (o, i, arr) => arr.findIndex((x) => x.id === o.id) === i
  );

  const listeIds = (listes ?? []).map((l) => l.id);
  const { data: membresListesLiens } = listeIds.length
    ? await supabase
        .from("liste_suivi_membres")
        .select("liste_id, ouvrier_id")
        .in("liste_id", listeIds)
    : { data: [] };

  const membresListesOuvrierIds = [...new Set((membresListesLiens ?? []).map((m) => m.ouvrier_id))];
  const { data: membresListesOuvriersData } = membresListesOuvrierIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", membresListesOuvrierIds)
    : { data: [] };
  const ouvrierParId = Object.fromEntries((membresListesOuvriersData ?? []).map((o) => [o.id, o]));

  const changerStatut = changerStatutPointSuivi.bind(null, id);
  const supprimerPoint = supprimerPointSuivi.bind(null, id);
  const supprimerListeAction = supprimerListe.bind(null, id);
  const ajouterListeAction = ajouterListe.bind(null, id);
  const changerInclureRapportAction = changerInclureRapport.bind(null, id);

  return (
    <>
      <TopBar title="Suivi du département" />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {dept.nom}
        </Link>

        {!listes?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune liste de suivi pour ce département.
          </p>
        ) : (
          listes.map((liste) => {
            const membresListe = (membresListesLiens ?? [])
              .filter((m) => m.liste_id === liste.id)
              .map((m) => ouvrierParId[m.ouvrier_id])
              .filter((o): o is { id: string; prenom: string; nom: string } => !!o);
            const candidatsListe = candidatsDepartement.filter(
              (c) => !membresListe.some((m) => m.id === c.id)
            );

            return (
              <SuiviSection
                key={liste.id}
                departementId={id}
                listeId={liste.id}
                nom={liste.nom}
                inclureRapport={liste.inclure_rapport}
                items={(points ?? []).filter((p) => p.liste_id === liste.id)}
                peutGerer={peutGerer}
                peutAgir={peutGerer}
                ajouterAction={ajouterPointSuivi.bind(null, id, liste.id)}
                changerStatutAction={changerStatut}
                supprimerAction={supprimerPoint}
                supprimerListeAction={supprimerListeAction}
                changerInclureRapportAction={changerInclureRapportAction}
                membresListe={membresListe}
                candidatsListe={candidatsListe}
                ajouterMembreListeAction={ajouterMembreListe.bind(null, id, liste.id)}
                retirerMembreListeAction={retirerMembreListe.bind(null, id, liste.id)}
              />
            );
          })
        )}

        {peutGerer && <NouvelleListeForm action={ajouterListeAction} />}
      </div>
    </>
  );
}
