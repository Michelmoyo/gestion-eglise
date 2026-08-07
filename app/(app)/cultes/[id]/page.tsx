import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, Users } from "lucide-react";
import { format } from "@/lib/format";
import { PresencesCulteForm } from "@/components/cultes/presences-culte-form";
import { enregistrerPresencesCulte } from "./actions";

export default async function CulteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: culte } = await supabase
    .from("cultes")
    .select("id, type, date_culte, heure, lieu, description")
    .eq("id", id)
    .single();

  if (!culte) notFound();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;
  const action = enregistrerPresencesCulte.bind(null, id);

  if (isPilotage) {
    const { data: ouvriers } = await supabase
      .from("ouvriers")
      .select("id, prenom, nom")
      .eq("statut", "actif")
      .order("nom");

    const { data: presences } = await supabase
      .from("presences_culte")
      .select("ouvrier_id, statut")
      .eq("culte_id", id);

    const presenceByOuvrier = Object.fromEntries(
      (presences ?? []).map((p) => [p.ouvrier_id, p.statut])
    );

    const nbPresents = (presences ?? []).filter((p) => p.statut === "present").length;
    const nbTotal = ouvriers?.length ?? 0;

    return (
      <>
        <TopBar title={culte.type} />

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/cultes"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={16} />
              Cultes
            </Link>
            <Link href={`/cultes/${id}/modifier`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Pencil size={14} />
                Modifier
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-1 text-sm">
              <p className="font-semibold text-base">{culte.type}</p>
              <p className="text-muted-foreground">
                {format.date(culte.date_culte)}{culte.heure ? ` · ${culte.heure.slice(0, 5)}` : ""}
              </p>
              {culte.lieu && <p className="text-muted-foreground">📍 {culte.lieu}</p>}
              {culte.description && <p className="mt-2">{culte.description}</p>}
            </CardContent>
          </Card>

          {presences && presences.length > 0 && (
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <Users size={20} className="text-primary" />
                <div>
                  <p className="font-semibold text-sm">{nbPresents} / {nbTotal} présents</p>
                  <p className="text-xs text-muted-foreground">
                    {nbTotal > 0 ? Math.round((nbPresents / nbTotal) * 100) : 0}% de présence
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Saisir les présences</CardTitle>
            </CardHeader>
            <CardContent>
              {nbTotal > 0 ? (
                <PresencesCulteForm
                  action={action}
                  ouvriers={ouvriers ?? []}
                  presenceByOuvrier={presenceByOuvrier}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Aucun ouvrier actif.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Vue membre : uniquement sa propre presence (RLS ne permet pas plus).
  const { data: maPresence } = await supabase
    .from("presences_culte")
    .select("statut")
    .eq("culte_id", id)
    .eq("ouvrier_id", moi.id)
    .maybeSingle();

  const LABELS: Record<string, string> = {
    present: "Vous étiez présent",
    absent: "Vous étiez absent",
    excuse: "Vous étiez excusé",
  };

  return (
    <>
      <TopBar title={culte.type} />

      <div className="p-4 space-y-4">
        <Link
          href="/cultes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Cultes
        </Link>

        <Card>
          <CardContent className="pt-4 space-y-1 text-sm">
            <p className="font-semibold text-base">{culte.type}</p>
            <p className="text-muted-foreground">
              {format.date(culte.date_culte)}{culte.heure ? ` · ${culte.heure.slice(0, 5)}` : ""}
            </p>
            {culte.lieu && <p className="text-muted-foreground">📍 {culte.lieu}</p>}
            {culte.description && <p className="mt-2">{culte.description}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {maPresence ? LABELS[maPresence.statut] ?? "—" : "Votre présence n'a pas encore été renseignée."}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
