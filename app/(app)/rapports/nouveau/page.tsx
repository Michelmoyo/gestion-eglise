import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function NouveauRapportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect("/mon-espace");

  const { data: departements } = await supabase.from("departements").select("id, nom").order("nom");

  return (
    <>
      <TopBar title="Nouveau rapport" />

      <div className="p-4 space-y-4">
        <Link
          href="/rapports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Rapports
        </Link>

        <p className="text-sm text-muted-foreground">
          Choisissez le département concerné :
        </p>

        <div className="space-y-2">
          {!departements?.length ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucun département accessible.
            </p>
          ) : (
            departements.map((d) => (
              <Link key={d.id} href={`/departements/${d.id}/rapport`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <p className="font-medium text-sm">{d.nom}</p>
                    <ChevronRight size={16} className="text-muted-foreground" />
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
