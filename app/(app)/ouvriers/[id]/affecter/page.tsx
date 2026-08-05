import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { AffecterForm } from "@/components/ouvriers/affecter-form";
import { affecter } from "@/app/(app)/ouvriers/[id]/affecter/actions";
import { ChevronLeft } from "lucide-react";

export default async function AffecterOuvrierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect("/mon-espace");

  const { id } = await params;

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("id, nom, prenom")
    .eq("id", id)
    .single();

  if (!ouvrier) notFound();

  const { data: departements } = await supabase
    .from("departements")
    .select("id, nom")
    .order("nom");

  // Départements où l'ouvrier est déjà affecté
  const { data: dejaDans } = await supabase
    .from("affectations")
    .select("departement_id")
    .eq("ouvrier_id", id);

  const dejaDansIds = new Set((dejaDans ?? []).map((a) => a.departement_id));
  const departementsDispo = (departements ?? []).filter((d) => !dejaDansIds.has(d.id));

  const action = affecter.bind(null, id);

  return (
    <>
      <TopBar title="Affecter à un département" />
      <div className="p-4 pb-2">
        <Link
          href={`/ouvriers/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {ouvrier.prenom} {ouvrier.nom}
        </Link>
      </div>
      <AffecterForm
        ouvrierId={id}
        departements={departementsDispo}
        action={action}
      />
    </>
  );
}
