"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const mouvementSchema = z.object({
  type: z.enum(["entree", "sortie"]),
  montant: z.coerce.number().positive("Le montant doit être positif."),
  motif: z.string().optional(),
  date_mouvement: z.string().min(1, "Date requise."),
}).refine((d) => d.type !== "sortie" || (d.motif && d.motif.trim().length > 0), {
  message: "Le motif est obligatoire pour une sortie.",
  path: ["motif"],
});

export async function enregistrerMouvement(departementId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) return { error: "Utilisateur introuvable." };

  // Vérifier accès : pasteur/assistant, ou rôle caisse dans le département
  const isPilotage = !!moi.role_global;
  if (!isPilotage) {
    const { data: aff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", departementId)
      .eq("statut", "actif")
      .single();
    const rolesCaisse = ["president", "vice_president", "tresorier"];
    if (!aff || !rolesCaisse.includes(aff.role)) {
      return { error: "Accès refusé." };
    }
  }

  const raw = {
    type: formData.get("type"),
    montant: formData.get("montant"),
    motif: (formData.get("motif") as string) || undefined,
    date_mouvement: formData.get("date_mouvement"),
  };

  const parsed = mouvementSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides." };
  }

  const { error } = await supabase.from("mouvements_caisse").insert({
    departement_id: departementId,
    type: parsed.data.type,
    montant: parsed.data.montant,
    motif: parsed.data.motif ?? null,
    date_mouvement: parsed.data.date_mouvement,
    auteur_id: moi.id,
  });

  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath(`/departements/${departementId}/caisse`);
  return { success: true };
}
