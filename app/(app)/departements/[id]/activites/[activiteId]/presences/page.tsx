import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Users } from "lucide-react";
import { PresencesForm } from "@/components/activites/presences-form";
import { enregistrerPresences } from "../actions";

export default async function PresencesActivitePage({
  params,
}: {
  params: Promise<{ id: string; activiteId: string }>;
}) {
  const { id: departementId, activiteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: activite } = await supabase
    .from("activites")
    .select("id, titre")
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

  // Saisie des présences : réservée à la gestion du département, pas une
  // vue accessible depuis la simple consultation de l'activité.
  if (!peutGerer) redirect(`/departements/${departementId}/activites/${activiteId}`);

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

  const nbPresents = (presences ?? []).filter((p) => p.statut === "present").length;
  const nbTotal = membres?.length ?? 0;

  const action = enregistrerPresences.bind(null, departementId, activiteId);

  return (
    <>
      <TopBar title={`Présences — ${activite.titre}`} />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${departementId}/activites/${activiteId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {activite.titre}
        </Link>

        {nbTotal > 0 && (
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Users size={20} className="text-primary" />
              <div>
                <p className="font-semibold text-sm">{nbPresents} / {nbTotal} présents</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((nbPresents / nbTotal) * 100)}% de présence
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
              <PresencesForm
                action={action}
                membres={membres ?? []}
                presenceByOuvrier={presenceByOuvrier}
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
