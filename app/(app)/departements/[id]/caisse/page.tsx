import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { format } from "@/lib/format";
import { MouvementForm } from "@/components/departements/mouvement-form";
import { enregistrerMouvement } from "./actions";

export default async function CaissePage({
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

  const rolesCaisse = ["president", "vice_president", "tresorier"];
  const peutEcrire = isPilotage || rolesCaisse.includes(monAff?.role ?? "");

  if (!peutEcrire && !monAff) redirect(`/departements/${id}`);

  // Solde via la fonction RPC sécurisée
  const { data: soldeData } = await supabase.rpc("fn_solde_departement", {
    p_departement_id: id,
  });
  const solde = (soldeData as number) ?? 0;

  // Historique des mouvements (accessible seulement si rôle caisse)
  const { data: mouvements } = peutEcrire
    ? await supabase
        .from("mouvements_caisse")
        .select("id, type, montant, motif, date_mouvement, auteur_id")
        .eq("departement_id", id)
        .order("date_mouvement", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  // Noms des auteurs
  const auteurIds = [...new Set((mouvements ?? []).map((m) => m.auteur_id))];
  const { data: auteurs } = auteurIds.length
    ? await supabase
        .from("ouvriers")
        .select("id, prenom, nom")
        .in("id", auteurIds)
    : { data: [] };
  const auteurNom = Object.fromEntries(
    (auteurs ?? []).map((a) => [a.id, `${a.prenom} ${a.nom}`])
  );

  const action = enregistrerMouvement.bind(null, id);

  return (
    <>
      <TopBar title="Caisse" />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {dept.nom}
        </Link>

        {/* Solde */}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Solde actuel</p>
            <p className={`text-4xl font-bold ${solde >= 0 ? "text-green-600" : "text-destructive"}`}>
              {format.montant(solde)}
            </p>
          </CardContent>
        </Card>

        {/* Formulaire nouveau mouvement */}
        {peutEcrire && <MouvementForm action={action} />}

        {/* Historique */}
        {peutEcrire && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historique</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {!mouvements?.length ? (
                <p className="text-sm text-muted-foreground py-2">Aucun mouvement.</p>
              ) : (
                mouvements.map((m) => (
                  <div key={m.id} className="py-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {m.motif || (m.type === "entree" ? "Entrée" : "Sortie")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format.date(m.date_mouvement)} · {auteurNom[m.auteur_id] ?? "—"}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold flex-shrink-0 ${
                        m.type === "entree" ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {m.type === "entree" ? "+" : "-"}{format.montant(m.montant)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Vue lecture seule pour membre/trésorier sans droit d'écriture */}
        {!peutEcrire && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground text-center">
                Vous consultez le solde en lecture seule.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
