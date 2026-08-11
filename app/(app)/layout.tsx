import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  const { data: affectations } = ouvrier
    ? await supabase
        .from("affectations")
        .select("departement_id")
        .eq("ouvrier_id", ouvrier.id)
        .eq("statut", "actif")
    : { data: [] };

  const departementIds = (affectations ?? []).map((a) => a.departement_id);

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav
        roleGlobal={ouvrier?.role_global ?? null}
        departementIds={departementIds}
      />
    </div>
  );
}
