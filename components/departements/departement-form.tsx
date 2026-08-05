"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { departementSchema, type DepartementInput } from "@/lib/validations/departement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/supabase/types";

type Departement = Database["public"]["Tables"]["departements"]["Row"];

interface DepartementFormProps {
  departement?: Departement;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel: string;
}

export function DepartementForm({ departement, action, submitLabel }: DepartementFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartementInput>({
    resolver: zodResolver(departementSchema),
    defaultValues: departement
      ? {
          nom: departement.nom,
          description: departement.description ?? "",
          date_creation: departement.date_creation,
        }
      : {},
  });

  async function onSubmit(data: DepartementInput) {
    setLoading(true);
    setServerError(null);
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v != null && v !== "") formData.set(k, String(v));
    });
    const result = await action(formData);
    if (result?.error) {
      setServerError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      <div className="space-y-1">
        <Label htmlFor="nom">Nom du département *</Label>
        <Input id="nom" {...register("nom")} placeholder="Ex : Chorale, Évangélisation…" />
        {errors.nom && (
          <p className="text-xs text-destructive">{errors.nom.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register("description")}
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          placeholder="Description optionnelle du département…"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="date_creation">Date de création</Label>
        <Input id="date_creation" type="date" {...register("date_creation")} />
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
