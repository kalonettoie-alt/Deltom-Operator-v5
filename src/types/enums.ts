// Rôles utilisateur
export type UserRole = 'admin' | 'client' | 'prestataire';

// Statuts d'intervention
// Flux: a_attribuer → assignee → acceptee → en_cours → terminee
//       assignee → refusee (retour à a_attribuer)
export type InterventionStatus = 'a_attribuer' | 'assignee' | 'acceptee' | 'refusee' | 'en_cours' | 'terminee';

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
  assignee: 'Assignée',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
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
  assignee: 'bg-orange-100 text-orange-800',
  acceptee: 'bg-blue-100 text-blue-800',
  refusee: 'bg-red-100 text-red-800',
  en_cours: 'bg-purple-100 text-purple-800',
  terminee: 'bg-green-100 text-green-800',
};

// Labels simplifiés pour les clients (ils ne voient pas tous les statuts)
export const ClientStatusLabels: Record<string, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  terminee: 'Terminée',
};

// Mapping des statuts pour l'affichage client
export function getClientStatus(status: InterventionStatus): 'a_venir' | 'en_cours' | 'terminee' {
  switch (status) {
    case 'a_attribuer':
    case 'assignee':
    case 'acceptee':
    case 'refusee':
      return 'a_venir';
    case 'en_cours':
      return 'en_cours';
    case 'terminee':
      return 'terminee';
  }
}
