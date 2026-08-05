export const format = {
  date(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  },

  montant(amount: number): string {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FC";
  },

  roleDepartement(role: string): string {
    const labels: Record<string, string> = {
      president: "Président",
      vice_president: "Vice-président",
      secretaire: "Secrétaire",
      tresorier: "Trésorier",
      membre: "Membre",
    };
    return labels[role] ?? role;
  },

  roleGlobal(role: string | null): string {
    if (!role) return "Ouvrier";
    return role === "pasteur" ? "Pasteur" : "Assistant pasteur";
  },

  statut(statut: string): string {
    const labels: Record<string, string> = {
      actif: "Actif",
      suspendu: "Suspendu",
      quitte: "Quitté",
      inactif: "Inactif",
    };
    return labels[statut] ?? statut;
  },
};
