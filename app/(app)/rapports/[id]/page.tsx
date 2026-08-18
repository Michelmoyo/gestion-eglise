import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import { format } from "@/lib/format";
import { getDonneesRapport } from "@/lib/rapport";
import { BoutonTelecharger } from "@/components/rapports/bouton-telecharger";
import { DocumentRapport, normaliserReference } from "@/components/rapports/document-rapport";

export default async function RapportDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: rapport } = await supabase
    .from("rapports")
    .select("id, departement_id, periode_debut, periode_fin, difficultes, besoins, objectifs, suivi_snapshot, auteur_id, date_soumission")
    .eq("id", id)
    .single();

  if (!rapport || !rapport.departement_id) notFound();

  const { data: dept } = await supabase
    .from("departements")
    .select("nom")
    .eq("id", rapport.departement_id)
    .single();

  if (!dept) notFound();

  const { data: auteur } = await supabase
    .from("ouvriers")
    .select("prenom, nom, role_global")
    .eq("id", rapport.auteur_id)
    .single();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  let peutVoirDetailCaisse = !!moi?.role_global;
  if (moi && !peutVoirDetailCaisse) {
    const { data: monAff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", rapport.departement_id)
      .eq("statut", "actif")
      .single();
    peutVoirDetailCaisse = ["president", "vice_president", "tresorier"].includes(monAff?.role ?? "");
  }

  // Fonction du rédacteur : son rôle global s'il est pilotage, sinon son
  // rôle actuel dans ce département.
  let fonctionAuteur = "—";
  if (auteur?.role_global) {
    fonctionAuteur = format.roleGlobal(auteur.role_global);
  } else {
    const { data: affAuteur } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", rapport.auteur_id)
      .eq("departement_id", rapport.departement_id)
      .eq("statut", "actif")
      .single();
    fonctionAuteur = affAuteur ? format.roleDepartement(affAuteur.role) : "Ouvrier";
  }

  const { data: parametres } = await supabase
    .from("parametres_eglise")
    .select("nom_eglise, reseau, adresse, telephone, email, logo_url")
    .limit(1)
    .single();

  const {
    roster,
    statsByActivite,
    presenceActiviteParOuvrier,
    nbActifs,
    nouveauxOuvriers,
    suspendusOuvriers,
    statsCultes,
    presenceCulteParOuvrier,
    soldeDebut,
    soldeFin,
    mouvementsPeriode,
  } = await getDonneesRapport(supabase, rapport.departement_id, rapport.periode_debut, rapport.periode_fin, {
    peutVoirDetailCaisse,
  });

  const periodeLabel = format.periode(rapport.periode_debut, rapport.periode_fin);
  const reference = `RAP-${rapport.periode_debut.replace(/-/g, "")}-${normaliserReference(dept.nom)}`;

  // suivi_snapshot est le format courant (nombre de listes variable, cf.
  // listes_suivi.inclure_rapport). Les rapports soumis avant l'introduction
  // des listes personnalisees n'ont que les 3 colonnes figees historiques.
  const blocsSuivi: { nom: string; texte: string | null }[] =
    rapport.suivi_snapshot && rapport.suivi_snapshot.length
      ? rapport.suivi_snapshot
      : [
          { nom: "Difficultés", texte: rapport.difficultes },
          { nom: "Besoins", texte: rapport.besoins },
          { nom: "Objectifs", texte: rapport.objectifs },
        ];

  const nomEglise = parametres?.nom_eglise || "Église";
  const contactLigne2 = [parametres?.telephone, parametres?.email].filter(Boolean).join(" · ");

  return (
    // Le layout partage (app)/layout.tsx centre tout dans un conteneur
    // max-w-lg (~512px) pense pour les ecrans "app mobile" — beaucoup trop
    // etroit pour ce document (860px). On en sort volontairement ici.
    <div
      className="min-h-screen bg-background py-6 px-4"
      style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}
    >
      <div className="max-w-[860px] mx-auto flex items-center justify-between mb-4 print:hidden">
        <Link
          href="/rapports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Rapports
        </Link>
        <BoutonTelecharger />
      </div>

      <DocumentRapport
        nomEglise={nomEglise}
        reseau={parametres?.reseau ?? null}
        adresse={parametres?.adresse ?? null}
        contactLigne2={contactLigne2}
        logoUrl={parametres?.logo_url ?? null}
        deptNom={dept.nom}
        periodeLabel={periodeLabel}
        periodeDebut={rapport.periode_debut}
        periodeFin={rapport.periode_fin}
        reference={reference}
        statutLabel="Soumis"
        auteurNom={auteur ? `${auteur.prenom} ${auteur.nom}` : "—"}
        fonctionAuteur={fonctionAuteur}
        dateAffichee={format.date(rapport.date_soumission)}
        nbActifs={nbActifs}
        nouveauxOuvriers={nouveauxOuvriers}
        suspendusOuvriers={suspendusOuvriers}
        roster={roster}
        statsByActivite={statsByActivite}
        presenceActiviteParOuvrier={presenceActiviteParOuvrier}
        statsCultes={statsCultes}
        presenceCulteParOuvrier={presenceCulteParOuvrier}
        soldeDebut={soldeDebut}
        soldeFin={soldeFin}
        peutVoirDetailCaisse={peutVoirDetailCaisse}
        mouvementsPeriode={mouvementsPeriode}
        blocsSuivi={blocsSuivi}
      />
    </div>
  );
}
