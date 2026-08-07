import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus } from "lucide-react";
import { ListeRapports } from "@/components/rapports/liste-rapports";

export default async function DepartementRapportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: dept } = await supabase
    .from("departements")
    .select("id, nom")
    .eq("id", id)
    .single();

  if (!dept) notFound();

  const { data: rapports } = await supabase
    .from("rapports")
    .select("id, periode, date_soumission, auteur_id")
    .eq("departement_id", id)
    .order("date_soumission", { ascending: false });

  const auteurIds = [...new Set((rapports ?? []).map((r) => r.auteur_id))];
  const { data: auteurs } = auteurIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", auteurIds)
    : { data: [] };
  const auteurNomById = Object.fromEntries((auteurs ?? []).map((a) => [a.id, `${a.prenom} ${a.nom}`]));

  const rapportsAffiches = (rapports ?? []).map((r) => ({
    id: r.id,
    periode: r.periode,
    date_soumission: r.date_soumission,
    auteurNom: auteurNomById[r.auteur_id] ?? "—",
  }));

  return (
    <>
      <TopBar title={`${dept.nom} — Rapports`} />

      <div className="p-4 space-y-4">
        <Link
          href="/rapports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Rapports
        </Link>

        <ListeRapports rapports={rapportsAffiches} />

        <Link href={`/departements/${id}/rapport`}>
          <Button className="w-full gap-2">
            <Plus size={16} />
            Nouveau rapport
          </Button>
        </Link>
      </div>
    </>
  );
}
