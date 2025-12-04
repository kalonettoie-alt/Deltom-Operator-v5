// Rôles utilisateur
export type UserRole = 'admin' | 'client' | 'prestataire';

// Statuts d'intervention
export type InterventionStatus = 'a_attribuer' | 'acceptee' | 'en_cours' | 'terminee';

// Types d'intervention
export type InterventionType = 'standard' | 'intendance';

// Labels pour l'affichage
export const UserRoleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  client: 'Client',
  prestataire: 'Prestataire',
};

export const InterventionStatusLabels: Record<InterventionStatus, string> = {
  a_attribuer: 'À attribuer',
  acceptee: 'Acceptée',
  en_cours: 'En cours',
  terminee: 'Terminée',
};

export const InterventionTypeLabels: Record<InterventionType, string> = {
  standard: 'Standard',
  intendance: 'Intendance',
};

// Couleurs pour les badges de statut
export const InterventionStatusColors: Record<InterventionStatus, string> = {
  a_attribuer: 'bg-yellow-100 text-yellow-800',
  acceptee: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-purple-100 text-purple-800',
  terminee: 'bg-green-100 text-green-800',
};
