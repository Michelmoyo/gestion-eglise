import type { createClient } from "@/lib/supabase/server";

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

  const { data: suspendusMois } = await supabase
    .from("affectations")
    .select("ouvrier_id, date_changement_statut")
    .eq("departement_id", departementId)
    .eq("statut", "suspendu")
    .gte("date_changement_statut", debutMois)
    .lte("date_changement_statut", finMois);

  const suspendusIds = (suspendusMois ?? []).map((a) => a.ouvrier_id);
  const { data: suspendusOuvriers } = suspendusIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", suspendusIds)
    : { data: [] };

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
  };
}
