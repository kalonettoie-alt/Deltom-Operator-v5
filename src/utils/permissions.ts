import type { UserRole } from '../types';

/**
 * Indique si un rôle est autorisé à voir les chiffres financiers
 * (marge, gain total, prix prestataire, prix client, blanchisserie).
 *
 * Le rôle 'support' a un accès opérationnel complet aux pages admin
 * mais ne doit voir AUCUN montant financier.
 */
export function canSeeFinancials(role: UserRole | undefined | null): boolean {
  return role === 'admin';
}
