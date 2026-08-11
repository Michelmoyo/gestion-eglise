import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { format } from "@/lib/format";

export default async function MesActivitesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!ouvrier) redirect("/connexion");

  const { data: affectations } = await supabase
    .from("affectations")
    .select("departement_id")
    .eq("ouvrier_id", ouvrier.id)
    .eq("statut", "actif");

  const departementIds = (affectations ?? []).map((a) => a.departement_id);

  const { data: departements } = departementIds.length
    ? await supabase.from("departements").select("id, nom").in("id", departementIds)
    : { data: [] };
  const deptMap = Object.fromEntries((departements ?? []).map((d) => [d.id, d.nom]));

  const { data: activites } = departementIds.length
    ? await supabase
        .from("activites")
        .select("id, titre, date_activite, heure, lieu, departement_id")
        .in("departement_id", departementIds)
        .gte("date_activite", new Date().toISOString().split("T")[0])
        .order("date_activite", { ascending: true })
    : { data: [] };

  return (
    <>
      <TopBar title="Prochaines activités" />

      <div className="p-4 space-y-4">
        <Link
          href="/mon-espace"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Mon espace
        </Link>

        <div className="flex flex-col gap-4">
          {!activites?.length ? (
            <EmptyState icon={CalendarDays} message="Aucune activité planifiée." />
          ) : (
            activites.map((act) => (
              <Link key={act.id} href={`/departements/${act.departement_id}/activites/${act.id}`}>
                <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CalendarDays size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{act.titre}</p>
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
                        <span>{deptMap[act.departement_id] ?? ""}</span>
                      </div>
                    </div>
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
