import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, UserPlus, CalendarDays, FileText, Pin, MessageCircle, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "@/lib/format";
import { marquerLue, marquerToutesLues, supprimerNotification } from "./actions";

const ICONES: Record<string, LucideIcon> = {
  nouvelle_affectation: UserPlus,
  nouvelle_activite: CalendarDays,
  rapport_soumis: FileText,
  nouveau_point_suivi: Pin,
  nouveau_commentaire_suivi: MessageCircle,
  ajout_membre_suivi: UserPlus,
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

  // Une notification lue disparait de la liste (cf. marquerLue) : tout ce
  // qui est renvoye ici est donc toujours non lu.
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, contenu, lien, created_at")
    .eq("destinataire_id", moi.id)
    .eq("lue", false)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <TopBar title="Notifications" />

      <div className="p-4 space-y-3">
        {!!notifications?.length && (
          <form action={marquerToutesLues}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Tout marquer comme lu ({notifications.length})
            </Button>
          </form>
        )}

        {!notifications?.length ? (
          <EmptyState icon={Bell} message="Aucune notification." />
        ) : (
          notifications.map((n) => {
            const Icone = ICONES[n.type] ?? Bell;
            return (
              <Card key={n.id} className="border-primary/40 bg-primary/5">
                <CardContent className="p-3 flex items-start gap-3">
                  <form action={marquerLue.bind(null, n.id, n.lien)} className="flex-1 min-w-0">
                    <button type="submit" className="w-full text-left flex items-start gap-3">
                      <Icone size={18} className="text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{n.contenu}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format.date(n.created_at)}
                        </p>
                      </div>
                    </button>
                  </form>
                  <form action={supprimerNotification.bind(null, n.id)}>
                    <button
                      type="submit"
                      aria-label="Supprimer la notification"
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1"
                    >
                      <X size={16} />
                    </button>
                  </form>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
