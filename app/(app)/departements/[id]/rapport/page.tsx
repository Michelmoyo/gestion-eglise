import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { format } from "@/lib/format";
import { RapportForm } from "@/components/departements/rapport-form";
import { soumettrerapport } from "./actions";

export default async function RapportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { id } = await params;

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

  const { data: monAff } = await supabase
    .from("affectations")
    .select("role")
    .eq("ouvrier_id", moi.id)
    .eq("departement_id", id)
    .eq("statut", "actif")
    .single();

  const rolesGestion = ["president", "vice_president", "secretaire"];
  const peutSoumettre = isPilotage || rolesGestion.includes(monAff?.role ?? "");

  if (!peutSoumettre) redirect(`/departements/${id}`);

  // Période courante : 1er du mois en cours
  const now = new Date();
  const periodeCourante = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // Rapport existant pour ce mois
  const { data: rapportExistant } = await supabase
    .from("rapports")
    .select("*")
    .eq("departement_id", id)
    .eq("periode", periodeCourante)
    .single();

  // Données calculées pour le rapport pré-rempli
  const debutMois = periodeCourante;
  const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().split("T")[0];

  // Activités du mois avec leur taux de présence
  const { data: activitesMois } = await supabase
    .from("activites")
    .select("id, titre, date_activite, heure")
    .eq("departement_id", id)
    .gte("date_activite", debutMois)
    .lte("date_activite", finMois)
    .order("date_activite", { ascending: true });

  // Présences par activité
  const activiteIds = (activitesMois ?? []).map((a) => a.id);
  const { data: presencesMois } = activiteIds.length
    ? await supabase
        .from("presences")
        .select("activite_id, statut")
        .in("activite_id", activiteIds)
    : { data: [] };

  const statsByActivite = (activitesMois ?? []).map((act) => {
    const pres = (presencesMois ?? []).filter((p) => p.activite_id === act.id);
    const nbPresent = pres.filter((p) => p.statut === "present").length;
    const nbTotal = pres.length;
    return {
      ...act,
      nbPresent,
      nbTotal,
      taux: nbTotal > 0 ? Math.round((nbPresent / nbTotal) * 100) : null,
    };
  });

  // Effectifs : nouveaux ce mois, suspendus ce mois
  const { data: nouveauxMois } = await supabase
    .from("affectations")
    .select("ouvrier_id, date_affectation")
    .eq("departement_id", id)
    .gte("date_affectation", debutMois)
    .lte("date_affectation", finMois);

  const nouveauxIds = (nouveauxMois ?? []).map((a) => a.ouvrier_id);
  const { data: nouveauxOuvriers } = nouveauxIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", nouveauxIds)
    : { data: [] };

  const { data: suspendusMois } = await supabase
    .from("affectations")
    .select("ouvrier_id, date_changement_statut")
    .eq("departement_id", id)
    .eq("statut", "suspendu")
    .gte("date_changement_statut", debutMois)
    .lte("date_changement_statut", finMois);

  const suspendusIds = (suspendusMois ?? []).map((a) => a.ouvrier_id);
  const { data: suspendusOuvriers } = suspendusIds.length
    ? await supabase.from("ouvriers").select("id, prenom, nom").in("id", suspendusIds)
    : { data: [] };

  const action = soumettrerapport.bind(null, id);
  const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(now);

  return (
    <>
      <TopBar title="Rapport mensuel" />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {dept.nom}
        </Link>

        <div className="text-center">
          <h2 className="font-semibold text-lg capitalize">{moisLabel}</h2>
          {rapportExistant && (
            <p className="text-xs text-green-600 mt-1">
              Soumis le {format.date(rapportExistant.date_soumission)}
            </p>
          )}
        </div>

        {/* Activités du mois */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Activités ce mois ({statsByActivite.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {!statsByActivite.length ? (
              <p className="text-sm text-muted-foreground py-2">Aucune activité ce mois.</p>
            ) : (
              statsByActivite.map((a) => (
                <div key={a.id} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{a.titre}</p>
                    <p className="text-xs text-muted-foreground">{format.date(a.date_activite)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {a.taux !== null ? `${a.nbPresent}/${a.nbTotal} (${a.taux}%)` : "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Mouvements d'effectifs */}
        {(nouveauxOuvriers?.length || suspendusOuvriers?.length) ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Mouvements d&apos;effectifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nouveauxOuvriers?.length ? (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">Nouvelles adhésions</p>
                  {nouveauxOuvriers.map((o) => (
                    <p key={o.id} className="text-sm">{o.prenom} {o.nom}</p>
                  ))}
                </div>
              ) : null}
              {suspendusOuvriers?.length ? (
                <div>
                  <p className="text-xs font-semibold text-orange-600 mb-1">Suspensions</p>
                  {suspendusOuvriers.map((o) => (
                    <p key={o.id} className="text-sm">{o.prenom} {o.nom}</p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Formulaire difficultés / besoins / objectifs */}
        <RapportForm
          action={action}
          periode={periodeCourante}
          initialData={{
            difficultes: rapportExistant?.difficultes ?? "",
            besoins: rapportExistant?.besoins ?? "",
            objectifs: rapportExistant?.objectifs ?? "",
          }}
        />
      </div>
    </>
  );
}
