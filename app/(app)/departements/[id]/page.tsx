import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, CalendarDays, Pin, Church, Wallet, FileText, Users } from "lucide-react";
import { format } from "@/lib/format";
import { calculerSante, type Sante } from "@/lib/sante";

const PASTILLE: Record<Sante, { bg: string; label: string }> = {
  vert: { bg: "bg-green-500", label: "Bonne santé" },
  orange: { bg: "bg-orange-400", label: "À surveiller" },
  rouge: { bg: "bg-red-500", label: "En difficulté" },
};

export default async function DepartementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { id } = await params;

  const { data: dept } = await supabase
    .from("departements")
    .select("*")
    .eq("id", id)
    .single();

  if (!dept) notFound();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  const isPilotage = !!moi?.role_global;

  // Vérifier que l'utilisateur a accès à ce département
  if (!isPilotage && moi) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("id")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", id)
      .eq("statut", "actif")
      .single();
    if (!aff) redirect("/departements");
  }

  // Affectation de l'utilisateur courant dans ce département
  const { data: monAff } = moi
    ? await supabase
        .from("affectations")
        .select("role, statut")
        .eq("ouvrier_id", moi.id)
        .eq("departement_id", id)
        .single()
    : { data: null };

  const peutGerer =
    isPilotage ||
    ["president", "vice_president", "secretaire"].includes(monAff?.role ?? "");

  // Un simple membre n'a pas accès aux effectifs nommés (président,
  // vice-président, secrétaire, trésorier en revanche les voient).
  const estSimpleMembre = !isPilotage && (monAff?.role ?? "membre") === "membre";

  // Le solde de caisse est réservé au pilotage, président, vice-président et
  // trésorier -- ni le secrétaire ni un simple membre n'y ont accès
  // (cahier des charges §3.5, §3.7).
  const peutVoirCaisse =
    isPilotage || ["president", "vice_president", "tresorier"].includes(monAff?.role ?? "");

  // Effectifs du département
  const { data: effectifs } = await supabase
    .from("v_effectifs_departement")
    .select("ouvrier_id, nom, prenom, role, statut, date_affectation, date_changement_statut")
    .eq("departement_id", id)
    .order("statut", { ascending: true });

  const nbActifs = effectifs?.filter((e) => e.statut === "actif").length ?? 0;
  const nbSuspendus = effectifs?.filter((e) => e.statut === "suspendu").length ?? 0;

  // ── Tableau de bord : santé, présence, activités du mois, solde ──────────
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const ilY30 = new Date(now.getTime() - 30 * 86_400_000).toISOString().split("T")[0];
  const ilY60 = new Date(now.getTime() - 60 * 86_400_000).toISOString().split("T")[0];

  const { data: activitesRecentes } = await supabase
    .from("activites")
    .select("id, date_activite")
    .eq("departement_id", id)
    .gte("date_activite", ilY60);

  const derniereActivite = (activitesRecentes ?? [])
    .map((a) => a.date_activite)
    .sort()
    .at(-1) ?? null;

  const { count: nbActivitesMois } = await supabase
    .from("activites")
    .select("id", { count: "exact", head: true })
    .eq("departement_id", id)
    .gte("date_activite", debutMois);

  const activites30jIds = (activitesRecentes ?? [])
    .filter((a) => a.date_activite >= ilY30)
    .map((a) => a.id);
  const activitesPrevIds = (activitesRecentes ?? [])
    .filter((a) => a.date_activite >= ilY60 && a.date_activite < ilY30)
    .map((a) => a.id);

  const activiteIdsTotal = [...activites30jIds, ...activitesPrevIds];
  const { data: presencesRecentes } = activiteIdsTotal.length
    ? await supabase
        .from("presences")
        .select("activite_id, statut")
        .in("activite_id", activiteIdsTotal)
    : { data: [] };

  function tauxPresence(activitesIds: string[]) {
    const presencesDept = (presencesRecentes ?? []).filter((p) => activitesIds.includes(p.activite_id));
    if (!presencesDept.length) return null;
    const presents = presencesDept.filter((p) => p.statut === "present").length;
    return Math.round((presents / presencesDept.length) * 100);
  }

  const tauxPresence30j = tauxPresence(activites30jIds);
  const tauxPresencePrev = tauxPresence(activitesPrevIds);

  const { data: dernierRapportData } = await supabase
    .from("rapports")
    .select("date_soumission")
    .eq("departement_id", id)
    .order("date_soumission", { ascending: false })
    .limit(1)
    .single();

  const sante = calculerSante({
    dernierActivite: derniereActivite,
    tauxPresence30j,
    tauxPresencePrev,
    dernierRapport: dernierRapportData?.date_soumission ?? null,
    absences3Consecutives: false,
  });

  const { data: soldeData } = peutVoirCaisse
    ? await supabase.rpc("fn_solde_departement", { p_departement_id: id })
    : { data: null };
  const solde = (soldeData as number) ?? 0;

  // ── Stats cultes du departement (30 derniers jours) ───────────────────────
  // Reservee a peutGerer : la RLS sur presences_culte ne renvoie de toute
  // facon que sa propre ligne a un membre/tresorier (cf. migration
  // presence_culte_perimetre_departement), un agregat serait incomplet pour
  // eux.
  let tauxPresenceCulte30j: number | null = null;
  let nbCultesPointes = 0;
  if (peutGerer) {
    const ouvrierIdsDept = (effectifs ?? [])
      .filter((e) => e.statut === "actif")
      .map((e) => e.ouvrier_id);

    const { data: cultes30j } = await supabase
      .from("cultes")
      .select("id")
      .gte("date_culte", ilY30);
    const culte30jIds = (cultes30j ?? []).map((c) => c.id);

    const { data: presencesCulteDept } =
      culte30jIds.length && ouvrierIdsDept.length
        ? await supabase
            .from("presences_culte")
            .select("culte_id, statut")
            .in("culte_id", culte30jIds)
            .in("ouvrier_id", ouvrierIdsDept)
        : { data: [] };

    const presentsCulte = (presencesCulteDept ?? []).filter((p) => p.statut === "present").length;
    tauxPresenceCulte30j = presencesCulteDept?.length
      ? Math.round((presentsCulte / presencesCulteDept.length) * 100)
      : null;
    nbCultesPointes = new Set((presencesCulteDept ?? []).map((p) => p.culte_id)).size;
  }

  return (
    <>
      <TopBar title={dept.nom} />

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/departements"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            Retour
          </Link>
          {isPilotage && (
            <Link href={`/departements/${id}/modifier`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Pencil size={14} />
                Modifier
              </Button>
            </Link>
          )}
        </div>

        {/* Info département */}
        <Card>
          <CardContent className="pt-4 space-y-1">
            {dept.description && (
              <p className="text-sm text-muted-foreground">{dept.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Créé le {format.date(dept.date_creation)}
            </p>
          </CardContent>
        </Card>

        {/* Santé du département */}
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${PASTILLE[sante.statut].bg}`}
            />
            <div>
              <p className="text-sm font-medium">{PASTILLE[sante.statut].label}</p>
              {sante.alertes.length > 0 && (
                <p className="text-xs text-muted-foreground">{sante.alertes[0]}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Résumé effectifs — masqué pour un simple membre */}
        {!estSimpleMembre && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-green-600">{nbActifs}</p>
                <p className="text-xs text-muted-foreground mt-1">Actifs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-orange-500">{nbSuspendus}</p>
                <p className="text-xs text-muted-foreground mt-1">Suspendus</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activités du département */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Activités du département
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {tauxPresence30j !== null ? `${tauxPresence30j}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Présence (30j)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-primary">{nbActivitesMois ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Activités ce mois</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cultes — presence des membres du departement */}
        {peutGerer && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Cultes
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {tauxPresenceCulte30j !== null ? `${tauxPresenceCulte30j}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Présence culte (30j)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-primary">{nbCultesPointes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cultes pointés</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {peutVoirCaisse && (
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Solde de caisse</p>
              <p className={`text-2xl font-bold ${solde >= 0 ? "text-green-600" : "text-destructive"}`}>
                {format.montant(solde)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Liens vers les modules de gestion */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/departements/${id}/activites`}>
            <Button variant="outline" className="w-full text-sm h-auto py-3 flex-col gap-1">
              <CalendarDays size={20} />
              Activités
            </Button>
          </Link>
          {peutGerer && (
            <Link href={`/departements/${id}/suivi`}>
              <Button variant="outline" className="w-full text-sm h-auto py-3 flex-col gap-1">
                <Pin size={20} />
                Suivi
              </Button>
            </Link>
          )}
          {peutGerer && (
            <Link href="/cultes">
              <Button variant="outline" className="w-full text-sm h-auto py-3 flex-col gap-1">
                <Church size={20} />
                Cultes
              </Button>
            </Link>
          )}
          {(["president", "vice_president", "tresorier"].includes(monAff?.role ?? "") || isPilotage) && (
            <Link href={`/departements/${id}/caisse`}>
              <Button variant="outline" className="w-full text-sm h-auto py-3 flex-col gap-1">
                <Wallet size={20} />
                Caisse
              </Button>
            </Link>
          )}
          {peutGerer && (
            <>
              <Link href={`/departements/${id}/rapports`}>
                <Button variant="outline" className="w-full text-sm h-auto py-3 flex-col gap-1">
                  <FileText size={20} />
                  Rapports
                </Button>
              </Link>
              <Link href={`/departements/${id}/equipe`}>
                <Button variant="outline" className="w-full text-sm h-auto py-3 flex-col gap-1">
                  <Users size={20} />
                  Équipe
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
