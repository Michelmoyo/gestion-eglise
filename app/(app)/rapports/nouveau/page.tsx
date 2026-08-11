import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function NouveauRapportPage() {
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

  let departements: { id: string; nom: string }[] | null = null;

  if (isPilotage) {
    const { data } = await supabase.from("departements").select("id, nom").order("nom");
    departements = data;
  } else {
    const { data: aff } = await supabase
      .from("affectations")
      .select("departement_id")
      .eq("ouvrier_id", moi.id)
      .eq("statut", "actif")
      .in("role", ["president", "vice_president", "secretaire"]);

    const deptIds = (aff ?? []).map((a) => a.departement_id);
    if (!deptIds.length) redirect("/mon-espace");

    // Un seul département géré : pas besoin de choisir, on y va directement.
    if (deptIds.length === 1) redirect(`/departements/${deptIds[0]}/rapport`);

    const { data } = await supabase.from("departements").select("id, nom").in("id", deptIds).order("nom");
    departements = data;
  }

  return (
    <>
      <TopBar title="Nouveau rapport" />

      <div className="p-4 space-y-4">
        <Link
          href="/rapports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Rapports
        </Link>

        <p className="text-sm text-muted-foreground">
          Choisissez le département concerné :
        </p>

        <div className="space-y-2">
          {!departements?.length ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucun département accessible.
            </p>
          ) : (
            departements.map((d) => (
              <Link key={d.id} href={`/departements/${d.id}/rapport`}>
                <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <p className="font-medium text-sm">{d.nom}</p>
                    <ChevronRight size={16} className="text-muted-foreground" />
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
