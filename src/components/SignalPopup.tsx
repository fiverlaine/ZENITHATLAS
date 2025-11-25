import React, { useState, useEffect } from 'react';
import { Signal } from '../types/trading';
import { ArrowUpCircle, ArrowDownCircle, X, Target, Zap, Clock } from 'lucide-react';

interface Props {
    isOpen: boolean;
    signal: Signal | null;
    onClose: () => void;
}

export const SignalPopup: React.FC<Props> = ({ isOpen, signal, onClose }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        if (!signal) return;

        const calculateTimeLeft = () => {
            const startTime = new Date(signal.time).getTime();
            const endTime = startTime + (signal.timeframe * 60 * 1000);
            const now = Date.now();
            const difference = endTime - now;

            if (difference <= 0) {
                return 'Finalizado';
            }

            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Atualiza imediatamente
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
            if (remaining === 'Finalizado') {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [signal]);

    if (!isOpen || !signal) return null;

    const isBuy = signal.type === 'buy';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="relative max-w-md w-full">
                {/* Background Glow */}
                <div className={`absolute inset-0 ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'} blur-[100px] rounded-full animate-pulse`} />

                <div className="relative bg-bg-card border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {/* Signal Icon */}
                    <div className="relative mb-6">
                        <div className={`absolute inset-0 ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-full animate-ping`} />
                        <div className={`relative ${isBuy ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'} p-4 rounded-full border`}>
                            {isBuy ? (
                                <ArrowUpCircle className="text-green-500" size={48} />
                            ) : (
                                <ArrowDownCircle className="text-red-500" size={48} />
                            )}
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">
                        Sinal Encontrado!
                    </h2>

                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-2xl font-bold text-primary">{signal.pair}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-xl text-gray-300">{signal.timeframe}M</span>
                    </div>

                    {/* Signal Details Card */}
                    <div className="w-full bg-white/5 rounded-xl p-6 border border-white/10 mb-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Ação</span>
                            <span className={`text-xl font-bold ${isBuy ? 'text-green-500' : 'text-red-500'}`}>
                                {isBuy ? 'COMPRA (CALL)' : 'VENDA (PUT)'}
                            </span>
                        </div>

                        <div className="h-px bg-white/5" />

                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 flex items-center gap-2">
                                <Target size={16} />
                                Preço de Entrada
                            </span>
                            <span className="text-white font-mono text-lg">
                                {signal.price.toFixed(5)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 flex items-center gap-2">
                                <Zap size={16} />
                                Assertividade
                            </span>
                            <span className="text-primary font-bold">
                                {signal.confidence}%
                            </span>
                        </div>

                        <div className="h-px bg-white/5" />

                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 flex items-center gap-2">
                                <Clock size={16} />
                                Tempo Restante
                            </span>
                            <span className="text-white font-mono text-lg animate-pulse">
                                {timeLeft}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-primary text-black font-bold text-lg hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(97,248,0,0.3)]"
                    >
                        Entendido, Realizar Entrada
                    </button>
                </div>
            </div>
        </div>
    );
};
