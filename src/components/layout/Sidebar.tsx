import React from 'react';
import { Home, BarChart3, History, LogOut, Cpu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Props {
    currentView: 'home' | 'analytics' | 'history';
    onViewChange: (view: 'home' | 'analytics' | 'history') => void;
}

export const Sidebar: React.FC<Props> = ({ currentView, onViewChange }) => {
    const { signOut } = useAuth();

    const navItems = [
        { id: 'home' as const, label: 'Início', icon: Home },
        { id: 'analytics' as const, label: 'Relatório', icon: BarChart3 },
        { id: 'history' as const, label: 'Histórico', icon: History },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-bg-sidebar/95 backdrop-blur-xl border-r border-white/5 z-50">
            {/* Logo Area - Removed to avoid duplication */}
            <div className="p-6 border-b border-white/5 flex justify-center items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                    <Cpu className="text-primary" size={32} />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon
                                size={20}
                                className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'
                                    }`}
                            />
                            <span className="font-medium">{item.label}</span>

                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(97,248,0,0.8)]" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
};
