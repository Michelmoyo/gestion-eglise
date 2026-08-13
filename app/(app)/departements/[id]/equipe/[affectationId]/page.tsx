import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { format } from "@/lib/format";
import { EquipeActions } from "@/components/departements/equipe-actions";
import { AvatarOuvrier } from "@/components/ouvriers/avatar-ouvrier";

export default async function MembreEquipeDetailPage({
  params,
}: {
  params: Promise<{ id: string; affectationId: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { id, affectationId } = await params;

  const { data: dept } = await supabase
    .from("departements")
    .select("id, nom")
    .eq("id", id)
    .single();

  if (!dept) notFound();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;

  const { data: monAff } = await supabase
    .from("affectations")
    .select("role")
    .eq("ouvrier_id", moi.id)
    .eq("departement_id", id)
    .eq("statut", "actif")
    .single();

  const isPresident = monAff?.role === "president";
  const peutGerer = isPilotage || isPresident;

  if (!peutGerer) redirect(`/departements/${id}`);

  const { data: affectation } = await supabase
    .from("affectations")
    .select("id, role, statut, date_affectation, date_changement_statut, date_fin_suspension, ouvrier_id")
    .eq("id", affectationId)
    .eq("departement_id", id)
    .single();

  if (!affectation) notFound();

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("prenom, postnom, nom, email, photo_url")
    .eq("id", affectation.ouvrier_id)
    .single();

  if (!ouvrier) notFound();

  return (
    <>
      <TopBar title="Membre de l'équipe" />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${id}/equipe`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Équipe
        </Link>

        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <AvatarOuvrier photoUrl={ouvrier.photo_url} prenom={ouvrier.prenom} nom={ouvrier.nom} size={64} />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold truncate">
                {ouvrier.prenom} {ouvrier.postnom ? `${ouvrier.postnom} ` : ""}{ouvrier.nom}
              </h2>
              <p className="text-sm text-muted-foreground truncate">{ouvrier.email}</p>
              <span
                className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                  affectation.statut === "actif"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {format.statut(affectation.statut)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rôle</span>
              <span className="font-medium">{format.roleDepartement(affectation.role)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Affecté depuis</span>
              <span className="font-medium">{format.date(affectation.date_affectation)}</span>
            </div>
            {affectation.statut === "suspendu" && affectation.date_changement_statut && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suspendu depuis</span>
                <span className="font-medium">{format.date(affectation.date_changement_statut)}</span>
              </div>
            )}
            {affectation.statut === "suspendu" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jusqu&apos;au</span>
                <span className="font-medium">
                  {affectation.date_fin_suspension
                    ? format.date(affectation.date_fin_suspension)
                    : "Durée indéterminée"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {(affectation.statut === "actif" || affectation.statut === "suspendu") && (
          <EquipeActions
            departementId={id}
            affectationId={affectation.id}
            statut={affectation.statut}
            roleActuel={affectation.role}
            isPilotage={isPilotage}
            isPresident={isPresident}
          />
        )}
      </div>
    </>
  );
}
