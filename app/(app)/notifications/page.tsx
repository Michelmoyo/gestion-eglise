import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "@/lib/format";
import { marquerLue, marquerToutesLues } from "./actions";

const ICONES: Record<string, LucideIcon> = {
  nouvelle_affectation: UserPlus,
  nouvelle_activite: CalendarDays,
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, contenu, lue, created_at")
    .eq("destinataire_id", moi.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const nbNonLues = (notifications ?? []).filter((n) => !n.lue).length;

  return (
    <>
      <TopBar title="Notifications" />

      <div className="p-4 space-y-3">
        {nbNonLues > 0 && (
          <form action={marquerToutesLues}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Tout marquer comme lu ({nbNonLues})
            </Button>
          </form>
        )}

        {!notifications?.length ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucune notification.
          </p>
        ) : (
          notifications.map((n) => {
            const Icone = ICONES[n.type] ?? Bell;
            return (
              <form key={n.id} action={marquerLue.bind(null, n.id)}>
                <button type="submit" disabled={n.lue} className="w-full text-left">
                  <Card className={n.lue ? "" : "border-primary/40 bg-primary/5"}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <Icone size={18} className="text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.lue ? "" : "font-medium"}`}>{n.contenu}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format.date(n.created_at)}
                        </p>
                      </div>
                      {!n.lue && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </CardContent>
                  </Card>
                </button>
              </form>
            );
          })
        )}
      </div>
    </>
  );
}
