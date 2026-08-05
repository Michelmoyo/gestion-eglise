"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ouvrierSchema, type OuvrierInput } from "@/lib/validations/ouvrier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/supabase/types";

type Ouvrier = Database["public"]["Tables"]["ouvriers"]["Row"];

interface OuvrierFormProps {
  ouvrier?: Ouvrier;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel: string;
}

export function OuvrierForm({ ouvrier, action, submitLabel }: OuvrierFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OuvrierInput>({
    resolver: zodResolver(ouvrierSchema),
    defaultValues: ouvrier
      ? {
          nom: ouvrier.nom,
          postnom: ouvrier.postnom ?? "",
          prenom: ouvrier.prenom,
          email: ouvrier.email,
          sexe: ouvrier.sexe ?? undefined,
          date_naissance: ouvrier.date_naissance ?? "",
          telephone: ouvrier.telephone ?? "",
          adresse: ouvrier.adresse ?? "",
          date_integration: ouvrier.date_integration,
          role_global: ouvrier.role_global ?? undefined,
        }
      : {},
  });

  async function onSubmit(data: OuvrierInput) {
    setLoading(true);
    setServerError(null);

    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v != null && v !== "") formData.set(k, String(v));
    });
    // Toujours envoyer explicitement le champ `role_global` (chaîne vide
    // lorsque l'option "Ouvrier" est choisie). Cela évite des ambiguïtés
    // lors de la sérialisation côté client / action serveur.
    formData.set("role_global", String(data.role_global ?? ""));

    const result = await action(formData);
    if (result?.error) {
      setServerError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="prenom">Prénom *</Label>
          <Input id="prenom" {...register("prenom")} />
          {errors.prenom && (
            <p className="text-xs text-destructive">{errors.prenom.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="nom">Nom *</Label>
          <Input id="nom" {...register("nom")} />
          {errors.nom && (
            <p className="text-xs text-destructive">{errors.nom.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="postnom">Postnom</Label>
        <Input id="postnom" {...register("postnom")} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="sexe">Sexe</Label>
          <select
            id="sexe"
            {...register("sexe")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">—</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="date_naissance">Date de naissance</Label>
          <Input id="date_naissance" type="date" {...register("date_naissance")} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="telephone">Téléphone</Label>
        <Input id="telephone" type="tel" {...register("telephone")} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="adresse">Adresse</Label>
        <Input id="adresse" {...register("adresse")} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="date_integration">Date d&apos;intégration</Label>
        <Input id="date_integration" type="date" {...register("date_integration")} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="role_global">Rôle global</Label>
        <select
          id="role_global"
          {...register("role_global")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Ouvrier (aucun rôle global)</option>
          <option value="pasteur">Pasteur</option>
          <option value="assistant">Assistant pasteur</option>
        </select>
      </div>

      {serverError && (
        <p className="text-sm text-destructive text-center">{serverError}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}
