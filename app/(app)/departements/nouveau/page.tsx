import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { DepartementForm } from "@/components/departements/departement-form";
import { creerDepartement } from "@/app/(app)/departements/actions";
import { ChevronLeft } from "lucide-react";

export default async function NouveauDepartementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect("/mon-espace");

  return (
    <>
      <TopBar title="Nouveau département" />
      <div className="p-4 pb-2">
        <Link
          href="/departements"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Retour
        </Link>
      </div>
      <DepartementForm action={creerDepartement} submitLabel="Créer le département" />
    </>
  );
}
