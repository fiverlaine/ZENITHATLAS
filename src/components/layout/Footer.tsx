import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900/50 backdrop-blur-sm border-t border-gray-800 py-4 pb-20 sm:pb-4 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center text-sm text-gray-400 mb-2">
          <AlertTriangle size={16} className="mr-2" />
          <p>Trading envolve alto risco. Opere com responsabilidade.</p>
        </div>
        <div className="text-center text-xs text-gray-500">
          <p>© 2024 ZENITHATLAS. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
