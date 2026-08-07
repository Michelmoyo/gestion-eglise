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

  const { statsByActivite, nouveauxOuvriers, suspendusOuvriers } = await getDonneesRapport(
    supabase,
    rapport.departement_id,
    rapport.periode
  );

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

      {(nouveauxOuvriers.length > 0 || suspendusOuvriers.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mouvements d&apos;effectifs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nouveauxOuvriers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Nouvelles adhésions</p>
                {nouveauxOuvriers.map((o) => (
                  <p key={o.id} className="text-sm">{o.prenom} {o.nom}</p>
                ))}
              </div>
            )}
            {suspendusOuvriers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-600 mb-1">Suspensions</p>
                {suspendusOuvriers.map((o) => (
                  <p key={o.id} className="text-sm">{o.prenom} {o.nom}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
