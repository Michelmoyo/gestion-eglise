import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft } from "lucide-react";
import { PointSuiviDetail } from "@/components/departements/point-suivi-detail";
import {
  modifierPointSuivi,
  resoudrePointSuivi,
  rouvrirPointSuivi,
  supprimerPointSuivi,
  uploaderPieceJointe,
  supprimerPieceJointe,
} from "../actions";

export default async function PointSuiviDetailPage({
  params,
}: {
  params: Promise<{ id: string; pointId: string }>;
}) {
  const { id, pointId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: point } = await supabase
    .from("points_suivi")
    .select(
      "id, contenu, description, resolu, date_creation, date_resolution, piece_jointe_path, piece_jointe_nom, liste_id"
    )
    .eq("id", pointId)
    .eq("departement_id", id)
    .single();

  if (!point) notFound();

  const { data: liste } = await supabase
    .from("listes_suivi")
    .select("nom")
    .eq("id", point.liste_id)
    .single();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;
  let peutGerer = isPilotage;

  if (!peutGerer) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("id, role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", id)
      .eq("statut", "actif")
      .single();

    if (!aff) redirect("/departements");
    peutGerer = ["president", "vice_president", "secretaire"].includes(aff.role);
  }

  let pieceJointeUrl: string | null = null;
  if (point.piece_jointe_path) {
    const { data: signed } = await supabase.storage
      .from("pieces-jointes")
      .createSignedUrl(point.piece_jointe_path, 60 * 60);
    pieceJointeUrl = signed?.signedUrl ?? null;
  }

  return (
    <>
      <TopBar title={liste?.nom ?? "Suivi"} />

      <div className="p-4 space-y-4">
        <Link
          href={`/departements/${id}/suivi`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {liste?.nom ?? "Suivi"}
        </Link>

        <PointSuiviDetail
          departementId={id}
          point={point}
          pieceJointeUrl={pieceJointeUrl}
          peutGerer={peutGerer}
          modifierAction={modifierPointSuivi.bind(null, id, pointId)}
          resoudreAction={resoudrePointSuivi.bind(null, id, pointId)}
          rouvrirAction={rouvrirPointSuivi.bind(null, id, pointId)}
          supprimerAction={supprimerPointSuivi.bind(null, id, pointId)}
          uploaderAction={uploaderPieceJointe.bind(null, id, pointId)}
          supprimerPieceJointeAction={supprimerPieceJointe.bind(null, id, pointId)}
        />
      </div>
    </>
  );
}
