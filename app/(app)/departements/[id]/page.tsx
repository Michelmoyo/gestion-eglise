import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  CalendarDays,
  Pin,
  Church,
  Wallet,
  FileText,
  Users,
} from "lucide-react";
import { format } from "@/lib/format";
import { calculerSante, type Sante } from "@/lib/sante";

const PASTILLE: Record<Sante, { label: string }> = {
  vert: { label: "Bonne santé" },
  orange: { label: "À surveiller" },
  rouge: { label: "En difficulté" },
};

// Palette fermee : une couleur par module, assignee une fois pour toutes --
// casse la monotonie du rose partout sans devenir illisible (cf. retour
// utilisateur + reference "Age+"). Ne pas piocher une couleur au hasard
// ailleurs sans l'ajouter ici.
// Pastels du brief "Soft Cards" (§2) : "une categorie = une couleur
// pastel stable". Icones en ardoise -- le brief limite a 3 couleurs
// saturees visibles simultanement sur un ecran, or les 6 modules
// s'affichent ensemble ici : les pastels (desatures, hors de cette
// limite) sont le bon outil, pas les accents satures (corail/bleu
// ciel/ardoise). Equipe reutilise le violet de marque (seul accent
// sature de cet ecran, dans le budget de 3).
const COULEUR_MODULE = {
  activites: "bg-[#FCEBDD] text-[#4A5160]",
  suivi: "bg-[#ECE6FB] text-[#4A5160]",
  cultes: "bg-[#FBE4E8] text-[#4A5160]",
  caisse: "bg-[#DDF1E8] text-[#4A5160]",
  rapports: "bg-[#DDF0FA] text-[#4A5160]",
  equipe: "bg-[#EDE7FE] text-primary",
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
  const aujourdHui = now.toISOString().split("T")[0];
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const ilY30 = new Date(now.getTime() - 30 * 86_400_000).toISOString().split("T")[0];
  const ilY60 = new Date(now.getTime() - 60 * 86_400_000).toISOString().split("T")[0];

  // Bornee a aujourd'hui : une activite/un culte deja cree mais date dans le
  // futur (ex. prochaine occurrence d'un culte recurrent) ne doit pas compter
  // dans une fenetre "N derniers jours", qui ne regarde que le passe.
  const { data: activitesRecentes } = await supabase
    .from("activites")
    .select("id, date_activite")
    .eq("departement_id", id)
    .gte("date_activite", ilY60)
    .lte("date_activite", aujourdHui);

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
  let nbCultes30j = 0;
  if (peutGerer) {
    const ouvrierIdsDept = (effectifs ?? [])
      .filter((e) => e.statut === "actif")
      .map((e) => e.ouvrier_id);

    const { data: cultes30j } = await supabase
      .from("cultes")
      .select("id")
      .gte("date_culte", ilY30)
      .lte("date_culte", aujourdHui);
    const culte30jIds = (cultes30j ?? []).map((c) => c.id);
    nbCultes30j = culte30jIds.length;

    const { data: presencesCulteDept } =
      culte30jIds.length && ouvrierIdsDept.length
        ? await supabase
            .from("presences_culte")
            .select("statut")
            .in("culte_id", culte30jIds)
            .in("ouvrier_id", ouvrierIdsDept)
        : { data: [] };

    const presentsCulte = (presencesCulteDept ?? []).filter((p) => p.statut === "present").length;
    tauxPresenceCulte30j = presencesCulteDept?.length
      ? Math.round((presentsCulte / presencesCulteDept.length) * 100)
      : null;
  }

  // Grille compacte des chiffres cles -- un seul coup d'oeil, le detail
  // (effectifs nommes, historique des cultes...) reste sur les sous-ecrans
  // dedies (Equipe, Cultes...). Nombre de tuiles variable selon le role.
  const statsAccueil: { valeur: string; label: string; negatif?: boolean }[] = [];
  if (!estSimpleMembre) statsAccueil.push({ valeur: String(nbActifs), label: "Actifs" });
  statsAccueil.push({
    valeur: tauxPresence30j !== null ? `${tauxPresence30j}%` : "—",
    label: "Présence 30j",
  });
  statsAccueil.push({ valeur: String(nbActivitesMois ?? 0), label: "Activités ce mois" });
  if (peutVoirCaisse) {
    statsAccueil.push({ valeur: format.montant(solde), label: "Solde caisse", negatif: solde < 0 });
  }
  if (peutGerer) {
    statsAccueil.push({ valeur: String(nbCultes30j), label: "Cultes (30j)" });
  }

  const badgeLabel = sante.alertes.length
    ? `${PASTILLE[sante.statut].label} — ${sante.alertes[0]}`
    : PASTILLE[sante.statut].label;
  const badgeDot = {
    vert: "bg-green-400",
    orange: "bg-orange-300",
    rouge: "bg-red-400",
  }[sante.statut];

  return (
    <>
      <TopBar title={dept.nom} badge={{ label: badgeLabel, dotClassName: badgeDot }} />

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
        {dept.description && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{dept.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Créé le {format.date(dept.date_creation)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Chiffres clés */}
        <div className="grid grid-cols-2 gap-3">
          {statsAccueil.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3.5 px-3.5">
                <p className={`text-lg font-bold ${s.negatif ? "text-destructive" : "text-primary"}`}>
                  {s.valeur}
                </p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Liens vers les modules de gestion -- tuiles pastel, meme langage
            visuel que les stats, avec un chevron pour signaler que tout est
            cliquable (y compris les modules sans ecran dedie pour l'instant). */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Gérer
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/departements/${id}/activites`}
              className={`rounded-lg p-4 h-[92px] flex flex-col justify-between ${COULEUR_MODULE.activites}`}
            >
              <div className="flex items-center justify-between">
                <CalendarDays size={22} strokeWidth={1.75} />
                <ChevronRight size={14} strokeWidth={2} className="opacity-45" />
              </div>
              <span className="text-sm font-semibold">Activités</span>
            </Link>
            {peutGerer && (
              <Link
                href={`/departements/${id}/equipe`}
                className={`rounded-lg p-4 h-[92px] flex flex-col justify-between ${COULEUR_MODULE.equipe}`}
              >
                <div className="flex items-center justify-between">
                  <Users size={22} strokeWidth={1.75} />
                  <ChevronRight size={14} strokeWidth={2} className="opacity-45" />
                </div>
                <span className="text-sm font-semibold">Équipe</span>
              </Link>
            )}
            {(["president", "vice_president", "tresorier"].includes(monAff?.role ?? "") || isPilotage) && (
              <Link
                href={`/departements/${id}/caisse`}
                className={`rounded-lg p-4 h-[92px] flex flex-col justify-between ${COULEUR_MODULE.caisse}`}
              >
                <div className="flex items-center justify-between">
                  <Wallet size={22} strokeWidth={1.75} />
                  <ChevronRight size={14} strokeWidth={2} className="opacity-45" />
                </div>
                <span className="text-sm font-semibold">Caisse</span>
              </Link>
            )}
            {peutGerer && (
              <Link
                href={`/departements/${id}/rapports`}
                className={`rounded-lg p-4 h-[92px] flex flex-col justify-between ${COULEUR_MODULE.rapports}`}
              >
                <div className="flex items-center justify-between">
                  <FileText size={22} strokeWidth={1.75} />
                  <ChevronRight size={14} strokeWidth={2} className="opacity-45" />
                </div>
                <span className="text-sm font-semibold">Rapports</span>
              </Link>
            )}
            {peutGerer && (
              <Link
                href="/cultes"
                className={`rounded-lg p-4 h-[92px] flex flex-col justify-between ${COULEUR_MODULE.cultes}`}
              >
                <div className="flex items-center justify-between">
                  <Church size={22} strokeWidth={1.75} />
                  <ChevronRight size={14} strokeWidth={2} className="opacity-45" />
                </div>
                <span className="text-sm font-semibold">Cultes</span>
              </Link>
            )}
            {peutGerer && (
              <Link
                href={`/departements/${id}/suivi`}
                className={`rounded-lg p-4 h-[92px] flex flex-col justify-between ${COULEUR_MODULE.suivi}`}
              >
                <div className="flex items-center justify-between">
                  <Pin size={22} strokeWidth={1.75} />
                  <ChevronRight size={14} strokeWidth={2} className="opacity-45" />
                </div>
                <span className="text-sm font-semibold">Suivi</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
