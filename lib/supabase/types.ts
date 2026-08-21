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
export type StatutPointSuiviEnum = "a_faire" | "en_cours" | "termine";

export interface Database {
  public: {
    Tables: {
      parametres_eglise: {
        Row: {
          id: string;
          nom_eglise: string | null;
          reseau: string | null;
          adresse: string | null;
          telephone: string | null;
          email: string | null;
          logo_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nom_eglise?: string | null;
          reseau?: string | null;
          adresse?: string | null;
          telephone?: string | null;
          email?: string | null;
          logo_url?: string | null;
        };
        Update: {
          id?: string;
          nom_eglise?: string | null;
          reseau?: string | null;
          adresse?: string | null;
          telephone?: string | null;
          email?: string | null;
          logo_url?: string | null;
        };
        Relationships: [];
      };
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
          titre_fonction: string | null;
          statut: StatutAffectationEnum;
          date_affectation: string;
          date_changement_statut: string | null;
          date_fin_suspension: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ouvrier_id: string;
          departement_id: string;
          role?: RoleDepartementEnum;
          titre_fonction?: string | null;
          statut?: StatutAffectationEnum;
          date_affectation?: string;
          date_changement_statut?: string | null;
          date_fin_suspension?: string | null;
        };
        Update: {
          id?: string;
          ouvrier_id?: string;
          departement_id?: string;
          role?: RoleDepartementEnum;
          titre_fonction?: string | null;
          statut?: StatutAffectationEnum;
          date_affectation?: string;
          date_changement_statut?: string | null;
          date_fin_suspension?: string | null;
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
      listes_suivi: {
        Row: {
          id: string;
          departement_id: string;
          nom: string;
          description: string | null;
          ordre: number;
          inclure_rapport: boolean;
          cree_par: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          departement_id: string;
          nom: string;
          description?: string | null;
          ordre?: number;
          inclure_rapport?: boolean;
          cree_par?: string | null;
        };
        Update: {
          id?: string;
          departement_id?: string;
          nom?: string;
          description?: string | null;
          ordre?: number;
          inclure_rapport?: boolean;
          cree_par?: string | null;
        };
        Relationships: [];
      };
      points_suivi: {
        Row: {
          id: string;
          departement_id: string;
          liste_id: string;
          contenu: string;
          description: string | null;
          piece_jointe_path: string | null;
          piece_jointe_nom: string | null;
          statut: StatutPointSuiviEnum;
          date_debut: string | null;
          date_fin: string | null;
          date_creation: string;
          date_resolution: string | null;
          cree_par: string;
          resolu_par: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          departement_id: string;
          liste_id: string;
          contenu: string;
          description?: string | null;
          piece_jointe_path?: string | null;
          piece_jointe_nom?: string | null;
          statut?: StatutPointSuiviEnum;
          date_debut?: string | null;
          date_fin?: string | null;
          date_creation?: string;
          date_resolution?: string | null;
          cree_par: string;
          resolu_par?: string | null;
        };
        Update: {
          id?: string;
          departement_id?: string;
          liste_id?: string;
          contenu?: string;
          description?: string | null;
          piece_jointe_path?: string | null;
          piece_jointe_nom?: string | null;
          statut?: StatutPointSuiviEnum;
          date_debut?: string | null;
          date_fin?: string | null;
          date_creation?: string;
          date_resolution?: string | null;
          cree_par?: string;
          resolu_par?: string | null;
        };
        Relationships: [];
      };
      liste_suivi_membres: {
        Row: {
          id: string;
          liste_id: string;
          ouvrier_id: string;
          ajoute_par: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          liste_id: string;
          ouvrier_id: string;
          ajoute_par?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      point_suivi_membres: {
        Row: {
          id: string;
          point_id: string;
          ouvrier_id: string;
          ajoute_par: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          point_id: string;
          ouvrier_id: string;
          ajoute_par?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      commentaires_suivi: {
        Row: {
          id: string;
          point_suivi_id: string;
          departement_id: string;
          auteur_id: string;
          contenu: string;
          mentions: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          point_suivi_id: string;
          departement_id: string;
          auteur_id: string;
          contenu: string;
          mentions?: string[];
        };
        Update: {
          id?: string;
          point_suivi_id?: string;
          departement_id?: string;
          auteur_id?: string;
          contenu?: string;
          mentions?: string[];
        };
        Relationships: [];
      };
      rapports: {
        Row: {
          id: string;
          departement_id: string | null;
          periode_debut: string;
          periode_fin: string;
          difficultes: string | null;
          besoins: string | null;
          objectifs: string | null;
          suivi_snapshot: { nom: string; texte: string | null }[] | null;
          auteur_id: string;
          date_soumission: string;
        };
        Insert: {
          id?: string;
          departement_id?: string | null;
          periode_debut: string;
          periode_fin: string;
          difficultes?: string | null;
          besoins?: string | null;
          objectifs?: string | null;
          suivi_snapshot?: { nom: string; texte: string | null }[] | null;
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
          lien: string | null;
          lue: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destinataire_id: string;
          type: string;
          contenu: string;
          lien?: string | null;
          lue?: boolean;
        };
        Update: {
          id?: string;
          destinataire_id?: string;
          type?: string;
          contenu?: string;
          lien?: string | null;
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
          photo_url: string | null;
          role: RoleDepartementEnum;
          statut: StatutAffectationEnum;
          date_affectation: string;
          date_changement_statut: string | null;
          date_fin_suspension: string | null;
          titre_fonction: string | null;
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
      fn_solde_departement_a_date: {
        Args: { p_departement_id: string; p_date: string };
        Returns: number;
      };
      fn_personnes_taguables_suivi: {
        Args: { p_point_id: string };
        Returns: { id: string; prenom: string; nom: string }[];
      };
      rpc_changer_statut_point_suivi: {
        Args: { p_point_id: string; p_statut: StatutPointSuiviEnum };
        Returns: void;
      };
      rpc_assigner_role: {
        Args: {
          p_affectation_id: string;
          p_nouveau_role: RoleDepartementEnum;
        };
        Returns: void;
      };
      rpc_definir_titre_fonction: {
        Args: { p_affectation_id: string; p_titre: string };
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
      rpc_definir_photo_profil: {
        Args: { p_photo_url: string };
        Returns: void;
      };
      rpc_modifier_coordonnees_ouvrier: {
        Args: { p_telephone: string | null; p_adresse: string | null };
        Returns: void;
      };
    };
  };
}
