import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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

  // Listes entieres dont on est membre -> chacune a maintenant sa propre
  // page, on se contente de renvoyer dessus.
  const { data: membresListe } = await supabase
    .from("liste_suivi_membres")
    .select("liste_id")
    .eq("ouvrier_id", moi.id);

  const listeIds = (membresListe ?? []).map((m) => m.liste_id);
  const { data: listes } = listeIds.length
    ? await supabase
        .from("listes_suivi")
        .select("id, nom, departement_id")
        .in("id", listeIds)
    : { data: [] };

  const deptIdsListes = [...new Set((listes ?? []).map((l) => l.departement_id))];
  const { data: deptsListes } = deptIdsListes.length
    ? await supabase.from("departements").select("id, nom").in("id", deptIdsListes)
    : { data: [] };
  const deptNomById = Object.fromEntries((deptsListes ?? []).map((d) => [d.id, d.nom]));

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
          <EmptyState icon={ListChecks} message="Aucune tâche partagée avec vous pour l'instant." />
        ) : (
          <div className="space-y-16">
            {(listes ?? []).map((liste) => (
              <Link key={liste.id} href={`/departements/${liste.departement_id}/suivi/liste/${liste.id}`}>
                <Card className="hover:bg-primary/5 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ListChecks size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{liste.nom}</p>
                      <p className="text-xs text-muted-foreground truncate">{deptNomById[liste.departement_id] ?? "—"}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}

            {tachesSeules.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground px-1">Tâches individuelles</p>
                {tachesSeules.map((t) => (
                  <Link
                    key={t.id}
                    href={`/departements/${t.departement_id}/suivi/${t.id}`}
                  >
                    <Card className="hover:bg-primary/5 hover:border-primary/30 transition-colors">
                      <CardContent className="p-3 flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{t.contenu}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {deptNomTachesById[t.departement_id] ?? "—"}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
