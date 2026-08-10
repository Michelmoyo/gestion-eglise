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

  // Information sensible : un simple ouvrier (membre, tresorier) n'a pas
  // acces a cette page du tout, pas meme en lecture seule.
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
          listes.map((liste) => (
            <SuiviSection
              key={liste.id}
              departementId={id}
              listeId={liste.id}
              nom={liste.nom}
              inclureRapport={liste.inclure_rapport}
              items={(points ?? []).filter((p) => p.liste_id === liste.id)}
              peutGerer={peutGerer}
              ajouterAction={ajouterPointSuivi.bind(null, id, liste.id)}
              changerStatutAction={changerStatut}
              supprimerAction={supprimerPoint}
              supprimerListeAction={supprimerListeAction}
              changerInclureRapportAction={changerInclureRapportAction}
            />
          ))
        )}

        {peutGerer && <NouvelleListeForm action={ajouterListeAction} />}
      </div>
    </>
  );
}
