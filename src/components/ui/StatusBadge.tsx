import { InterventionStatusLabels } from '../../types';
import type { InterventionStatus } from '../../types';

// Styles modernises pour les badges
const statusStyles: Record<InterventionStatus, string> = {
  a_attribuer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  assignee: 'bg-purple-100 text-purple-800 border-purple-200',
  acceptee: 'bg-blue-100 text-blue-800 border-blue-200',
  en_cours: 'bg-orange-100 text-orange-800 border-orange-200',
  terminee: 'bg-green-100 text-green-800 border-green-200',
  annulee: 'bg-red-100 text-red-800 border-red-200',
};

interface StatusBadgeProps {
  status: InterventionStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const label = InterventionStatusLabels[status];
  const colorClass = statusStyles[status] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${colorClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
