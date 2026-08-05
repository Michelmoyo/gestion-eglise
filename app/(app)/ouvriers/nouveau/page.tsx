import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { OuvrierForm } from "@/components/ouvriers/ouvrier-form";
import { creerOuvrier } from "@/app/(app)/ouvriers/actions";
import { ChevronLeft } from "lucide-react";

export default async function NouvelOuvrierPage() {
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
      <TopBar title="Nouvel ouvrier" />
      <div className="p-4 pb-2">
        <Link
          href="/ouvriers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Retour
        </Link>
      </div>
      <OuvrierForm action={creerOuvrier} submitLabel="Créer et envoyer l'invitation" />
    </>
  );
}
