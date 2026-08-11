import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search, Users } from "lucide-react";
import { format } from "@/lib/format";

export default async function OuvriersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi?.role_global) redirect("/mon-espace");

  const { q } = await searchParams;

  let query = supabase
    .from("ouvriers")
    .select("id, nom, postnom, prenom, email, statut, role_global, date_integration")
    .order("nom", { ascending: true });

  if (q) {
    query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: ouvriers } = await query;

  // Ouvriers ayant au moins une affectation suspendue dans un département
  const { data: suspendus } = await supabase
    .from("affectations")
    .select("ouvrier_id")
    .eq("statut", "suspendu");

  const suspendusIds = new Set((suspendus ?? []).map((a) => a.ouvrier_id));

  return (
    <>
      <TopBar title="Ouvriers" />

      <div className="p-4 space-y-4">
        {/* Barre de recherche */}
        <form method="GET" className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher un ouvrier…"
            className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </form>

        {/* Bouton créer */}
        <Link href="/ouvriers/nouveau" className="block pt-2">
          <Button className="w-full gap-2">
            <Plus size={16} />
            Ajouter un ouvrier
          </Button>
        </Link>

        {/* Liste */}
        <div className="space-y-10 pt-2">
          {!ouvriers?.length && (
            <EmptyState
              icon={Users}
              message={q ? "Aucun résultat." : "Aucun ouvrier enregistré."}
            />
          )}
          {ouvriers?.map((o) => {
            const statutAffiche =
              o.statut === "actif" && suspendusIds.has(o.id) ? "suspendu" : o.statut;
            return (
              <Link key={o.id} href={`/ouvriers/${o.id}`}>
                <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {o.prenom[0]}{o.nom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {o.prenom} {o.postnom ? `${o.postnom} ` : ""}{o.nom}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{o.email}</p>
                      {o.role_global && (
                        <span
                          className={`inline-block mt-0.5 text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                            o.role_global === "pasteur"
                              ? "bg-gold/15 text-gold"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {format.roleGlobal(o.role_global)}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        statutAffiche === "actif"
                          ? "bg-green-100 text-green-700"
                          : statutAffiche === "suspendu"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {format.statut(statutAffiche)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
