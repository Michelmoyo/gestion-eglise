import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

export default async function DepartementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  const isPilotage = !!moi?.role_global;

  // Pilotage : tous les départements. Sinon : seulement les siens.
  let departements: { id: string; nom: string; description: string | null }[] | null = null;
  if (isPilotage) {
    const { data } = await supabase
      .from("departements")
      .select("id, nom, description")
      .order("nom");
    departements = data;
  } else {
    const { data: aff } = await supabase
      .from("affectations")
      .select("departement_id")
      .eq("ouvrier_id", moi!.id)
      .eq("statut", "actif");
    const ids = (aff ?? []).map((a) => a.departement_id);
    if (ids.length) {
      const { data } = await supabase
        .from("departements")
        .select("id, nom, description")
        .in("id", ids)
        .order("nom");
      departements = data;
    } else {
      departements = [];
    }
  }

  // Nombre d'ouvriers actifs par département
  const { data: effectifs } = await supabase
    .from("affectations")
    .select("departement_id")
    .eq("statut", "actif");

  const countByDept = (effectifs ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.departement_id] = (acc[a.departement_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <TopBar title="Départements" />

      <div className="p-4 space-y-4">
        {isPilotage && (
          <Link href="/departements/nouveau">
            <Button className="w-full gap-2">
              <Plus size={16} />
              Nouveau département
            </Button>
          </Link>
        )}

        <div className="space-y-2">
          {!departements?.length && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucun département.
            </p>
          )}
          {(departements ?? []).map((dept) => {
            return (
              <Link key={dept.id} href={`/departements/${dept.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{dept.nom}</p>
                      {dept.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {dept.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs flex-shrink-0">
                      <Users size={14} />
                      {countByDept[dept.id] ?? 0}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
