import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface PresenceMois {
  id: string;
  type: "activite" | "culte";
  titre: string;
  date: string;
  heure: string | null;
  lieu: string | null;
  statut: "present" | "absent" | "excuse";
  departementId: string | null;
}

// Combine les presences aux activites de departement et aux cultes pour un
// ouvrier, a partir d'une date donnee -- utilise par la carte "Presences ce
// mois" de mon-espace et par son detail cliquable.
export async function getPresencesMois(
  supabase: SupabaseServerClient,
  ouvrierId: string,
  depuis: string
): Promise<PresenceMois[]> {
  const { data: presencesActivites } = await supabase
    .from("presences")
    .select("statut, activite_id")
    .eq("ouvrier_id", ouvrierId);

  const activiteIds = (presencesActivites ?? []).map((p) => p.activite_id);
  const { data: activites } = activiteIds.length
    ? await supabase
        .from("activites")
        .select("id, titre, date_activite, heure, lieu, departement_id")
        .in("id", activiteIds)
    : { data: [] };
  const activiteById = Object.fromEntries((activites ?? []).map((a) => [a.id, a]));

  const { data: presencesCultes } = await supabase
    .from("presences_culte")
    .select("statut, culte_id")
    .eq("ouvrier_id", ouvrierId);

  const culteIds = (presencesCultes ?? []).map((p) => p.culte_id);
  const { data: cultes } = culteIds.length
    ? await supabase.from("cultes").select("id, type, date_culte, heure, lieu").in("id", culteIds)
    : { data: [] };
  const culteById = Object.fromEntries((cultes ?? []).map((c) => [c.id, c]));

  const items: PresenceMois[] = [];

  for (const p of presencesActivites ?? []) {
    const a = activiteById[p.activite_id];
    if (!a || a.date_activite < depuis) continue;
    items.push({
      id: a.id,
      type: "activite",
      titre: a.titre,
      date: a.date_activite,
      heure: a.heure,
      lieu: a.lieu,
      statut: p.statut,
      departementId: a.departement_id,
    });
  }

  for (const p of presencesCultes ?? []) {
    const c = culteById[p.culte_id];
    if (!c || c.date_culte < depuis) continue;
    items.push({
      id: c.id,
      type: "culte",
      titre: c.type,
      date: c.date_culte,
      heure: c.heure,
      lieu: c.lieu,
      statut: p.statut,
      departementId: null,
    });
  }

  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}
