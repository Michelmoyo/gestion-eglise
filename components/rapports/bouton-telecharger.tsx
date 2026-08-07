"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function BoutonTelecharger() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1 print:hidden"
      onClick={() => window.print()}
    >
      <Download size={14} />
      Télécharger
    </Button>
  );
}
