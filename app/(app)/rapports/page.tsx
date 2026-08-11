import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
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

    return (
      <>
        <TopBar title="Rapports" />

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Choisissez un département pour voir ses rapports.
          </p>

          <div className="space-y-8">
            {!departements?.length ? (
              <EmptyState icon={Building2} message="Aucun département créé." />
            ) : (
              departements.map((d) => (
                <Link key={d.id} href={`/departements/${d.id}/rapports`}>
                  <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-primary" />
                      </div>
                      <p className="font-medium text-sm flex-1 truncate">{d.nom}</p>
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
    .select("id, departement_id, periode, date_soumission, auteur_id")
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
    periode: r.periode,
    date_soumission: r.date_soumission,
    auteurNom: auteurNomById[r.auteur_id] ?? "—",
    departementNom: r.departement_id ? deptNomById[r.departement_id] : undefined,
  }));

  return (
    <>
      <TopBar title="Rapports" />

      <div className="p-4 space-y-4">
        <ListeRapports rapports={rapportsAffiches} afficherDepartement={deptIds.length > 1} />

        <Link href="/rapports/nouveau">
          <Button className="w-full gap-2">
            <Plus size={16} />
            Nouveau rapport
          </Button>
        </Link>
      </div>
    </>
  );
}
