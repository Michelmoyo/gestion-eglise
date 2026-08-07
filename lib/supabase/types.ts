// Types générés manuellement depuis schema.sql
// À remplacer par : npx supabase gen types typescript --linked > lib/supabase/types.ts
// une fois le projet Supabase lié

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SexeEnum = "M" | "F";
export type StatutOuvrierEnum = "actif" | "inactif";
export type RoleGlobalEnum = "pasteur" | "assistant";
export type RoleDepartementEnum =
  | "membre"
  | "secretaire"
  | "tresorier"
  | "vice_president"
  | "president";
export type StatutAffectationEnum = "actif" | "suspendu" | "quitte";
export type StatutPresenceEnum = "present" | "absent" | "excuse";
export type TypeMouvementEnum = "entree" | "sortie";
export type SanteEnum = "vert" | "orange" | "rouge";

export interface Database {
  public: {
    Tables: {
      ouvriers: {
        Row: {
          id: string;
          auth_user_id: string | null;
          nom: string;
          postnom: string | null;
          prenom: string;
          sexe: SexeEnum | null;
          date_naissance: string | null;
          telephone: string | null;
          adresse: string | null;
          email: string;
          photo_url: string | null;
          date_integration: string;
          statut: StatutOuvrierEnum;
          role_global: RoleGlobalEnum | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          nom: string;
          postnom?: string | null;
          prenom: string;
          sexe?: SexeEnum | null;
          date_naissance?: string | null;
          telephone?: string | null;
          adresse?: string | null;
          email: string;
          photo_url?: string | null;
          date_integration?: string;
          statut?: StatutOuvrierEnum;
          role_global?: RoleGlobalEnum | null;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          nom?: string;
          postnom?: string | null;
          prenom?: string;
          sexe?: SexeEnum | null;
          date_naissance?: string | null;
          telephone?: string | null;
          adresse?: string | null;
          email?: string;
          photo_url?: string | null;
          date_integration?: string;
          statut?: StatutOuvrierEnum;
          role_global?: RoleGlobalEnum | null;
        };
        Relationships: [];
      };
      departements: {
        Row: {
          id: string;
          nom: string;
          description: string | null;
          date_creation: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          description?: string | null;
          date_creation?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          description?: string | null;
          date_creation?: string;
        };
        Relationships: [];
      };
      affectations: {
        Row: {
          id: string;
          ouvrier_id: string;
          departement_id: string;
          role: RoleDepartementEnum;
          statut: StatutAffectationEnum;
          date_affectation: string;
          date_changement_statut: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ouvrier_id: string;
          departement_id: string;
          role?: RoleDepartementEnum;
          statut?: StatutAffectationEnum;
          date_affectation?: string;
          date_changement_statut?: string | null;
        };
        Update: {
          id?: string;
          ouvrier_id?: string;
          departement_id?: string;
          role?: RoleDepartementEnum;
          statut?: StatutAffectationEnum;
          date_affectation?: string;
          date_changement_statut?: string | null;
        };
        Relationships: [];
      };
      activites: {
        Row: {
          id: string;
          departement_id: string;
          titre: string;
          date_activite: string;
          heure: string | null;
          lieu: string | null;
          description: string | null;
          responsable_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          departement_id: string;
          titre: string;
          date_activite: string;
          heure?: string | null;
          lieu?: string | null;
          description?: string | null;
          responsable_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          departement_id?: string;
          titre?: string;
          date_activite?: string;
          heure?: string | null;
          lieu?: string | null;
          description?: string | null;
          responsable_id?: string | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      presences: {
        Row: {
          id: string;
          activite_id: string;
          ouvrier_id: string;
          statut: StatutPresenceEnum;
          justification: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          activite_id: string;
          ouvrier_id: string;
          statut: StatutPresenceEnum;
          justification?: string | null;
        };
        Update: {
          id?: string;
          activite_id?: string;
          ouvrier_id?: string;
          statut?: StatutPresenceEnum;
          justification?: string | null;
        };
        Relationships: [];
      };
      cultes: {
        Row: {
          id: string;
          type: string;
          date_culte: string;
          heure: string | null;
          lieu: string | null;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          date_culte: string;
          heure?: string | null;
          lieu?: string | null;
          description?: string | null;
          created_by: string;
        };
        Update: {
          id?: string;
          type?: string;
          date_culte?: string;
          heure?: string | null;
          lieu?: string | null;
          description?: string | null;
          created_by?: string;
        };
        Relationships: [];
      };
      presences_culte: {
        Row: {
          id: string;
          culte_id: string;
          ouvrier_id: string;
          statut: StatutPresenceEnum;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          culte_id: string;
          ouvrier_id: string;
          statut: StatutPresenceEnum;
        };
        Update: {
          id?: string;
          culte_id?: string;
          ouvrier_id?: string;
          statut?: StatutPresenceEnum;
        };
        Relationships: [];
      };
      mouvements_caisse: {
        Row: {
          id: string;
          departement_id: string;
          type: TypeMouvementEnum;
          montant: number;
          motif: string | null;
          date_mouvement: string;
          auteur_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          departement_id: string;
          type: TypeMouvementEnum;
          montant: number;
          motif?: string | null;
          date_mouvement?: string;
          auteur_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      rapports: {
        Row: {
          id: string;
          departement_id: string | null;
          periode: string;
          difficultes: string | null;
          besoins: string | null;
          objectifs: string | null;
          auteur_id: string;
          date_soumission: string;
        };
        Insert: {
          id?: string;
          departement_id?: string | null;
          periode: string;
          difficultes?: string | null;
          besoins?: string | null;
          objectifs?: string | null;
          auteur_id: string;
          date_soumission?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          destinataire_id: string;
          type: string;
          contenu: string;
          lue: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destinataire_id: string;
          type: string;
          contenu: string;
          lue?: boolean;
        };
        Update: {
          id?: string;
          destinataire_id?: string;
          type?: string;
          contenu?: string;
          lue?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      v_effectifs_departement: {
        Row: {
          affectation_id: string;
          departement_id: string;
          ouvrier_id: string;
          nom: string;
          postnom: string | null;
          prenom: string;
          role: RoleDepartementEnum;
          statut: StatutAffectationEnum;
          date_affectation: string;
          date_changement_statut: string | null;
        };
        Relationships: [];
      };
      v_taux_presence_activite: {
        Row: {
          activite_id: string;
          nb_presents: number;
          nb_total: number;
          taux_presence: number | null;
        };
        Relationships: [];
      };
      v_taux_presence_culte: {
        Row: {
          culte_id: string;
          nb_presents: number;
          nb_total: number;
          taux_presence: number | null;
        };
        Relationships: [];
      };
      v_taux_presence_departement_30j: {
        Row: {
          departement_id: string;
          taux_presence: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      fn_sante_departement: {
        Args: { p_departement_id: string };
        Returns: SanteEnum;
      };
      fn_solde_departement: {
        Args: { p_departement_id: string };
        Returns: number;
      };
      rpc_assigner_role: {
        Args: {
          p_affectation_id: string;
          p_nouveau_role: RoleDepartementEnum;
        };
        Returns: void;
      };
      rpc_suspendre_ouvrier: {
        Args: { p_affectation_id: string };
        Returns: void;
      };
      rpc_reactiver_ouvrier: {
        Args: { p_affectation_id: string };
        Returns: void;
      };
      rpc_marquer_quitte: {
        Args: { p_affectation_id: string };
        Returns: void;
      };
    };
  };
}
