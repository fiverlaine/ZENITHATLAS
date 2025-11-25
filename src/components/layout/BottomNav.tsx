import React from 'react';
import { Home, BarChart3, History } from 'lucide-react';

interface Props {
  currentView: 'home' | 'analytics' | 'history';
  onViewChange: (view: 'home' | 'analytics' | 'history') => void;
}

export const BottomNav: React.FC<Props> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'home' as const, label: 'Início', icon: Home },
    { id: 'analytics' as const, label: 'Relatório', icon: BarChart3 },
    { id: 'history' as const, label: 'Histórico', icon: History },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-sidebar/95 backdrop-blur-xl border-t border-white/5 z-50 pb-safe">
      <div className="flex items-center justify-around h-20 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all duration-300 ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              <div className={`relative p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10' : 'bg-transparent'
                }`}>
                <Icon
                  size={24}
                  className={`transition-all duration-300 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'
                    }`}
                />
              </div>

              <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'
                }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

