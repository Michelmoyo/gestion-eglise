import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil, Users } from "lucide-react";
import { format } from "@/lib/format";

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

  // Responsable nom
  let responsableNom: string | null = null;
  if (activite.responsable_id) {
    const { data: responsable } = await supabase
      .from("ouvriers")
      .select("prenom, nom")
      .eq("id", activite.responsable_id)
      .single();
    if (responsable) responsableNom = `${responsable.prenom} ${responsable.nom}`;
  }

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
            <p className="text-muted-foreground">
              {format.date(activite.date_activite)}
              {activite.heure ? ` · ${activite.heure.slice(0, 5)}` : ""}
            </p>
            {activite.lieu && <p className="text-muted-foreground">📍 {activite.lieu}</p>}
            {responsableNom && <p className="text-muted-foreground">Responsable : {responsableNom}</p>}
            {activite.description && <p className="mt-2">{activite.description}</p>}
          </CardContent>
        </Card>

        {/* Saisie des présences : reservee a la gestion du departement, pas a
            la simple consultation de l'activite. */}
        {peutGerer && (
          <Link href={`/departements/${departementId}/activites/${activiteId}/presences`}>
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="pt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-primary" />
                  <p className="font-semibold text-sm">Présences</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </>
  );
}
