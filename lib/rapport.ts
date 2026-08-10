import type { createClient } from "@/lib/supabase/server";
import { format } from "@/lib/format";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface OptionsRapport {
  peutVoirDetailCaisse: boolean;
}

const RANG_ROLE: Record<string, number> = {
  president: 0,
  vice_president: 1,
  secretaire: 2,
  tresorier: 3,
  membre: 4,
};

// "juil. 2026" pour un ouvrier arrivé pendant la période couverte (plus
// parlant qu'une seule année), sinon juste l'année d'arrivée.
function labelDepuis(dateAffectation: string, debutMois: string, finMois: string): string {
  if (dateAffectation >= debutMois && dateAffectation <= finMois) {
    return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(
      new Date(dateAffectation)
    );
  }
  return new Date(dateAffectation).getFullYear().toString();
}

export async function getDonneesRapport(
  supabase: SupabaseServerClient,
  departementId: string,
  periode: string,
  options: OptionsRapport
) {
  const debutMois = periode;
  const [annee, mois] = periode.split("-").map(Number);
  const finMois = new Date(annee, mois, 0).toISOString().split("T")[0];
  const veilleDebutMois = new Date(annee, mois - 1, 0).toISOString().split("T")[0];

  // ── Activités du mois et leur taux de présence ──────────────────────────
  const { data: activitesMois } = await supabase
    .from("activites")
    .select("id, titre, date_activite, heure")
    .eq("departement_id", departementId)
    .gte("date_activite", debutMois)
    .lte("date_activite", finMois)
    .order("date_activite", { ascending: true });

  const activiteIds = (activitesMois ?? []).map((a) => a.id);
  const { data: presencesMois } = activiteIds.length
    ? await supabase
        .from("presences")
        .select("activite_id, ouvrier_id, statut")
        .in("activite_id", activiteIds)
    : { data: [] };

  const statsByActivite = (activitesMois ?? []).map((act) => {
    const pres = (presencesMois ?? []).filter((p) => p.activite_id === act.id);
    const nbPresent = pres.filter((p) => p.statut === "present").length;
    const nbTotal = pres.length;
    return {
      ...act,
      nbPresent,
      nbTotal,
      taux: nbTotal > 0 ? Math.round((nbPresent / nbTotal) * 100) : null,
    };
  });

  // ── État des ouvriers : actifs, adhérents et suspendus de la période ────
  const { count: nbActifs } = await supabase
    .from("affectations")
    .select("id", { count: "exact", head: true })
    .eq("departement_id", departementId)
    .eq("statut", "actif");

  const { data: membresActifs } = await supabase
    .from("affectations")
    .select("ouvrier_id, role, date_affectation")
    .eq("departement_id", departementId)
    .eq("statut", "actif");
  const membresActifsIds = (membresActifs ?? []).map((a) => a.ouvrier_id);

  const { data: nouveauxMois } = await supabase
    .from("affectations")
    .select("ouvrier_id, date_affectation")
    .eq("departement_id", departementId)
    .gte("date_affectation", debutMois)
    .lte("date_affectation", finMois);

  const nouveauxIds = new Set((nouveauxMois ?? []).map((a) => a.ouvrier_id));
  const { data: nouveauxOuvriers } = nouveauxIds.size
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", [...nouveauxIds])
    : { data: [] };

  // Effectif actif complet, trié hiérarchie (président → membre) puis nom —
  // c'est la liste affichée dans le rapport et l'ordre des lignes des
  // tableaux croisés ouvrier × événement.
  const { data: rosterOuvriers } = membresActifsIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", membresActifsIds)
    : { data: [] };
  const nomById = Object.fromEntries((rosterOuvriers ?? []).map((o) => [o.id, o]));

  const roster = (membresActifs ?? [])
    .map((a) => {
      const o = nomById[a.ouvrier_id];
      if (!o) return null;
      return {
        id: o.id,
        prenom: o.prenom,
        nom: o.nom,
        role: a.role,
        estNouveau: nouveauxIds.has(a.ouvrier_id),
        depuis: labelDepuis(a.date_affectation, debutMois, finMois),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => {
      const rang = (RANG_ROLE[a.role] ?? 9) - (RANG_ROLE[b.role] ?? 9);
      return rang !== 0 ? rang : a.nom.localeCompare(b.nom, "fr");
    });

  // Tous les suspendus actuels du departement, quelle que soit la date de
  // suspension (une suspension ancienne reste pertinente pour le rapport).
  const { data: suspendusAffectations } = await supabase
    .from("affectations")
    .select("ouvrier_id, role, date_changement_statut")
    .eq("departement_id", departementId)
    .eq("statut", "suspendu");

  const suspendusIds = (suspendusAffectations ?? []).map((a) => a.ouvrier_id);
  const { data: suspendusOuvriersData } = suspendusIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", suspendusIds)
    : { data: [] };

  const affectationSuspendueById = Object.fromEntries(
    (suspendusAffectations ?? []).map((a) => [a.ouvrier_id, a])
  );
  const suspendusOuvriers = (suspendusOuvriersData ?? []).map((o) => ({
    ...o,
    role: affectationSuspendueById[o.id]?.role ?? "membre",
    date_changement_statut: affectationSuspendueById[o.id]?.date_changement_statut ?? null,
  }));

  // ── Grilles de présence ouvrier × activité et ouvrier × culte ───────────
  const presenceActiviteParOuvrier: Record<string, Record<string, string>> = {};
  for (const p of presencesMois ?? []) {
    (presenceActiviteParOuvrier[p.ouvrier_id] ??= {})[p.activite_id] = p.statut;
  }

  // ── Présence des membres du département aux cultes de la période ───────
  const { data: cultesPeriode } = await supabase
    .from("cultes")
    .select("id, type, date_culte")
    .gte("date_culte", debutMois)
    .lte("date_culte", finMois)
    .order("date_culte", { ascending: true });

  const culteIds = (cultesPeriode ?? []).map((c) => c.id);
  const { data: presencesCultePeriode } =
    culteIds.length && membresActifsIds.length
      ? await supabase
          .from("presences_culte")
          .select("culte_id, ouvrier_id, statut")
          .in("culte_id", culteIds)
          .in("ouvrier_id", membresActifsIds)
      : { data: [] };

  const statsCultes = (cultesPeriode ?? []).map((c) => {
    const pres = (presencesCultePeriode ?? []).filter((p) => p.culte_id === c.id);
    const nbPresent = pres.filter((p) => p.statut === "present").length;
    const nbTotal = pres.length;
    return {
      ...c,
      nbPresent,
      nbTotal,
      taux: nbTotal > 0 ? Math.round((nbPresent / nbTotal) * 100) : null,
    };
  });

  const presenceCulteParOuvrier: Record<string, Record<string, string>> = {};
  for (const p of presencesCultePeriode ?? []) {
    (presenceCulteParOuvrier[p.ouvrier_id] ??= {})[p.culte_id] = p.statut;
  }

  // ── Caisse : bilan début/fin de période, détail si autorisé ─────────────
  const { data: soldeDebutData } = await supabase.rpc("fn_solde_departement_a_date", {
    p_departement_id: departementId,
    p_date: veilleDebutMois,
  });
  const { data: soldeFinData } = await supabase.rpc("fn_solde_departement_a_date", {
    p_departement_id: departementId,
    p_date: finMois,
  });

  let mouvementsPeriode: {
    id: string;
    type: string;
    montant: number;
    motif: string | null;
    date_mouvement: string;
  }[] = [];

  if (options.peutVoirDetailCaisse) {
    const { data } = await supabase
      .from("mouvements_caisse")
      .select("id, type, montant, motif, date_mouvement")
      .eq("departement_id", departementId)
      .gte("date_mouvement", debutMois)
      .lte("date_mouvement", finMois)
      .order("date_mouvement", { ascending: true });
    mouvementsPeriode = data ?? [];
  }

  // ── Points de suivi (listes Difficultés/Besoins/Objectifs + eventuelles
  // listes personnalisees) ─────────────────────────────────────────────────
  // Remplace la saisie manuelle par rapport : on prend tout ce qui est
  // encore ouvert (peu importe depuis quand) + ce qui a été résolu pendant
  // cette période précise, pour que le rapport montre à la fois ce qui reste
  // en cours et ce qui a été accompli ce mois-ci. Seules les listes marquees
  // inclure_rapport alimentent le document genere -- le responsable choisit
  // lesquelles (les 3 listes par defaut le sont, mais peuvent etre
  // desactivees ; une liste personnalisee peut au contraire etre incluse).
  const { data: listesSuivi } = await supabase
    .from("listes_suivi")
    .select("id, nom, inclure_rapport")
    .eq("departement_id", departementId)
    .order("ordre", { ascending: true });

  const { data: pointsSuivi } = await supabase
    .from("points_suivi")
    .select("id, liste_id, contenu, statut, date_creation, date_resolution")
    .eq("departement_id", departementId)
    .order("date_creation", { ascending: true });

  function texteSuiviListe(listeId: string): string | null {
    const items = (pointsSuivi ?? []).filter((p) => p.liste_id === listeId).filter((p) => {
      if (p.statut !== "termine") return true;
      return !!p.date_resolution && p.date_resolution >= debutMois && p.date_resolution <= finMois;
    });
    if (!items.length) return null;
    return items
      .map((p) => (p.statut === "termine" ? `${p.contenu} — résolu le ${format.date(p.date_resolution)}` : p.contenu))
      .join("\n");
  }

  const suiviInclus = (listesSuivi ?? [])
    .filter((l) => l.inclure_rapport)
    .map((l) => ({ nom: l.nom, texte: texteSuiviListe(l.id) }));

  return {
    roster,
    statsByActivite,
    presenceActiviteParOuvrier,
    nbActifs: nbActifs ?? 0,
    nouveauxOuvriers: nouveauxOuvriers ?? [],
    suspendusOuvriers: suspendusOuvriers ?? [],
    statsCultes,
    presenceCulteParOuvrier,
    soldeDebut: (soldeDebutData as number) ?? 0,
    soldeFin: (soldeFinData as number) ?? 0,
    mouvementsPeriode,
    peutVoirDetailCaisse: options.peutVoirDetailCaisse,
    listesSuivi: listesSuivi ?? [],
    pointsSuivi: pointsSuivi ?? [],
    suiviInclus,
  };
}
