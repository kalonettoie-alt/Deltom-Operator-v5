import { Mail, Phone, Briefcase } from 'lucide-react';
import type { Profile } from '../../types';

interface PrestataireCardProps {
  prestataire: Profile;
  missionsCount?: number;
  onClick?: () => void;
}

export function PrestataireCard({ prestataire, missionsCount = 0, onClick }: PrestataireCardProps) {
  return (
    <div
      className={`card hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-purple-700 font-semibold text-lg">
            {prestataire.full_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{prestataire.full_name}</h3>
          {prestataire.company_name && (
            <p className="text-sm text-gray-600">{prestataire.company_name}</p>
          )}
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <Mail className="w-4 h-4" />
            <span className="truncate">{prestataire.email}</span>
          </div>
          {prestataire.phone && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Phone className="w-4 h-4" />
              <span>{prestataire.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
            <Briefcase className="w-4 h-4" />
            <span>{missionsCount} mission(s) assignée(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
