import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, X, ArrowLeft } from 'lucide-react';

export default function SuperAdminBanner() {
  const navigate = useNavigate();
  const { user, impersonatedMunicipality, clearImpersonation } = useAuth();
  if (user?.role !== 'superadmin' || !impersonatedMunicipality) return null;
  const townName = impersonatedMunicipality.town_name || impersonatedMunicipality.name || 'Town';

  function handleExit() {
    clearImpersonation();
    navigate('/superadmin');
  }

  return (
    <div className="flex-shrink-0 bg-purple-700 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm z-50">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">Super Admin View</span>
        <span className="opacity-70">·</span>
        <span>Viewing as admin of <strong>{townName}</strong></span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 transition-colors px-3 py-1 rounded-md text-xs font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Exit to Super Admin
      </button>
    </div>
  );
}