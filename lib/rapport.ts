import type { createClient } from "@/lib/supabase/server";
import { format } from "@/lib/format";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface OptionsRapport {
  peutVoirDetailCaisse: boolean;
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
        .select("activite_id, statut")
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
    .select("ouvrier_id")
    .eq("departement_id", departementId)
    .eq("statut", "actif");
  const membresActifsIds = (membresActifs ?? []).map((a) => a.ouvrier_id);

  const { data: nouveauxMois } = await supabase
    .from("affectations")
    .select("ouvrier_id, date_affectation")
    .eq("departement_id", departementId)
    .gte("date_affectation", debutMois)
    .lte("date_affectation", finMois);

  const nouveauxIds = (nouveauxMois ?? []).map((a) => a.ouvrier_id);
  const { data: nouveauxOuvriers } = nouveauxIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", nouveauxIds)
    : { data: [] };

  // Tous les suspendus actuels du departement, quelle que soit la date de
  // suspension (une suspension ancienne reste pertinente pour le rapport).
  const { data: suspendusAffectations } = await supabase
    .from("affectations")
    .select("ouvrier_id, date_changement_statut")
    .eq("departement_id", departementId)
    .eq("statut", "suspendu");

  const suspendusIds = (suspendusAffectations ?? []).map((a) => a.ouvrier_id);
  const { data: suspendusOuvriersData } = suspendusIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", suspendusIds)
    : { data: [] };

  const dateChangementById = Object.fromEntries(
    (suspendusAffectations ?? []).map((a) => [a.ouvrier_id, a.date_changement_statut])
  );
  const suspendusOuvriers = (suspendusOuvriersData ?? []).map((o) => ({
    ...o,
    date_changement_statut: dateChangementById[o.id] ?? null,
  }));

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
  // en cours et ce qui a été accompli ce mois-ci. Seules les 3 listes par
  // defaut alimentent les colonnes du rapport (difficultes/besoins/objectifs) ;
  // une liste personnalisee supplementaire reste visible sur /suivi mais
  // n'a pas encore de section dediee dans le document genere.
  const { data: listesSuivi } = await supabase
    .from("listes_suivi")
    .select("id, nom")
    .eq("departement_id", departementId);

  const { data: pointsSuivi } = await supabase
    .from("points_suivi")
    .select("id, liste_id, contenu, resolu, date_creation, date_resolution")
    .eq("departement_id", departementId)
    .order("date_creation", { ascending: true });

  function texteSuivi(nomListe: string): string | null {
    const listeId = (listesSuivi ?? []).find((l) => l.nom === nomListe)?.id;
    if (!listeId) return null;
    const items = (pointsSuivi ?? []).filter((p) => p.liste_id === listeId).filter((p) => {
      if (!p.resolu) return true;
      return !!p.date_resolution && p.date_resolution >= debutMois && p.date_resolution <= finMois;
    });
    if (!items.length) return null;
    return items
      .map((p) => (p.resolu ? `${p.contenu} — résolu le ${format.date(p.date_resolution)}` : p.contenu))
      .join("\n");
  }

  return {
    statsByActivite,
    nbActifs: nbActifs ?? 0,
    nouveauxOuvriers: nouveauxOuvriers ?? [],
    suspendusOuvriers: suspendusOuvriers ?? [],
    statsCultes,
    soldeDebut: (soldeDebutData as number) ?? 0,
    soldeFin: (soldeFinData as number) ?? 0,
    mouvementsPeriode,
    peutVoirDetailCaisse: options.peutVoirDetailCaisse,
    listesSuivi: listesSuivi ?? [],
    pointsSuivi: pointsSuivi ?? [],
    difficultesTexte: texteSuivi("Difficultés"),
    besoinsTexte: texteSuivi("Besoins"),
    objectifsTexte: texteSuivi("Objectifs"),
  };
}
