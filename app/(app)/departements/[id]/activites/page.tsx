import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, CalendarDays, Clock, MapPin } from "lucide-react";
import { format } from "@/lib/format";

export default async function ActivitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: departementId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: dept } = await supabase
    .from("departements")
    .select("id, nom")
    .eq("id", departementId)
    .single();

  if (!dept) notFound();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;
  let peutGerer = isPilotage;

  if (!isPilotage) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", departementId)
      .eq("statut", "actif")
      .single();

    if (!aff) redirect("/departements");
    peutGerer = ["president", "vice_president", "secretaire"].includes(aff.role);
  }

  const { data: activites } = await supabase
    .from("activites")
    .select("id, titre, date_activite, heure, lieu")
    .eq("departement_id", departementId)
    .order("date_activite", { ascending: false });

  return (
    <>
      <TopBar title={`${dept.nom} — Activités`} />

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/departements/${departementId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {dept.nom}
          </Link>
          {peutGerer && (
            <Link href={`/departements/${departementId}/activites/nouvelle`}>
              <Button size="sm" className="gap-1">
                <Plus size={14} />
                Nouvelle
              </Button>
            </Link>
          )}
        </div>

        <div className="space-y-6">
          {!activites?.length && (
            <EmptyState icon={CalendarDays} message="Aucune activité enregistrée." />
          )}
          {(activites ?? []).map((act) => (
            <Link
              key={act.id}
              href={`/departements/${departementId}/activites/${act.id}`}
            >
              <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <CardContent className="p-4">
                  <p className="font-semibold text-sm">{act.titre}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} />
                      {format.date(act.date_activite)}
                    </span>
                    {act.heure && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {act.heure.slice(0, 5)}
                      </span>
                    )}
                    {act.lieu && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {act.lieu}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
