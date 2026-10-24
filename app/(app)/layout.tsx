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
    <div className="min-h-screen bg-background relative">
      {/* Degrade "neon" discret en arriere-plan -- fixe (reste en place au
          scroll), tres atténue pour ne jamais gêner la lecture : les
          cartes (fond blanc opaque) le recouvrent, il ne transparait que
          dans les marges/espaces entre les blocs. */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <main className="pb-24 max-w-lg mx-auto relative">
        {children}
      </main>
      <BottomNav
        roleGlobal={ouvrier?.role_global ?? null}
        departementIds={departementIds}
      />
    </div>
  );
}
