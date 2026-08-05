import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ActiviteForm } from "@/components/activites/activite-form";
import { creerActivite } from "../actions";
import { ChevronLeft } from "lucide-react";

export default async function NouvelleActivitePage({
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

  // Vérification des droits
  const isPilotage = !!moi.role_global;
  if (!isPilotage) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", departementId)
      .eq("statut", "actif")
      .single();

    if (!aff) redirect("/departements");
    const peutGerer = ["president", "vice_president", "secretaire"].includes(aff.role);
    if (!peutGerer) redirect(`/departements/${departementId}/activites`);
  }

  // Liste des membres actifs du département pour le champ responsable
  const { data: affectations } = await supabase
    .from("affectations")
    .select("ouvrier_id")
    .eq("departement_id", departementId)
    .eq("statut", "actif");

  const ouvrieurIds = (affectations ?? []).map((a) => a.ouvrier_id);
  const { data: membres } = ouvrieurIds.length
    ? await supabase
        .from("ouvriers")
        .select("id, prenom, nom")
        .in("id", ouvrieurIds)
        .order("nom")
    : { data: [] };

  const action = creerActivite.bind(null, departementId);

  return (
    <>
      <TopBar title="Nouvelle activité" />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${departementId}/activites`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Activités
        </Link>

        <ActiviteForm
          action={action}
          membres={membres ?? []}
          submitLabel="Créer l'activité"
        />
      </div>
    </>
  );
}
