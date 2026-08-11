import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil } from "lucide-react";
import { format } from "@/lib/format";

export default async function OuvrierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  const { data: ouvrier } = await supabase
    .from("ouvriers")
    .select("*")
    .eq("id", id)
    .single();

  if (!ouvrier) notFound();

  const { data: affectations } = await supabase
    .from("affectations")
    .select("role, statut, date_affectation, departement_id")
    .eq("ouvrier_id", id)
    .order("date_affectation", { ascending: false });

  const deptIds = (affectations ?? []).map((a) => a.departement_id);
  const { data: deptsAff } = deptIds.length
    ? await supabase.from("departements").select("id, nom").in("id", deptIds)
    : { data: [] };
  const deptNomById = Object.fromEntries((deptsAff ?? []).map((d) => [d.id, d.nom]));

  const champsIdentite = [
    { label: "Email", value: ouvrier.email },
    { label: "Téléphone", value: ouvrier.telephone },
    { label: "Adresse", value: ouvrier.adresse },
    { label: "Sexe", value: ouvrier.sexe === "M" ? "Masculin" : ouvrier.sexe === "F" ? "Féminin" : null },
    { label: "Date de naissance", value: format.date(ouvrier.date_naissance) },
    { label: "Intégration", value: format.date(ouvrier.date_integration) },
    { label: "Rôle global", value: format.roleGlobal(ouvrier.role_global) },
  ];

  return (
    <>
      <TopBar title="Fiche ouvrier" />

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/ouvriers"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            Retour
          </Link>
          <Link href={`/ouvriers/${id}/modifier`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Pencil size={14} />
              Modifier
            </Button>
          </Link>
        </div>

        {/* En-tête */}
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {ouvrier.prenom[0]}{ouvrier.nom[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {ouvrier.prenom} {ouvrier.postnom ? `${ouvrier.postnom} ` : ""}{ouvrier.nom}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  ouvrier.statut === "actif"
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {format.statut(ouvrier.statut)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Infos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {champsIdentite.map(({ label, value }) =>
              value && value !== "—" ? (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>

        {/* Affectations */}
        {affectations?.length ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Affectations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {affectations.map((a, i) => {
                const nomDept = deptNomById[a.departement_id] ?? "—";
                return (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{nomDept}</p>
                      <p className="text-xs text-muted-foreground">
                        {format.roleDepartement(a.role)} · depuis {format.date(a.date_affectation)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        a.statut === "actif"
                          ? "bg-green-100 text-green-700"
                          : a.statut === "suspendu"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {format.statut(a.statut)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
