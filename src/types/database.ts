import type { UserRole, InterventionStatus, InterventionType } from './enums';

// Type pour la base de données Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      logements: {
        Row: Logement;
        Insert: LogementInsert;
        Update: LogementUpdate;
      };
      interventions: {
        Row: Intervention;
        Insert: InterventionInsert;
        Update: InterventionUpdate;
      };
      rapports: {
        Row: Rapport;
        Insert: RapportInsert;
        Update: RapportUpdate;
      };
    };
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

// ============================================
// Profile
// ============================================
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  company_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  company_name?: string | null;
  avatar_url?: string | null;
}

export interface ProfileUpdate {
  email?: string;
  full_name?: string;
  role?: UserRole;
  phone?: string | null;
  company_name?: string | null;
  avatar_url?: string | null;
}

// ============================================
// Logement
// ============================================
export interface Logement {
  id: string;
  client_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  access_code: string | null;
  instructions: string | null;
  photos: string[];
  prix_prestataire_ht: number | null;
  prix_client_ttc: number | null;
  created_at: string;
  updated_at: string;
}

export interface LogementInsert {
  client_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  access_code?: string | null;
  instructions?: string | null;
  photos?: string[];
  prix_prestataire_ht?: number | null;
  prix_client_ttc?: number | null;
}

export interface LogementUpdate {
  client_id?: string;
  name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  access_code?: string | null;
  instructions?: string | null;
  photos?: string[];
  prix_prestataire_ht?: number | null;
  prix_client_ttc?: number | null;
}

// Logement avec le profil du client (pour les jointures)
export interface LogementWithClient extends Logement {
  client: Profile;
}

// ============================================
// Intervention
// ============================================
export interface Intervention {
  id: string;
  logement_id: string;
  client_id: string;
  prestataire_id: string | null;
  date: string;
  type: InterventionType;
  status: InterventionStatus;
  nb_voyageurs: number;
  has_baby: boolean;
  special_instructions: string | null;
  prix_prestataire_ht: number;
  prix_client_ttc: number;
  started_at: string | null;
  completed_at: string | null;
  refused_by: string[];
  created_at: string;
  updated_at: string;
}

export interface InterventionInsert {
  logement_id: string;
  client_id: string;
  prestataire_id?: string | null;
  date: string;
  type?: InterventionType;
  status?: InterventionStatus;
  nb_voyageurs?: number;
  has_baby?: boolean;
  special_instructions?: string | null;
  prix_prestataire_ht?: number;
  prix_client_ttc?: number;
  refused_by?: string[];
}

export interface InterventionUpdate {
  logement_id?: string;
  client_id?: string;
  prestataire_id?: string | null;
  date?: string;
  type?: InterventionType;
  status?: InterventionStatus;
  nb_voyageurs?: number;
  has_baby?: boolean;
  special_instructions?: string | null;
  prix_prestataire_ht?: number;
  prix_client_ttc?: number;
  started_at?: string | null;
  completed_at?: string | null;
  refused_by?: string[];
}

// Intervention avec les relations (pour les jointures)
export interface InterventionWithRelations extends Intervention {
  logement: Logement;
  client: Profile;
  prestataire: Profile | null;
  rapport?: Rapport | null;
}

// ============================================
// Rapport
// ============================================
export interface Rapport {
  id: string;
  intervention_id: string;
  photos_intervention: string[];
  degats_signales: boolean;
  degats_description: string | null;
  degats_photos: string[];
  created_at: string;
}

export interface RapportInsert {
  intervention_id: string;
  photos_intervention?: string[];
  degats_signales?: boolean;
  degats_description?: string | null;
  degats_photos?: string[];
}

export interface RapportUpdate {
  photos_intervention?: string[];
  degats_signales?: boolean;
  degats_description?: string | null;
  degats_photos?: string[];
}
