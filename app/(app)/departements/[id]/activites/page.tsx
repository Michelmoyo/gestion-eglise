import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, CalendarDays, Clock, MapPin } from "lucide-react";
import { format } from "@/lib/format";

const STATUT_PRESENCE_STYLE: Record<string, { label: string; className: string }> = {
  present: { label: "Présent", className: "bg-green-100 text-green-700" },
  absent: { label: "Absent", className: "bg-red-100 text-red-700" },
  excuse: { label: "Excusé", className: "bg-orange-100 text-orange-700" },
};

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

  // Ma présence à chacune de ces activités -- affichée directement sur
  // chaque ligne plutôt que dans un résumé séparé sur "Mon espace".
  const activiteIds = (activites ?? []).map((a) => a.id);
  const { data: mesPresences } = activiteIds.length
    ? await supabase
        .from("presences")
        .select("activite_id, statut")
        .eq("ouvrier_id", moi.id)
        .in("activite_id", activiteIds)
    : { data: [] };
  const monStatutParActivite = Object.fromEntries(
    (mesPresences ?? []).map((p) => [p.activite_id, p.statut])
  );

  const aujourdHui = new Date().toISOString().split("T")[0];

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

        <div className="flex flex-col gap-4">
          {!activites?.length && (
            <EmptyState icon={CalendarDays} message="Aucune activité enregistrée." />
          )}
          {(activites ?? []).map((act) => {
            const monStatut = monStatutParActivite[act.id];
            const style = monStatut ? STATUT_PRESENCE_STYLE[monStatut] : null;
            const estPassee = act.date_activite <= aujourdHui;

            return (
              <Link
                key={act.id}
                href={`/departements/${departementId}/activites/${act.id}`}
              >
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
                      </div>
                    </div>
                    {estPassee && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          style ? style.className : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {style ? style.label : "Non enregistré"}
                      </span>
                    )}
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
