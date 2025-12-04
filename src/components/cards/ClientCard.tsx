import { Mail, Phone, Building2 } from 'lucide-react';
import type { Profile } from '../../types';

interface ClientCardProps {
  client: Profile;
  logementsCount?: number;
  onClick?: () => void;
}

export function ClientCard({ client, logementsCount = 0, onClick }: ClientCardProps) {
  return (
    <div
      className={`card hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-green-700 font-semibold text-lg">
            {client.full_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{client.full_name}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <Mail className="w-4 h-4" />
            <span className="truncate">{client.email}</span>
          </div>
          {client.phone && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Phone className="w-4 h-4" />
              <span>{client.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
            <Building2 className="w-4 h-4" />
            <span>{logementsCount} logement(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
