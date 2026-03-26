import { AlertTriangle } from 'lucide-react';

export default function AccessibleFormError({ id, message }) {
  if (!message) return null;
  return (
    <div 
      id={id} 
      role="alert" 
      className="flex items-start gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}