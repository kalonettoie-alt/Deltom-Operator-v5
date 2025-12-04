import { InterventionStatusLabels, InterventionStatusColors } from '../../types';
import type { InterventionStatus } from '../../types';

interface StatusBadgeProps {
  status: InterventionStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const label = InterventionStatusLabels[status];
  const colorClass = InterventionStatusColors[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
