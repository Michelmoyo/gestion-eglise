import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getDonneesRapport(
  supabase: SupabaseServerClient,
  departementId: string,
  periode: string
) {
  const debutMois = periode;
  const [annee, mois] = periode.split("-").map(Number);
  const finMois = new Date(annee, mois, 0).toISOString().split("T")[0];

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

  return {
    statsByActivite,
    nouveauxOuvriers: nouveauxOuvriers ?? [],
    suspendusOuvriers: suspendusOuvriers ?? [],
  };
}
