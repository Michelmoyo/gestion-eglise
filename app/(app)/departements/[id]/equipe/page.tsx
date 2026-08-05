import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, UserPlus } from "lucide-react";
import { format } from "@/lib/format";
import { EquipeActions } from "@/components/departements/equipe-actions";

export default async function EquipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { id } = await params;

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

  // Membres actifs et suspendus
  const { data: effectifs } = await supabase
    .from("v_effectifs_departement")
    .select("affectation_id, ouvrier_id, nom, prenom, role, statut, date_affectation, date_changement_statut")
    .eq("departement_id", id)
    .order("statut", { ascending: true })
    .order("nom", { ascending: true });

  const actifs = (effectifs ?? []).filter((e) => e.statut === "actif");
  const suspendus = (effectifs ?? []).filter((e) => e.statut === "suspendu");

  return (
    <>
      <TopBar title="Équipe" />

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/departements/${id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            {dept.nom}
          </Link>
          {isPilotage && (
            <Link
              href={`/departements/${id}/equipe/affecter`}
              className="inline-flex items-center gap-1 text-sm text-primary"
            >
              <UserPlus size={15} />
              Affecter
            </Link>
          )}
        </div>

        {/* Membres actifs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Membres actifs ({actifs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {!actifs.length ? (
              <p className="text-sm text-muted-foreground py-2">Aucun membre actif.</p>
            ) : (
              actifs.map((e) => (
                <div key={e.ouvrier_id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        {e.prenom} {e.nom}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format.roleDepartement(e.role)} · depuis {format.date(e.date_affectation)}
                      </p>
                    </div>
                    <EquipeActions
                      departementId={id}
                      affectationId={e.affectation_id}
                      statut="actif"
                      roleActuel={e.role}
                      isPilotage={isPilotage}
                      isPresident={isPresident}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Membres suspendus */}
        {suspendus.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-600">
                Suspendus ({suspendus.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {suspendus.map((e) => (
                <div key={e.ouvrier_id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        {e.prenom} {e.nom}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format.roleDepartement(e.role)}
                        {e.date_changement_statut
                          ? ` · suspendu le ${format.date(e.date_changement_statut)}`
                          : ""}
                      </p>
                    </div>
                    <EquipeActions
                      departementId={id}
                      affectationId={e.affectation_id}
                      statut="suspendu"
                      roleActuel={e.role}
                      isPilotage={isPilotage}
                      isPresident={isPresident}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
