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
    .select("id, periode_debut, periode_fin, date_soumission, auteur_id")
    .eq("departement_id", id)
    .order("date_soumission", { ascending: false });

  const auteurIds = [...new Set((rapports ?? []).map((r) => r.auteur_id))];
  const { data: auteurs } = auteurIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", auteurIds)
    : { data: [] };
  const auteurNomById = Object.fromEntries((auteurs ?? []).map((a) => [a.id, `${a.prenom} ${a.nom}`]));

  const rapportsAffiches = (rapports ?? []).map((r) => ({
    id: r.id,
    periodeDebut: r.periode_debut,
    periodeFin: r.periode_fin,
    date_soumission: r.date_soumission,
    auteurNom: auteurNomById[r.auteur_id] ?? "—",
  }));

  // Meme seuil que fn_est_en_retard/calculerSante (cf. lib/sante.ts) :
  // > 30j sans rapport = en retard, pas de date du tout = jamais soumis.
  const dernierRapport = rapports?.[0]?.date_soumission;
  const statut = !dernierRapport
    ? { label: "JAMAIS SOUMIS", cls: "bg-orange-100 text-orange-700" }
    : Math.floor((Date.now() - new Date(dernierRapport).getTime()) / 86_400_000) > 30
    ? { label: "EN RETARD", cls: "bg-orange-100 text-orange-700" }
    : { label: "À JOUR", cls: "bg-green-100 text-green-700" };

  return (
    <>
      <TopBar title={`${dept.nom} — Rapports`} />

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/rapports"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            Rapports
          </Link>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statut.cls}`}>
            {statut.label}
          </span>
        </div>

        <Link href={`/departements/${id}/rapport`} className="block">
          <Button className="w-full gap-2">
            <Plus size={16} />
            Nouveau rapport
          </Button>
        </Link>

        <ListeRapports rapports={rapportsAffiches} />
      </div>
    </>
  );
}
