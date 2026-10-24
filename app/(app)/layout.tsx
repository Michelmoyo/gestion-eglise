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
    <div className="min-h-screen relative">
      {/* Degrade "neon" en arriere-plan, fixe (reste en place au scroll).
          Important : pas de bg-background ici sur le conteneur -- un fond
          opaque sur ce div peignait par-dessus les formes (ordre
          d'empilement CSS), les rendant invisibles malgre -z-10. Le fond de
          page vient de body (globals.css) qui reste tout en bas ; cette
          div, sans z-index explicite, se peint ensuite dans l'ordre du DOM
          -- puis main/BottomNav par-dessus, car plus loin dans le DOM. */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      </div>
      <main className="relative pb-24 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav
        roleGlobal={ouvrier?.role_global ?? null}
        departementIds={departementIds}
      />
    </div>
  );
}
