import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, Clock, Church, ChevronRight } from "lucide-react";
import { format } from "@/lib/format";
import { getPresencesMois } from "@/lib/presences";

export default async function MonEspacePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("id, nom, prenom, photo_url, date_integration, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!ouvrier) redirect("/api/auth/signout");

  // Pasteur/assistant ont leur propre dashboard (§12 cahier des charges)
  if (ouvrier.role_global === "pasteur" || ouvrier.role_global === "assistant") {
    redirect("/pilotage");
  }

  // Affectations actives
  const { data: affectations } = await supabase
    .from("affectations")
    .select("role, departement_id")
    .eq("ouvrier_id", ouvrier.id)
    .eq("statut", "actif");

  const departementIds = (affectations ?? []).map((a) => a.departement_id);

  // Noms des départements
  const { data: departements } = departementIds.length
    ? await supabase
        .from("departements")
        .select("id, nom")
        .in("id", departementIds)
    : { data: [] };

  const deptMap = Object.fromEntries((departements ?? []).map((d) => [d.id, d.nom]));

  // Prochaines activités
  const { data: prochainesActivites } = departementIds.length
    ? await supabase
        .from("activites")
        .select("id, titre, date_activite, heure, lieu, departement_id")
        .in("departement_id", departementIds)
        .gte("date_activite", new Date().toISOString().split("T")[0])
        .order("date_activite", { ascending: true })
        .limit(5)
    : { data: [] };

  // Présences ce mois (activités de département + cultes)
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const presencesMois = await getPresencesMois(supabase, ouvrier.id, debutMois);
  const totalPresences = presencesMois.length;
  const nbPresent = presencesMois.filter((p) => p.statut === "present").length;

  // Prochains cultes (evenement d'eglise, distinct des activites de departement)
  const { data: prochainsCultes } = await supabase
    .from("cultes")
    .select("id, type, date_culte, heure, lieu")
    .gte("date_culte", new Date().toISOString().split("T")[0])
    .order("date_culte", { ascending: true })
    .limit(3);

  return (
    <>
      <TopBar title="Mon espace" prenom={ouvrier.prenom} />

      <div className="p-4 space-y-4">
        {/* Profil résumé */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                {ouvrier.prenom[0]}{ouvrier.nom[0]}
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {ouvrier.prenom} {ouvrier.nom}
                </p>
                <p className="text-sm text-muted-foreground">
                  Membre depuis {format.date(ouvrier.date_integration)}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {departementIds.map((id) => (
                    <span
                      key={id}
                      className="text-xs bg-secondary px-2 py-0.5 rounded-full"
                    >
                      {deptMap[id] ?? "—"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Présences ce mois */}
        <Link href="/mon-espace/presences">
          <Card className="hover:bg-accent transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Présences ce mois
                </span>
                <ChevronRight size={16} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalPresences === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activité ce mois.</p>
              ) : (
                <p className="text-2xl font-bold">
                  {nbPresent}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    sur {totalPresences} activité{totalPresences > 1 ? "s" : ""}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Prochains cultes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Church size={16} />
              Prochains cultes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!prochainsCultes?.length ? (
              <p className="text-sm text-muted-foreground">Aucun culte planifié.</p>
            ) : (
              prochainsCultes.map((c) => (
                <Link
                  key={c.id}
                  href={`/cultes/${c.id}`}
                  className="flex items-center justify-between gap-2 hover:opacity-80"
                >
                  <span className="text-sm">{c.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {format.date(c.date_culte)}
                    {c.heure ? ` · ${c.heure.slice(0, 5)}` : ""}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Prochaines activités */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays size={16} />
              Prochaines activités
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!prochainesActivites?.length ? (
              <p className="text-sm text-muted-foreground">Aucune activité planifiée.</p>
            ) : (
              prochainesActivites.map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Clock size={14} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{act.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {format.date(act.date_activite)}
                      {act.heure ? ` · ${act.heure.slice(0, 5)}` : ""}
                      {act.departement_id ? ` · ${deptMap[act.departement_id] ?? ""}` : ""}
                      {act.lieu ? ` · ${act.lieu}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
