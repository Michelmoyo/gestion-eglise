import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { DateBadge } from "@/components/ui/date-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Clock, MapPin, Church } from "lucide-react";
import { FiltresCultes } from "@/components/cultes/filtres-cultes";

export default async function CultesPage({
  searchParams,
}: {
  searchParams: Promise<{ debut?: string; fin?: string; type?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;

  const { debut = "", fin = "", type = "" } = await searchParams;

  // Types disponibles pour le filtre : independant de la periode/type deja
  // choisis, pour que le menu ne retrecisse pas au fil des filtres.
  const { data: tousLesCultes } = await supabase.from("cultes").select("type");
  const typesDisponibles = [...new Set((tousLesCultes ?? []).map((c) => c.type))].sort();

  let requete = supabase
    .from("cultes")
    .select("id, type, date_culte, heure, heure_fin, lieu")
    .order("date_culte", { ascending: false });

  if (debut) requete = requete.gte("date_culte", debut);
  if (fin) requete = requete.lte("date_culte", fin);
  if (type) requete = requete.eq("type", type);

  const { data: cultes } = await requete;

  return (
    <>
      <TopBar title="Cultes" />

      <div className="p-4 space-y-4">
        {isPilotage && (
          <Link href="/cultes/nouveau">
            <Button className="w-full gap-2">
              <Plus size={16} />
              Nouveau culte
            </Button>
          </Link>
        )}

        {typesDisponibles.length > 0 && (
          <FiltresCultes typesDisponibles={typesDisponibles} debut={debut} fin={fin} type={type} />
        )}

        <div className="flex flex-col gap-4">
          {!cultes?.length && (
            <EmptyState
              icon={Church}
              message={debut || fin || type ? "Aucun culte pour ces filtres." : "Aucun culte enregistré."}
            />
          )}
          {(cultes ?? []).map((c) => (
            <Link key={c.id} href={`/cultes/${c.id}`}>
              <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <DateBadge dateStr={c.date_culte} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{c.type}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {c.heure && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {c.heure.slice(0, 5)}
                          {c.heure_fin ? ` – ${c.heure_fin.slice(0, 5)}` : ""}
                        </span>
                      )}
                      {c.lieu && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {c.lieu}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
