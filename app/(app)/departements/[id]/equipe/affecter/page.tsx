import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft } from "lucide-react";
import { AffecterLibreForm } from "@/components/departements/affecter-libre-form";
import { affecterOuvrier } from "@/app/(app)/departements/[id]/equipe/actions";

export default async function AffecterEquipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { id } = await params;

  const { data: dept } = await supabase
    .from("departements")
    .select("id, nom")
    .eq("id", id)
    .single();

  if (!dept) notFound();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect(`/departements/${id}/equipe`);

  // Ouvriers déjà affectés (actifs ou suspendus) à un département, quel qu'il soit
  const { data: occupes } = await supabase
    .from("affectations")
    .select("ouvrier_id")
    .in("statut", ["actif", "suspendu"]);

  const occupesIds = new Set((occupes ?? []).map((a) => a.ouvrier_id));

  const { data: ouvriers } = await supabase
    .from("ouvriers")
    .select("id, nom, prenom, email")
    .eq("statut", "actif")
    .order("nom");

  const libres = (ouvriers ?? []).filter((o) => !occupesIds.has(o.id));

  const action = affecterOuvrier.bind(null, id);

  return (
    <>
      <TopBar title="Affecter un ouvrier" />
      <div className="p-4 pb-2">
        <Link
          href={`/departements/${id}/equipe`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {dept.nom}
        </Link>
      </div>
      <AffecterLibreForm ouvriers={libres} action={action} />
    </>
  );
}
