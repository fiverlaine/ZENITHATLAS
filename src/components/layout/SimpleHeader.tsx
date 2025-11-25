import React from 'react';
import { Cpu, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

interface Props {
  onShowLearn: () => void;
}

export const SimpleHeader: React.FC<Props> = ({ onShowLearn }) => {
  const { session, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-bg-sidebar/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 md:ml-64 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Cpu className="text-primary" size={24} />
            </div>
            <div className="ml-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                ZENITH<span className="text-primary">ATLAS</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-400">
                Sistema Inteligente de Trading
              </p>
            </div>
          </div>

          {/* Ações */}
          {session && (
            <div className="flex items-center gap-2">
              <Button
                onClick={onShowLearn}
                variant="secondary"
                icon={<BookOpen size={16} />}
                className="hidden sm:flex hover:border-primary/50 hover:text-primary transition-colors"
              >
                Guia
              </Button>

              <Button
                onClick={onShowLearn}
                variant="secondary"
                icon={<BookOpen size={16} />}
                className="sm:hidden !p-2 hover:border-primary/50 hover:text-primary transition-colors"
              >
                <span className="sr-only">Guia</span>
              </Button>

              <Button
                onClick={handleSignOut}
                variant="secondary"
                icon={<LogOut size={16} />}
                className="hidden sm:flex hover:border-red-500/50 hover:text-red-500 transition-colors"
              >
                Sair
              </Button>

              <Button
                onClick={handleSignOut}
                variant="secondary"
                icon={<LogOut size={16} />}
                className="sm:hidden !p-2 hover:border-red-500/50 hover:text-red-500 transition-colors"
              >
                <span className="sr-only">Sair</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

