import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft, UserPlus, Users } from "lucide-react";
import { format } from "@/lib/format";

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

        <div className="flex flex-col gap-4 pt-2">
          {!effectifs?.length && <EmptyState icon={Users} message="Aucun membre." />}
          {(effectifs ?? []).map((e) => (
            <Link key={e.ouvrier_id} href={`/departements/${id}/equipe/${e.affectation_id}`}>
              <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {e.prenom[0]}{e.nom[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {e.prenom} {e.nom}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {format.roleDepartement(e.role)} · depuis {format.date(e.date_affectation)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      e.statut === "actif"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {format.statut(e.statut)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
