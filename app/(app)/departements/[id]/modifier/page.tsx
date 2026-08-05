import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { DepartementForm } from "@/components/departements/departement-form";
import { modifierDepartement } from "@/app/(app)/departements/actions";
import { ChevronLeft } from "lucide-react";

export default async function ModifierDepartementPage({
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

  const { data: dept } = await supabase
    .from("departements")
    .select("*")
    .eq("id", id)
    .single();

  if (!dept) notFound();

  const action = modifierDepartement.bind(null, id);

  return (
    <>
      <TopBar title="Modifier le département" />
      <div className="p-4 pb-2">
        <Link
          href={`/departements/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Retour
        </Link>
      </div>
      <DepartementForm
        departement={dept}
        action={action}
        submitLabel="Enregistrer les modifications"
      />
    </>
  );
}
