import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "@/lib/format";

export default async function RapportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect("/mon-espace");

  const { data: rapports } = await supabase
    .from("rapports")
    .select("id, departement_id, periode, date_soumission, auteur_id")
    .order("date_soumission", { ascending: false })
    .limit(100);

  const deptIds = [...new Set((rapports ?? []).map((r) => r.departement_id).filter((v): v is string => !!v))];
  const { data: departements } = deptIds.length
    ? await supabase.from("departements").select("id, nom").in("id", deptIds)
    : { data: [] };
  const deptNomById = Object.fromEntries((departements ?? []).map((d) => [d.id, d.nom]));

  const auteurIds = [...new Set((rapports ?? []).map((r) => r.auteur_id))];
  const { data: auteurs } = auteurIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", auteurIds)
    : { data: [] };
  const auteurNomById = Object.fromEntries(
    (auteurs ?? []).map((a) => [a.id, `${a.prenom} ${a.nom}`])
  );

  return (
    <>
      <TopBar title="Rapports" />

      <div className="p-4 space-y-4">
        <Link href="/rapports/nouveau">
          <Button className="w-full gap-2">
            <Plus size={16} />
            Nouveau rapport
          </Button>
        </Link>

        <div className="space-y-2">
        {!rapports?.length ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucun rapport soumis pour l&apos;instant.
          </p>
        ) : (
          rapports.map((r) => (
            <Link key={r.id} href={`/rapports/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <p className="font-semibold text-sm">
                    {deptNomById[r.departement_id ?? ""] ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
                      new Date(r.periode)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Soumis le {format.date(r.date_soumission)} par {auteurNomById[r.auteur_id] ?? "—"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
        </div>
      </div>
    </>
  );
}
