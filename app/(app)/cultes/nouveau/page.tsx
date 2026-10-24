import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { CulteForm } from "@/components/cultes/culte-form";
import { creerCulte } from "../actions";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { CULTES_RECURRENTS, trouverCulteRecurrent, prochaineOccurrence } from "@/lib/cultes-recurrents";

export default async function NouveauCultePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect("/cultes");

  const { type } = await searchParams;
  const recurrent = type ? trouverCulteRecurrent(type) : undefined;
  const afficherFormulaire = type === "ponctuel" || !!recurrent;

  return (
    <>
      <TopBar title="Nouveau culte" />

      <div className="p-4 space-y-4">
        <Link
          href={afficherFormulaire ? "/cultes/nouveau" : "/cultes"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {afficherFormulaire ? "Changer de type" : "Cultes"}
        </Link>

        {afficherFormulaire ? (
          <CulteForm
            action={creerCulte}
            submitLabel="Créer le culte"
            defaultValues={
              recurrent
                ? {
                    type: recurrent.label,
                    date_culte: prochaineOccurrence(recurrent.jourSemaine),
                    heure: recurrent.heureDebut,
                    heure_fin: recurrent.heureFin,
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Culte hebdomadaire</p>
              {CULTES_RECURRENTS.map((c) => (
                <Link key={c.cle} href={`/cultes/nouveau?type=${c.cle}`}>
                  <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{c.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.heureDebut} – {c.heureFin}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Autre</p>
              <Link href="/cultes/nouveau?type=ponctuel">
                <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <CardContent className="py-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Culte ponctuel</p>
                    <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/cultes/seminaire">
                <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <CardContent className="py-3 flex items-center gap-3">
                    <CalendarRange size={18} className="text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Générer les cultes d&apos;un séminaire</p>
                      <p className="text-xs text-muted-foreground">Plusieurs dates d&apos;un coup</p>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
