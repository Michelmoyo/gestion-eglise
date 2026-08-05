import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, Users } from "lucide-react";
import { format } from "@/lib/format";
import { PresencesForm } from "@/components/activites/presences-form";
import { enregistrerPresences } from "./actions";

export default async function ActiviteDetailPage({
  params,
}: {
  params: Promise<{ id: string; activiteId: string }>;
}) {
  const { id: departementId, activiteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: dept } = await supabase
    .from("departements")
    .select("id, nom")
    .eq("id", departementId)
    .single();

  if (!dept) notFound();

  const { data: activite } = await supabase
    .from("activites")
    .select("id, titre, date_activite, heure, lieu, description, responsable_id")
    .eq("id", activiteId)
    .eq("departement_id", departementId)
    .single();

  if (!activite) notFound();

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

  // Membres actifs du département
  const { data: affectations } = await supabase
    .from("affectations")
    .select("ouvrier_id")
    .eq("departement_id", departementId)
    .eq("statut", "actif");

  const ouvrierIds = (affectations ?? []).map((a) => a.ouvrier_id);
  const { data: membres } = ouvrierIds.length
    ? await supabase
        .from("ouvriers")
        .select("id, prenom, nom")
        .in("id", ouvrierIds)
        .order("nom")
    : { data: [] };

  // Présences déjà enregistrées
  const { data: presences } = await supabase
    .from("presences")
    .select("ouvrier_id, statut")
    .eq("activite_id", activiteId);

  const presenceByOuvrier = Object.fromEntries(
    (presences ?? []).map((p) => [p.ouvrier_id, p.statut])
  );

  // Responsable nom
  let responsableNom: string | null = null;
  if (activite.responsable_id) {
    const membre = (membres ?? []).find((m) => m.id === activite.responsable_id);
    if (membre) responsableNom = `${membre.prenom} ${membre.nom}`;
  }

  // Stats présences
  const nbPresents = (presences ?? []).filter((p) => p.statut === "present").length;
  const nbTotal = membres?.length ?? 0;

  const action = enregistrerPresences.bind(null, departementId, activiteId);

  return (
    <>
      <TopBar title={activite.titre} />

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/departements/${departementId}/activites`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            Activités
          </Link>
          {peutGerer && (
            <Link href={`/departements/${departementId}/activites/${activiteId}/modifier`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Pencil size={14} />
                Modifier
              </Button>
            </Link>
          )}
        </div>

        {/* Infos activité */}
        <Card>
          <CardContent className="pt-4 space-y-1 text-sm">
            <p className="font-semibold text-base">{activite.titre}</p>
            <p className="text-muted-foreground">{format.date(activite.date_activite)}{activite.heure ? ` · ${activite.heure.slice(0, 5)}` : ""}</p>
            {activite.lieu && <p className="text-muted-foreground">📍 {activite.lieu}</p>}
            {responsableNom && <p className="text-muted-foreground">Responsable : {responsableNom}</p>}
            {activite.description && <p className="mt-2">{activite.description}</p>}
          </CardContent>
        </Card>

        {/* Résumé présences */}
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

        {/* Saisie des présences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {peutGerer ? "Saisir les présences" : "Présences"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nbTotal > 0 ? (
              <PresencesForm
                action={action}
                membres={membres ?? []}
                presenceByOuvrier={presenceByOuvrier}
                readonly={!peutGerer}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun membre actif dans ce département — impossible d&apos;enregistrer des présences.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
