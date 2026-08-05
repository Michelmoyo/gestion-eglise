import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ActiviteForm } from "@/components/activites/activite-form";
import { modifierActivite } from "../../actions";
import { ChevronLeft } from "lucide-react";

export default async function ModifierActivitePage({
  params,
}: {
  params: Promise<{ id: string; activiteId: string }>;
}) {
  const { id: departementId, activiteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

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
    if (!peutGerer) redirect(`/departements/${departementId}/activites/${activiteId}`);
  }

  const { data: activite } = await supabase
    .from("activites")
    .select("id, titre, date_activite, heure, lieu, description, responsable_id")
    .eq("id", activiteId)
    .eq("departement_id", departementId)
    .single();

  if (!activite) notFound();

  // Membres actifs du département pour le champ responsable
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

  const action = modifierActivite.bind(null, departementId, activiteId);

  return (
    <>
      <TopBar title="Modifier l'activité" />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${departementId}/activites/${activiteId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Retour
        </Link>

        <ActiviteForm
          action={action}
          defaultValues={{
            titre: activite.titre,
            date_activite: activite.date_activite,
            heure: activite.heure,
            lieu: activite.lieu,
            description: activite.description,
            responsable_id: activite.responsable_id,
          }}
          membres={membres ?? []}
          submitLabel="Enregistrer les modifications"
        />
      </div>
    </>
  );
}
