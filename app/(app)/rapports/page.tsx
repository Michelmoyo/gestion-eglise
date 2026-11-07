import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus, Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ListeRapports } from "@/components/rapports/liste-rapports";

export default async function RapportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;

  // Pasteur/assistant : on choisit d'abord le département, ensuite ses
  // rapports (un pasteur suit toute l'église, pas un seul département).
  if (isPilotage) {
    const { data: departements } = await supabase.from("departements").select("id, nom").order("nom");

    const deptIds = (departements ?? []).map((d) => d.id);
    const { data: derniersRapports } = deptIds.length
      ? await supabase
          .from("rapports")
          .select("departement_id, date_soumission")
          .in("departement_id", deptIds)
          .order("date_soumission", { ascending: false })
      : { data: [] };

    // Meme seuil que fn_est_en_retard/calculerSante (cf. lib/sante.ts) :
    // > 30j sans rapport = en retard, pas de date du tout = jamais soumis.
    const now = Date.now();
    function statutRapport(dateSoumission: string | undefined) {
      if (!dateSoumission) return { label: "JAMAIS SOUMIS", cls: "bg-orange-100 text-orange-700" };
      const jours = Math.floor((now - new Date(dateSoumission).getTime()) / 86_400_000);
      return jours > 30
        ? { label: "EN RETARD", cls: "bg-orange-100 text-orange-700" }
        : { label: "À JOUR", cls: "bg-green-100 text-green-700" };
    }

    const departementsAvecStatut = (departements ?? []).map((d) => {
      const dateSoumission = (derniersRapports ?? []).find((r) => r.departement_id === d.id)?.date_soumission;
      return { ...d, statut: statutRapport(dateSoumission) };
    });

    return (
      <>
        <TopBar title="Rapports" />

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Choisissez un département pour voir ses rapports.
          </p>

          <div className="flex flex-col gap-4">
            {!departementsAvecStatut.length ? (
              <EmptyState icon={Building2} message="Aucun département créé." />
            ) : (
              departementsAvecStatut.map((d) => (
                <Link key={d.id} href={`/departements/${d.id}/rapports`}>
                  <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <IconChip icon={Building2} size={18} chipSize={40} />
                      <p className="font-medium text-sm flex-1 truncate">{d.nom}</p>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${d.statut.cls}`}>
                        {d.statut.label}
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  // Président / vice-président / secrétaire : directement la liste de leurs
  // propres rapports soumis, avec le bouton pour en ajouter un.
  const { data: aff } = await supabase
    .from("affectations")
    .select("departement_id")
    .eq("ouvrier_id", moi.id)
    .eq("statut", "actif")
    .in("role", ["president", "vice_president", "secretaire"]);

  const deptIds = (aff ?? []).map((a) => a.departement_id);
  if (!deptIds.length) redirect("/mon-espace");

  const { data: rapports } = await supabase
    .from("rapports")
    .select("id, departement_id, periode_debut, periode_fin, date_soumission, auteur_id")
    .in("departement_id", deptIds)
    .order("date_soumission", { ascending: false });

  const auteurIds = [...new Set((rapports ?? []).map((r) => r.auteur_id))];
  const { data: auteurs } = auteurIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", auteurIds)
    : { data: [] };
  const auteurNomById = Object.fromEntries((auteurs ?? []).map((a) => [a.id, `${a.prenom} ${a.nom}`]));

  const deptNomById: Record<string, string> = {};
  if (deptIds.length > 1) {
    const { data: departements } = await supabase.from("departements").select("id, nom").in("id", deptIds);
    (departements ?? []).forEach((d) => (deptNomById[d.id] = d.nom));
  }

  const rapportsAffiches = (rapports ?? []).map((r) => ({
    id: r.id,
    periodeDebut: r.periode_debut,
    periodeFin: r.periode_fin,
    date_soumission: r.date_soumission,
    auteurNom: auteurNomById[r.auteur_id] ?? "—",
    departementNom: r.departement_id ? deptNomById[r.departement_id] : undefined,
  }));

  return (
    <>
      <TopBar title="Rapports" />

      <div className="p-4 space-y-4">
        <ListeRapports rapports={rapportsAffiches} afficherDepartement={deptIds.length > 1} />

        <Link href="/rapports/nouveau" className="block pt-2">
          <Button className="w-full gap-2">
            <Plus size={16} />
            Nouveau rapport
          </Button>
        </Link>
      </div>
    </>
  );
}
