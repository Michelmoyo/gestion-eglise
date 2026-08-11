import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import { format } from "@/lib/format";

export interface RapportListe {
  id: string;
  periode: string;
  date_soumission: string;
  auteurNom: string;
  departementNom?: string;
}

export function ListeRapports({
  rapports,
  afficherDepartement = false,
}: {
  rapports: RapportListe[];
  afficherDepartement?: boolean;
}) {
  if (!rapports.length) {
    return <EmptyState icon={FileText} message="Aucun rapport soumis pour l'instant." />;
  }

  return (
    <div className="space-y-6">
      {rapports.map((r) => (
        <Link key={r.id} href={`/rapports/${r.id}`}>
          <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
            <CardContent className="p-4">
              {afficherDepartement && (
                <p className="font-semibold text-sm">{r.departementNom ?? "—"}</p>
              )}
              <p
                className={
                  afficherDepartement
                    ? "text-xs text-muted-foreground mt-0.5 capitalize"
                    : "font-semibold text-sm capitalize"
                }
              >
                {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
                  new Date(r.periode)
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Soumis le {format.date(r.date_soumission)} par {r.auteurNom}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
