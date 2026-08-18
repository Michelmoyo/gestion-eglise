import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, FileDown } from "lucide-react";
import { format } from "@/lib/format";
import { ApercuRapport } from "@/components/rapports/apercu-rapport";
import { SelecteurPeriode } from "@/components/departements/selecteur-periode";
import { soumettrerapport } from "./actions";
import { getDonneesRapport } from "@/lib/rapport";
import { normaliserReference } from "@/components/rapports/document-rapport";

export default async function RapportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ debut?: string; fin?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { id } = await params;

  const { data: dept } = await supabase
    .from("departements")
    .select("id, nom")
    .eq("id", id)
    .single();

  if (!dept) notFound();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, prenom, nom, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;

  const { data: monAff } = await supabase
    .from("affectations")
    .select("role")
    .eq("ouvrier_id", moi.id)
    .eq("departement_id", id)
    .eq("statut", "actif")
    .single();

  const rolesGestion = ["president", "vice_president", "secretaire"];
  const peutSoumettre = isPilotage || rolesGestion.includes(monAff?.role ?? "");

  if (!peutSoumettre) redirect(`/departements/${id}`);

  const peutVoirDetailCaisse =
    isPilotage || ["president", "vice_president", "tresorier"].includes(monAff?.role ?? "");

  const fonctionAuteur = moi.role_global
    ? format.roleGlobal(moi.role_global)
    : format.roleDepartement(monAff?.role ?? "membre");

  // Période sélectionnée (mois courant par défaut) : le président choisit
  // une plage libre avant de générer le rapport, pas forcément un mois
  // calendaire complet.
  const { debut: debutParam, fin: finParam } = await searchParams;
  const now = new Date();
  const aujourdHui = now.toISOString().split("T")[0];
  const premierJourMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const dateValide = /^\d{4}-\d{2}-\d{2}$/;

  const periodeDebut = dateValide.test(debutParam ?? "") ? debutParam! : premierJourMois;
  const periodeFin =
    dateValide.test(finParam ?? "") && finParam! >= periodeDebut ? finParam! : aujourdHui;

  // Rapport existant pour cette période exacte
  const { data: rapportExistant } = await supabase
    .from("rapports")
    .select("*")
    .eq("departement_id", id)
    .eq("periode_debut", periodeDebut)
    .eq("periode_fin", periodeFin)
    .single();

  // Données calculées pour le rapport pré-rempli
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
    listesSuivi,
    pointsSuivi,
    suiviInclus,
  } = await getDonneesRapport(supabase, id, periodeDebut, periodeFin, { peutVoirDetailCaisse });

  const suiviOuvert = (listeId: string) =>
    pointsSuivi.filter((p) => p.liste_id === listeId && p.statut !== "termine");

  const action = soumettrerapport.bind(null, id);
  const periodeLabel = format.periode(periodeDebut, periodeFin);

  const { data: parametres } = await supabase
    .from("parametres_eglise")
    .select("nom_eglise, reseau, adresse, telephone, email, logo_url")
    .limit(1)
    .single();

  const nomEglise = parametres?.nom_eglise || "Église";
  const contactLigne2 = [parametres?.telephone, parametres?.email].filter(Boolean).join(" · ");
  const reference = `RAP-${periodeDebut.replace(/-/g, "")}-${normaliserReference(dept.nom)}`;

  return (
    <>
      <TopBar title="Rapport" />

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/departements/${id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            {dept.nom}
          </Link>
          <Link
            href={`/departements/${id}/rapports`}
            className="text-xs text-primary"
          >
            Historique →
          </Link>
        </div>

        {/* Sélection de la période -- plage de dates libre (plus
            nécessairement un mois calendaire complet). */}
        <SelecteurPeriode
          departementId={id}
          periodeDebut={periodeDebut}
          periodeFin={periodeFin}
          aujourdHui={aujourdHui}
        />

        <div className="text-center">
          <h2 className="font-semibold text-lg capitalize">{periodeLabel}</h2>
          {rapportExistant && (
            <>
              <p className="text-xs text-green-600 mt-1">
                Soumis le {format.date(rapportExistant.date_soumission)}
              </p>
              <Link
                href={`/rapports/${rapportExistant.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary mt-1"
              >
                <FileDown size={13} />
                Voir en document / télécharger
              </Link>
            </>
          )}
        </div>

        {/* État des ouvriers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">État des ouvriers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <span className="font-semibold text-lg">{nbActifs}</span>{" "}
              <span className="text-muted-foreground">actif{nbActifs > 1 ? "s" : ""} actuellement</span>
            </p>
            <div>
              <p className="text-xs font-semibold text-green-700 mb-1">
                Adhérents ce mois {nouveauxOuvriers.length ? `(${nouveauxOuvriers.length})` : ""}
              </p>
              {!nouveauxOuvriers.length ? (
                <p className="text-sm text-muted-foreground">Aucun.</p>
              ) : (
                nouveauxOuvriers.map((o) => (
                  <p key={o.id} className="text-sm">{o.prenom} {o.nom}</p>
                ))
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-600 mb-1">
                Ouvriers suspendus {suspendusOuvriers.length ? `(${suspendusOuvriers.length})` : ""}
              </p>
              {!suspendusOuvriers.length ? (
                <p className="text-sm text-muted-foreground">Aucun.</p>
              ) : (
                suspendusOuvriers.map((o) => (
                  <p key={o.id} className="text-sm">
                    {o.prenom} {o.nom}
                    {o.date_changement_statut && (
                      <span className="text-xs text-muted-foreground"> · depuis le {format.date(o.date_changement_statut)}</span>
                    )}
                  </p>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activités du mois */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Activités ce mois ({statsByActivite.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {!statsByActivite.length ? (
              <p className="text-sm text-muted-foreground py-2">Aucune activité ce mois.</p>
            ) : (
              statsByActivite.map((a) => (
                <div key={a.id} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{a.titre}</p>
                    <p className="text-xs text-muted-foreground">{format.date(a.date_activite)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {a.taux !== null ? `${a.nbPresent}/${a.nbTotal} (${a.taux}%)` : "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Présence au culte des membres du département */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Présence au culte ({statsCultes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {!statsCultes.length ? (
              <p className="text-sm text-muted-foreground py-2">Aucun culte ce mois.</p>
            ) : (
              statsCultes.map((c) => (
                <div key={c.id} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{c.type}</p>
                    <p className="text-xs text-muted-foreground">{format.date(c.date_culte)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.taux !== null ? `${c.nbPresent}/${c.nbTotal} (${c.taux}%)` : "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Caisse de la période */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Caisse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Solde en début de période</span>
              <span className="font-medium">{format.montant(soldeDebut)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Solde en fin de période</span>
              <span className="font-medium">{format.montant(soldeFin)}</span>
            </div>
            {peutVoirDetailCaisse ? (
              <div className="pt-2 border-t border-border divide-y divide-border">
                {!mouvementsPeriode.length ? (
                  <p className="text-sm text-muted-foreground py-2">Aucun mouvement ce mois.</p>
                ) : (
                  mouvementsPeriode.map((m) => (
                    <div key={m.id} className="py-2 flex items-start justify-between gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p>{m.motif || (m.type === "entree" ? "Entrée" : "Sortie")}</p>
                        <p className="text-xs text-muted-foreground">{format.date(m.date_mouvement)}</p>
                      </div>
                      <span className={m.type === "entree" ? "text-green-600" : "text-destructive"}>
                        {m.type === "entree" ? "+" : "-"}{format.montant(m.montant)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Détail des mouvements réservé au président, vice-président ou trésorier.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Suivi du département — géré depuis /suivi, prévisualisé ici.
            Seules les listes marquées "inclure dans le rapport" apparaissent :
            c'est un aperçu de ce que la soumission va effectivement capturer. */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Suivi inclus dans le rapport</span>
              <Link href={`/departements/${id}/suivi`} className="text-xs text-primary font-normal">
                Gérer →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!listesSuivi.some((l) => l.inclure_rapport) ? (
              <p className="text-sm text-muted-foreground">
                Aucune liste incluse dans le rapport. Choisis-en depuis « Gérer ».
              </p>
            ) : (
              listesSuivi.filter((l) => l.inclure_rapport).map((liste) => {
                const items = suiviOuvert(liste.id);
                return (
                  <div key={liste.id}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      {liste.nom} ({items.length})
                    </p>
                    {!items.length ? (
                      <p className="text-sm text-muted-foreground">Aucun élément ouvert.</p>
                    ) : (
                      items.map((p) => <p key={p.id} className="text-sm">{p.contenu}</p>)
                    )}
                  </div>
                );
              })
            )}
            {listesSuivi.some((l) => !l.inclure_rapport) && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                {listesSuivi.filter((l) => !l.inclure_rapport).length} liste
                {listesSuivi.filter((l) => !l.inclure_rapport).length > 1 ? "s" : ""} non incluse
                {listesSuivi.filter((l) => !l.inclure_rapport).length > 1 ? "s" : ""} dans le rapport.
              </p>
            )}
          </CardContent>
        </Card>

        <ApercuRapport
          action={action}
          periodeDebut={periodeDebut}
          periodeFin={periodeFin}
          dejaSoumis={!!rapportExistant}
          documentProps={{
            nomEglise,
            reseau: parametres?.reseau ?? null,
            adresse: parametres?.adresse ?? null,
            contactLigne2,
            logoUrl: parametres?.logo_url ?? null,
            deptNom: dept.nom,
            periodeLabel,
            periodeDebut,
            periodeFin,
            reference,
            auteurNom: `${moi.prenom} ${moi.nom}`,
            fonctionAuteur,
            nbActifs,
            nouveauxOuvriers,
            suspendusOuvriers,
            roster,
            statsByActivite,
            presenceActiviteParOuvrier,
            statsCultes,
            presenceCulteParOuvrier,
            soldeDebut,
            soldeFin,
            peutVoirDetailCaisse,
            mouvementsPeriode,
            blocsSuivi: suiviInclus,
          }}
        />
      </div>
    </>
  );
}
