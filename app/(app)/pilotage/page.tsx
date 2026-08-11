import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2, UserPlus, Plus, Church, FileText, Settings, TriangleAlert } from "lucide-react";
import { calculerSante, type Sante } from "@/lib/sante";

const PASTILLE: Record<Sante, { bg: string; label: string }> = {
  vert:   { bg: "bg-green-500",  label: "●" },
  orange: { bg: "bg-orange-400", label: "●" },
  rouge:  { bg: "bg-red-500",    label: "●" },
};

export default async function PilotagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, prenom, nom, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect("/api/auth/signout");

  // ── Stats globales ──────────────────────────────────────────────────────────
  const { count: nbOuvriers } = await supabase
    .from("ouvriers")
    .select("id", { count: "exact", head: true })
    .eq("statut", "actif");

  const { data: departements } = await supabase
    .from("departements")
    .select("id, nom")
    .order("nom");

  const nbDepts = departements?.length ?? 0;

  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split("T")[0];

  const { count: nbActivitesMois } = await supabase
    .from("activites")
    .select("id", { count: "exact", head: true })
    .gte("date_activite", debutMois);

  // ── Calcul santé de chaque département ────────────────────────────────────
  const now = new Date();
  const il_y_a_30 = new Date(now.getTime() - 30 * 86_400_000).toISOString().split("T")[0];
  const il_y_a_60 = new Date(now.getTime() - 60 * 86_400_000).toISOString().split("T")[0];

  const deptIds = (departements ?? []).map((d) => d.id);

  // Dernière activité par département
  const { data: dernieresActivites } = deptIds.length
    ? await supabase
        .from("activites")
        .select("departement_id, date_activite")
        .in("departement_id", deptIds)
        .order("date_activite", { ascending: false })
    : { data: [] };

  // Présences 30 derniers jours
  const { data: activites30j } = deptIds.length
    ? await supabase
        .from("activites")
        .select("id, departement_id")
        .in("departement_id", deptIds)
        .gte("date_activite", il_y_a_30)
    : { data: [] };

  const activite30jIds = (activites30j ?? []).map((a) => a.id);
  const { data: presences30j } = activite30jIds.length
    ? await supabase
        .from("presences")
        .select("activite_id, statut")
        .in("activite_id", activite30jIds)
    : { data: [] };

  // Présences fenêtre précédente (J-60 à J-30) pour détecter la baisse
  const { data: activitesPrev } = deptIds.length
    ? await supabase
        .from("activites")
        .select("id, departement_id")
        .in("departement_id", deptIds)
        .gte("date_activite", il_y_a_60)
        .lt("date_activite", il_y_a_30)
    : { data: [] };

  const activitePrevIds = (activitesPrev ?? []).map((a) => a.id);
  const { data: presencesPrev } = activitePrevIds.length
    ? await supabase
        .from("presences")
        .select("activite_id, statut")
        .in("activite_id", activitePrevIds)
    : { data: [] };

  // Derniers rapports par département
  const { data: derniersRapports } = deptIds.length
    ? await supabase
        .from("rapports")
        .select("departement_id, date_soumission")
        .in("departement_id", deptIds)
        .order("date_soumission", { ascending: false })
    : { data: [] };

  // Calculer la santé pour chaque département
  function tauxMoyen(activitesIds: string[], presences: { activite_id: string; statut: string }[]) {
    const presencesDept = presences.filter((p) => activitesIds.includes(p.activite_id));
    if (!presencesDept.length) return null;
    const presents = presencesDept.filter((p) => p.statut === "present").length;
    return Math.round((presents / presencesDept.length) * 100);
  }

  const santeDepts = (departements ?? []).map((dept) => {
    const activitesIds30j = (activites30j ?? [])
      .filter((a) => a.departement_id === dept.id)
      .map((a) => a.id);

    const activitesIdsPrev = (activitesPrev ?? [])
      .filter((a) => a.departement_id === dept.id)
      .map((a) => a.id);

    const derniereActivite = (dernieresActivites ?? [])
      .find((a) => a.departement_id === dept.id)?.date_activite ?? null;

    const dernierRapport = (derniersRapports ?? [])
      .find((r) => r.departement_id === dept.id)?.date_soumission ?? null;

    const sante = calculerSante({
      dernierActivite: derniereActivite,
      tauxPresence30j: tauxMoyen(activitesIds30j, presences30j ?? []),
      tauxPresencePrev: tauxMoyen(activitesIdsPrev, presencesPrev ?? []),
      dernierRapport,
      absences3Consecutives: false, // calcul simplifié pour le tableau de bord
    });

    return { ...dept, sante };
  });

  const nbRouge = santeDepts.filter((d) => d.sante.statut === "rouge").length;
  const nbOrange = santeDepts.filter((d) => d.sante.statut === "orange").length;

  return (
    <>
      <TopBar title="Pilotage" prenom={moi.prenom} />

      <div className="p-4 space-y-4">

        {/* Actions rapides */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/ouvriers/nouveau">
            <Button className="w-full h-auto py-3 flex-col gap-1 text-xs">
              <UserPlus size={22} />
              <span className="truncate max-w-full">Nouvel ouvrier</span>
            </Button>
          </Link>
          <Link href="/departements/nouveau">
            <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1 text-xs">
              <Plus size={22} />
              <span className="truncate max-w-full">Nouveau département</span>
            </Button>
          </Link>
        </div>

        {/* Chiffres clés */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-primary">{nbOuvriers ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Ouvriers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-primary">{nbDepts}</p>
              <p className="text-xs text-muted-foreground mt-1">Départements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-primary">{nbActivitesMois ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Activités</p>
            </CardContent>
          </Card>
        </div>

        {/* Alertes globales */}
        {(nbRouge > 0 || nbOrange > 0) && (
          <div className="flex gap-2">
            {nbRouge > 0 && (
              <span className="text-xs bg-gold/15 text-gold px-3 py-1 rounded-full font-medium flex items-center gap-1">
                <TriangleAlert size={14} />
                {nbRouge} en difficulté
              </span>
            )}
            {nbOrange > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                🟠 {nbOrange} à surveiller
              </span>
            )}
          </div>
        )}

        {/* Santé des départements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Départements</span>
              <Link href="/departements" className="text-xs text-primary font-normal">
                Voir tous →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            {!santeDepts.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun département créé.
              </p>
            ) : (
              santeDepts.map((dept) => {
                const p = PASTILLE[dept.sante.statut];
                return (
                  <Link key={dept.id} href={`/departements/${dept.id}`}>
                    <div className="flex items-center justify-between py-3 hover:bg-accent/40 -mx-1 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.bg}`}
                          title={dept.sante.alertes.join(" · ") || "Bonne santé"}
                        />
                        <p className="text-sm font-medium">{dept.nom}</p>
                      </div>
                      {dept.sante.alertes.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate max-w-[140px] text-right">
                          {dept.sante.alertes[0]}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Liens rapides */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/ouvriers">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 flex items-center gap-3">
                <Users size={22} className="text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">Ouvriers</p>
                  <p className="text-xs text-muted-foreground truncate">Gérer l&apos;équipe</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/departements">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 flex items-center gap-3">
                <Building2 size={22} className="text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">Départements</p>
                  <p className="text-xs text-muted-foreground truncate">Vue d&apos;ensemble</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/cultes">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 flex items-center gap-3">
                <Church size={22} className="text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">Cultes</p>
                  <p className="text-xs text-muted-foreground truncate">Présence à l&apos;église</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/rapports">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 flex items-center gap-3">
                <FileText size={22} className="text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">Rapports</p>
                  <p className="text-xs text-muted-foreground truncate">Tous les départements</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          {moi.role_global === "pasteur" && (
            <Link href="/parametres">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 flex items-center gap-3">
                  <Settings size={22} className="text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">Paramètres</p>
                    <p className="text-xs text-muted-foreground truncate">Coordonnées de l&apos;église</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
