import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, CalendarDays, Clock, MapPin, Church } from "lucide-react";
import { format } from "@/lib/format";

export default async function CultesPage() {
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

  const { data: cultes } = await supabase
    .from("cultes")
    .select("id, type, date_culte, heure, lieu")
    .order("date_culte", { ascending: false });

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

        <div className="space-y-8">
          {!cultes?.length && (
            <EmptyState icon={Church} message="Aucun culte enregistré." />
          )}
          {(cultes ?? []).map((c) => (
            <Link key={c.id} href={`/cultes/${c.id}`}>
              <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Church size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{c.type}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {format.date(c.date_culte)}
                      </span>
                      {c.heure && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {c.heure.slice(0, 5)}
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
