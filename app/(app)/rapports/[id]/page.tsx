import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { format } from "@/lib/format";
import { getDonneesRapport } from "@/lib/rapport";
import { BoutonTelecharger } from "@/components/rapports/bouton-telecharger";

function listeDepuisTexte(texte: string | null): string[] {
  if (!texte) return [];
  return texte.split("\n").map((l) => l.trim()).filter(Boolean);
}

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
    .select("id, departement_id, periode, difficultes, besoins, objectifs, auteur_id, date_soumission")
    .eq("id", id)
    .single();

  if (!rapport || !rapport.departement_id) notFound();

  const { data: dept } = await supabase
    .from("departements")
    .select("nom")
    .eq("id", rapport.departement_id)
    .single();

  const { data: auteur } = await supabase
    .from("ouvriers")
    .select("prenom, nom")
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

  const {
    statsByActivite,
    nbActifs,
    nouveauxOuvriers,
    suspendusOuvriers,
    statsCultes,
    soldeDebut,
    soldeFin,
    mouvementsPeriode,
  } = await getDonneesRapport(supabase, rapport.departement_id, rapport.periode, {
    peutVoirDetailCaisse,
  });

  const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(rapport.periode)
  );

  const difficultes = listeDepuisTexte(rapport.difficultes);
  const besoins = listeDepuisTexte(rapport.besoins);
  const objectifs = listeDepuisTexte(rapport.objectifs);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/rapports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Rapports
        </Link>
        <BoutonTelecharger />
      </div>

      <div className="text-center space-y-1">
        <h1 className="font-bold text-xl">{dept?.nom ?? "Département"}</h1>
        <p className="text-sm text-muted-foreground">Rapport mensuel — <span className="capitalize">{moisLabel}</span></p>
        <p className="text-xs text-muted-foreground">
          Soumis le {format.date(rapport.date_soumission)} par {auteur ? `${auteur.prenom} ${auteur.nom}` : "—"}
        </p>
      </div>

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
              nouveauxOuvriers.map((o) => <p key={o.id} className="text-sm">{o.prenom} {o.nom}</p>)
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-600 mb-1">
              Suspendus ce mois {suspendusOuvriers.length ? `(${suspendusOuvriers.length})` : ""}
            </p>
            {!suspendusOuvriers.length ? (
              <p className="text-sm text-muted-foreground">Aucun.</p>
            ) : (
              suspendusOuvriers.map((o) => <p key={o.id} className="text-sm">{o.prenom} {o.nom}</p>)
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Activités ({statsByActivite.length})</CardTitle>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Présence au culte ({statsCultes.length})</CardTitle>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Difficultés rencontrées</CardTitle>
        </CardHeader>
        <CardContent>
          {!difficultes.length ? (
            <p className="text-sm text-muted-foreground">Aucune.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {difficultes.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Besoins</CardTitle>
        </CardHeader>
        <CardContent>
          {!besoins.length ? (
            <p className="text-sm text-muted-foreground">Aucun.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {besoins.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Objectifs du mois prochain</CardTitle>
        </CardHeader>
        <CardContent>
          {!objectifs.length ? (
            <p className="text-sm text-muted-foreground">Aucun.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {objectifs.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
