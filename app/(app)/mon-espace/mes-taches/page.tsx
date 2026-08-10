import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuiviSection } from "@/components/departements/suivi-section";
import { changerStatutPointSuivi } from "@/app/(app)/departements/[id]/suivi/actions";

// Pour un ouvrier ajoute a une liste ou une tache de suivi sans etre
// responsable de departement : le seul endroit ou il retrouve ce qui lui a
// ete partage, sans deverrouiller le reste de la section Suivi (reservee
// aux responsables/pilotage, cf. /departements/[id]/suivi).
export default async function MesTachesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  // Listes entieres dont on est membre.
  const { data: membresListe } = await supabase
    .from("liste_suivi_membres")
    .select("liste_id")
    .eq("ouvrier_id", moi.id);

  const listeIds = (membresListe ?? []).map((m) => m.liste_id);
  const { data: listes } = listeIds.length
    ? await supabase
        .from("listes_suivi")
        .select("id, nom, departement_id, inclure_rapport")
        .in("id", listeIds)
    : { data: [] };

  const deptIdsListes = [...new Set((listes ?? []).map((l) => l.departement_id))];
  const { data: deptsListes } = deptIdsListes.length
    ? await supabase.from("departements").select("id, nom").in("id", deptIdsListes)
    : { data: [] };
  const deptNomById = Object.fromEntries((deptsListes ?? []).map((d) => [d.id, d.nom]));

  const { data: pointsListes } = listeIds.length
    ? await supabase
        .from("points_suivi")
        .select("id, liste_id, contenu, statut, date_creation, date_resolution, piece_jointe_nom")
        .in("liste_id", listeIds)
    : { data: [] };

  // Taches individuelles -- seulement celles dont la liste n'est pas deja
  // couverte ci-dessus (sinon la tache apparaitrait deux fois).
  const { data: membresTache } = await supabase
    .from("point_suivi_membres")
    .select("point_id")
    .eq("ouvrier_id", moi.id);

  const pointIds = (membresTache ?? []).map((m) => m.point_id);
  const { data: tachesSeulesData } = pointIds.length
    ? await supabase
        .from("points_suivi")
        .select("id, contenu, statut, departement_id, liste_id")
        .in("id", pointIds)
    : { data: [] };
  const tachesSeules = (tachesSeulesData ?? []).filter((t) => !listeIds.includes(t.liste_id));

  const deptIdsTaches = [...new Set(tachesSeules.map((t) => t.departement_id))];
  const { data: deptsTaches } = deptIdsTaches.length
    ? await supabase.from("departements").select("id, nom").in("id", deptIdsTaches)
    : { data: [] };
  const deptNomTachesById = Object.fromEntries((deptsTaches ?? []).map((d) => [d.id, d.nom]));

  const aucunAcces = !listes?.length && !tachesSeules.length;

  return (
    <>
      <TopBar title="Mes tâches" />

      <div className="p-4 space-y-4">
        <Link
          href="/mon-espace"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Mon espace
        </Link>

        {aucunAcces ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune tâche partagée avec vous pour l&apos;instant.
          </p>
        ) : (
          <>
            {(listes ?? []).map((liste) => (
              <div key={liste.id} className="space-y-1">
                <p className="text-xs text-muted-foreground px-1">{deptNomById[liste.departement_id] ?? "—"}</p>
                <SuiviSection
                  departementId={liste.departement_id}
                  listeId={liste.id}
                  nom={liste.nom}
                  inclureRapport={liste.inclure_rapport}
                  items={(pointsListes ?? []).filter((p) => p.liste_id === liste.id)}
                  peutGerer={false}
                  peutAgir={true}
                  changerStatutAction={changerStatutPointSuivi.bind(null, liste.departement_id)}
                />
              </div>
            ))}

            {tachesSeules.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tâches individuelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tachesSeules.map((t) => (
                    <Link
                      key={t.id}
                      href={`/departements/${t.departement_id}/suivi/${t.id}`}
                      className="flex items-center justify-between gap-2 text-sm hover:underline"
                    >
                      <span className="truncate">{t.contenu}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {deptNomTachesById[t.departement_id] ?? "—"}
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
