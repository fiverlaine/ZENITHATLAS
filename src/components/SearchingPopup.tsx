import React from 'react';
import { Loader2, Search, Zap } from 'lucide-react';

interface Props {
    isOpen: boolean;
    strategyName: string;
    onCancel: () => void;
}

export const SearchingPopup: React.FC<Props> = ({ isOpen, strategyName, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="relative max-w-md w-full">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />

                <div className="relative bg-bg-card border border-primary/20 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl">
                    {/* Animated Icon */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                        <div className="relative bg-primary/10 p-4 rounded-full border border-primary/50">
                            <Search className="text-primary animate-pulse" size={48} />
                        </div>
                        <div className="absolute -right-2 -top-2 bg-primary text-black text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                            AI
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                        Analisando Mercado
                    </h2>

                    <p className="text-gray-400 mb-6">
                        A Inteligência Artificial está buscando a melhor oportunidade usando a estratégia <span className="text-primary font-semibold">{strategyName}</span>...
                    </p>

                    {/* Steps Animation */}
                    <div className="w-full space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                            <Loader2 className="animate-spin text-primary" size={16} />
                            <span>Verificando indicadores técnicos...</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400 delay-75">
                            <Loader2 className="animate-spin text-primary" size={16} />
                            <span>Calculando probabilidades...</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400 delay-150">
                            <Loader2 className="animate-spin text-primary" size={16} />
                            <span>Validando tendências...</span>
                        </div>
                    </div>

                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                    >
                        Cancelar Busca
                    </button>
                </div>
            </div>
        </div>
    );
};
