import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft, Church, CalendarDays } from "lucide-react";
import { format } from "@/lib/format";
import { getPresencesMois } from "@/lib/presences";

const STATUT_STYLE: Record<string, { label: string; className: string }> = {
  present: { label: "Présent", className: "bg-green-100 text-green-700" },
  absent: { label: "Absent", className: "bg-red-100 text-red-700" },
  excuse: { label: "Excusé", className: "bg-orange-100 text-orange-700" },
};

export default async function MesPresencesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!ouvrier) redirect("/connexion");

  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const presences = await getPresencesMois(supabase, ouvrier.id, debutMois);

  return (
    <>
      <TopBar title="Mes présences" />

      <div className="p-4 space-y-4">
        <Link
          href="/mon-espace"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Mon espace
        </Link>

        {!presences.length ? (
          <p className="text-sm text-muted-foreground">Aucune présence enregistrée ce mois.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {presences.map((p) => {
              const href =
                p.type === "culte"
                  ? `/cultes/${p.id}`
                  : `/departements/${p.departementId}/activites/${p.id}`;
              const style = STATUT_STYLE[p.statut];

              return (
                <Link key={`${p.type}-${p.id}`} href={href}>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.type === "culte" ? (
                        <Church size={16} className="text-muted-foreground flex-shrink-0" />
                      ) : (
                        <CalendarDays size={16} className="text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.titre}</p>
                        <p className="text-xs text-muted-foreground">
                          {format.date(p.date)}
                          {p.heure ? ` · ${p.heure.slice(0, 5)}` : ""}
                          {p.lieu ? ` · ${p.lieu}` : ""}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${style.className}`}
                    >
                      {style.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
