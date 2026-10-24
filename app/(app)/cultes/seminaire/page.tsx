import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { SeminaireForm } from "@/components/cultes/seminaire-form";
import { ChevronLeft } from "lucide-react";

export default async function SeminaireCultePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect("/cultes");

  return (
    <>
      <TopBar title="Générer un séminaire" />

      <div className="p-4 space-y-4">
        <Link
          href="/cultes/nouveau"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Nouveau culte
        </Link>

        <SeminaireForm />
      </div>
    </>
  );
}
