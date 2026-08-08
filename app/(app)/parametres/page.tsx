import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { ParametresForm } from "@/components/parametres/parametres-form";
import { enregistrerParametresEglise } from "./actions";

export default async function ParametresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (moi?.role_global !== "pasteur") redirect("/pilotage");

  const { data: parametres } = await supabase
    .from("parametres_eglise")
    .select("adresse, telephone, email")
    .limit(1)
    .single();

  return (
    <>
      <TopBar title="Paramètres de l'église" />

      <div className="p-4 space-y-4">
        <Link
          href="/pilotage"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Pilotage
        </Link>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Coordonnées de l&apos;église</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Utilisées dans l&apos;en-tête des documents générés (rapports). Réservé au pasteur.
            </p>
            <ParametresForm
              action={enregistrerParametresEglise}
              initialData={{
                adresse: parametres?.adresse ?? "",
                telephone: parametres?.telephone ?? "",
                email: parametres?.email ?? "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
