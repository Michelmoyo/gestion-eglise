import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Users, Building2 } from "lucide-react";

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
          <Link href="/departements/nouveau" className="block pb-2">
            <Button className="w-full gap-2">
              <Plus size={16} />
              Nouveau département
            </Button>
          </Link>
        )}

        <div className="flex flex-col gap-16 pt-2">
          {!departements?.length && (
            <EmptyState icon={Building2} message="Aucun département." />
          )}
          {(departements ?? []).map((dept) => {
            return (
              <Link key={dept.id} href={`/departements/${dept.id}`}>
                <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{dept.nom}</p>
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
