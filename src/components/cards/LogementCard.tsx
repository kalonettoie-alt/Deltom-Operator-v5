import { Building2, MapPin, Key, Edit2, Trash2 } from 'lucide-react';
import type { LogementWithClient } from '../../types';

interface LogementCardProps {
  logement: LogementWithClient;
  onEdit?: () => void;
  onDelete?: () => void;
  showClient?: boolean;
}

export function LogementCard({ logement, onEdit, onDelete, showClient = true }: LogementCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 rounded-xl">
            <Building2 className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{logement.name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <MapPin className="w-4 h-4" />
              <span>
                {logement.address}, {logement.postal_code} {logement.city}
              </span>
            </div>
            {showClient && logement.client && (
              <p className="text-sm text-gray-600 mt-2">
                Client: <span className="font-medium">{logement.client.full_name}</span>
              </p>
            )}
            {logement.access_code && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                <Key className="w-4 h-4" />
                <span>Code: {logement.access_code}</span>
              </div>
            )}
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {logement.instructions && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Instructions:</span> {logement.instructions}
          </p>
        </div>
      )}
    </div>
  );
}
