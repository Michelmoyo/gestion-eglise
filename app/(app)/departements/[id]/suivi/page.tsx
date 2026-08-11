import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { NouvelleListeForm } from "@/components/departements/nouvelle-liste-form";
import { ajouterListe } from "./actions";

export default async function SuiviPage({
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

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;
  let peutGerer = isPilotage;

  if (!isPilotage) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("id, role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", id)
      .eq("statut", "actif")
      .single();

    peutGerer = ["president", "vice_president", "secretaire"].includes(aff?.role ?? "");
  }

  // Aperçu d'ensemble (toutes les listes) : reserve aux responsables du
  // departement et au pilotage. Un ouvrier ajoute a une liste ou une tache
  // precise y accede via "Mes tâches", pas ici.
  if (!peutGerer) redirect(`/departements/${id}`);

  const { data: listes } = await supabase
    .from("listes_suivi")
    .select("id, nom, description, ordre")
    .eq("departement_id", id)
    .order("ordre", { ascending: true });

  const { data: points } = await supabase
    .from("points_suivi")
    .select("id, liste_id, statut")
    .eq("departement_id", id);

  const ajouterListeAction = ajouterListe.bind(null, id);

  return (
    <>
      <TopBar title="Suivi du département" />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {dept.nom}
        </Link>

        {!listes?.length ? (
          <EmptyState icon={ListChecks} message="Aucune liste de suivi pour ce département." />
        ) : (
          <div className="flex flex-col gap-6">
            {listes.map((liste) => {
              const nbActifs = (points ?? []).filter(
                (p) => p.liste_id === liste.id && p.statut !== "termine"
              ).length;

              return (
                <Link key={liste.id} href={`/departements/${id}/suivi/liste/${liste.id}`}>
                  <Card className="hover:bg-primary/5 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ListChecks size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          {liste.nom}
                          {nbActifs > 0 && (
                            <span className="text-muted-foreground font-normal"> ({nbActifs})</span>
                          )}
                        </p>
                        {liste.description && (
                          <p className="text-xs text-muted-foreground truncate">{liste.description}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <NouvelleListeForm action={ajouterListeAction} />
      </div>
    </>
  );
}
