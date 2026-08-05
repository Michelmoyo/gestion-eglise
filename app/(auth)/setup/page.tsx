import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "@/components/auth/setup-form";

export default async function SetupPage() {
  const supabase = await createClient();

  // Si un pasteur existe déjà, cette page est inutile
  const { count } = await supabase
    .from("ouvriers")
    .select("id", { count: "exact", head: true })
    .eq("role_global", "pasteur");

  if ((count ?? 0) > 0) {
    redirect("/connexion");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <SetupForm />
    </div>
  );
}
