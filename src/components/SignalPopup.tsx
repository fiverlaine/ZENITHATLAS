import React, { useState, useEffect } from 'react';
import { Signal } from '../types/trading';
import { ArrowUpCircle, ArrowDownCircle, X, Target, Clock, Loader2, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface Props {
    isOpen: boolean;
    signal: Signal | null;
    currentPrice?: number;
    onClose: () => void;
    strategyId?: string;
}

// Informações técnicas por estratégia
const STRATEGY_INFO: Record<string, { name: string; indicators: string[] }> = {
    'protocolo_v4': {
        name: 'Protocolo V4',
        indicators: ['Bollinger Bands', 'RSI', 'StochRSI', 'EMA 200']
    },
    'momentum_alpha': {
        name: 'Momentum Alpha',
        indicators: ['MACD', 'RSI', 'ADX', 'Histograma']
    },
    'trend_surfer': {
        name: 'Trend Surfer',
        indicators: ['EMA 9/21', 'EMA 200', 'ADX']
    },
    'cci_reversal': {
        name: 'CCI Reversal',
        indicators: ['CCI', 'Oversold/Overbought']
    },
    'williams_r': {
        name: 'Williams %R',
        indicators: ['Williams %R', 'Reversal']
    },
    'mfi_reversal': {
        name: 'MFI Reversal',
        indicators: ['MFI', 'Money Flow']
    }
};

export const SignalPopup: React.FC<Props> = ({ isOpen, signal, currentPrice, onClose, strategyId }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [status, setStatus] = useState<'waiting' | 'active' | 'finished' | 'loading'>('waiting');
    const [finalResult, setFinalResult] = useState<'WIN' | 'LOSS' | null>(null);

    // Calcula horário de saída
    const getExitTime = () => {
        if (!signal) return '';
        const startTime = new Date(signal.time).getTime();
        const exitTime = new Date(startTime + (signal.timeframe * 60 * 1000));
        return exitTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        if (!signal) return;

        // Se o sinal já tem resultado no banco, mostra direto
        if (signal.result) {
            setFinalResult(signal.result === 'win' ? 'WIN' : 'LOSS');
            setStatus('finished');
            setTimeLeft('Finalizado');
            return;
        }

        const calculateTimeLeft = () => {
            const startTime = new Date(signal.time).getTime();
            const now = Date.now();

            if (now < startTime) {
                setStatus('waiting');
                const diffStart = startTime - now;
                const minutes = Math.floor(diffStart / 60000);
                const seconds = Math.floor((diffStart % 60000) / 1000);
                return `Inicia em ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            const endTime = startTime + (signal.timeframe * 60 * 1000);
            const difference = endTime - now;

            if (difference <= 0) {
                // Quando tempo acabar, entra em modo loading e aguarda resultado da API
                if (status !== 'loading' && status !== 'finished') {
                    setStatus('loading');
                }
                return 'Calculando resultado...';
            }

            setStatus('active');
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Atualiza imediatamente
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            // Verifica se o sinal tem resultado no banco
            if (signal.result) {
                setFinalResult(signal.result === 'win' ? 'WIN' : 'LOSS');
                setStatus('finished');
                setTimeLeft('Finalizado');
                clearInterval(timer);
                return;
            }

            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
        }, 1000);

        return () => clearInterval(timer);
    }, [signal, status]);

    // Efeito para verificar resultado quando entrar em loading
    useEffect(() => {
        if (status !== 'loading' || !signal) return;

        // Aguarda o resultado vir do banco (via update do signal prop)
        const checkResult = () => {
            if (signal.result) {
                setFinalResult(signal.result === 'win' ? 'WIN' : 'LOSS');
                setStatus('finished');
            }
        };

        // Verifica imediatamente
        checkResult();

        // Continua verificando caso o resultado chegue via prop
        const interval = setInterval(checkResult, 500);

        return () => clearInterval(interval);
    }, [status, signal]);

    if (!isOpen || !signal) return null;

    const isBuy = signal.type === 'buy';
    const isWin = finalResult === 'WIN';
    const strategyInfo = strategyId ? STRATEGY_INFO[strategyId] : null;

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start justify-center p-4 pt-6 overflow-y-auto animate-fade-in">
            <div className="relative max-w-md w-full my-auto">
                {/* Background Glow */}
                <div className={`absolute inset-0 ${status === 'waiting' ? 'bg-yellow-500/20' :
                    status === 'loading' ? 'bg-blue-500/20' :
                        finalResult === 'WIN' ? 'bg-green-500/20' :
                            finalResult === 'LOSS' ? 'bg-red-500/20' :
                                isBuy ? 'bg-green-500/20' : 'bg-red-500/20'
                    } blur-[100px] rounded-full animate-pulse transition-colors duration-500`} />

                <div className="relative bg-bg-card border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center shadow-2xl">
                    {/* Close button always visible */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors z-10"
                    >
                        <X size={24} />
                    </button>

                    {/* Estado: Loading (calculando resultado) */}
                    {status === 'loading' && (
                        <>
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse" />
                                <div className="relative bg-blue-500/10 border-blue-500/50 p-6 rounded-full border">
                                    <Loader2 className="text-blue-500 animate-spin" size={64} />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">
                                Calculando Resultado
                            </h2>

                            <p className="text-gray-400 mb-6 text-sm">
                                Aguardando confirmação da corretora...
                            </p>

                            <div className="w-full bg-white/5 rounded-xl p-4 border border-white/10 mb-4">
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin text-blue-500" size={16} />
                                    <span className="text-gray-400 text-sm">Verificando preços...</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Estado: Finalizado (WIN ou LOSS) */}
                    {status === 'finished' && finalResult && (
                        <>
                            <div className="relative mb-6">
                                <div className={`absolute inset-0 ${isWin ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-full animate-pulse`} />
                                <div className={`relative ${isWin ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'} p-6 rounded-full border`}>
                                    {isWin ? (
                                        <ArrowUpCircle className="text-green-500" size={64} />
                                    ) : (
                                        <ArrowDownCircle className="text-red-500" size={64} />
                                    )}
                                </div>
                            </div>

                            <h2 className={`text-5xl font-black mb-2 ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                                {finalResult}
                            </h2>

                            <p className="text-gray-400 mb-6 text-sm">
                                Operação Finalizada
                            </p>

                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl font-bold text-lg bg-primary text-black hover:bg-primary/90 transition-all hover:scale-[1.02]"
                            >
                                Fechar
                            </button>
                        </>
                    )}

                    {/* Estado: Waiting ou Active */}
                    {(status === 'waiting' || status === 'active') && (
                        <>
                            {/* Signal Icon */}
                            <div className="relative mb-3">
                                <div className={`absolute inset-0 ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-full animate-ping`} />
                                <div className={`relative ${isBuy ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'} p-3 rounded-full border`}>
                                    {isBuy ? (
                                        <ArrowUpCircle className="text-green-500" size={32} />
                                    ) : (
                                        <ArrowDownCircle className="text-red-500" size={32} />
                                    )}
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-white mb-2">
                                Sinal Encontrado!
                            </h2>

                            {/* Aviso de Status */}
                            <div className={`
                                ${status === 'waiting' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                                    'bg-blue-500/10 border-blue-500/30 text-blue-500'}
                                border px-3 py-1.5 rounded-lg mb-3 font-bold animate-pulse flex items-center gap-2 text-sm
                            `}>
                                <Clock size={14} />
                                {status === 'waiting' ? 'AGUARDANDO ENTRADA' : 'OPERAÇÃO EM ANDAMENTO'}
                            </div>

                            <div className="flex items-center gap-2 mb-3 min-w-0 w-full justify-center">
                                <span className="text-base md:text-lg font-bold text-primary truncate">{signal.pair}</span>
                                <span className="text-gray-400 flex-shrink-0">•</span>
                                <span className="text-sm md:text-base text-gray-300 flex-shrink-0">{signal.timeframe}M</span>
                            </div>

                            {/* Signal Details Card */}
                            <div className="w-full bg-white/5 rounded-xl p-3 border border-white/10 mb-3 space-y-2 min-w-0">
                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-gray-400 text-xs truncate">Ação</span>
                                    <span className={`text-xs md:text-sm font-bold flex-shrink-0 ${isBuy ? 'text-green-500' : 'text-red-500'}`}>
                                        {isBuy ? 'COMPRA (CALL)' : 'VENDA (PUT)'}
                                    </span>
                                </div>

                                <div className="h-px bg-white/5" />

                                {/* Horários de Entrada e Saída */}
                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-gray-400 flex items-center gap-1 text-xs truncate min-w-0">
                                        <Clock size={12} className="flex-shrink-0" />
                                        <span className="truncate">Horário Entrada</span>
                                    </span>
                                    <span className="text-white font-mono text-xs md:text-sm flex-shrink-0">
                                        {new Date(signal.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-gray-400 flex items-center gap-1 text-xs truncate min-w-0">
                                        <Clock size={12} className="flex-shrink-0" />
                                        <span className="truncate">Horário Saída</span>
                                    </span>
                                    <span className="text-white font-mono text-xs md:text-sm flex-shrink-0">
                                        {getExitTime()}
                                    </span>
                                </div>

                                <div className="h-px bg-white/5" />

                                {/* Preço de Entrada - só mostra quando active */}
                                {status === 'active' && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-gray-400 flex items-center gap-1 text-xs truncate min-w-0">
                                            <Target size={12} className="flex-shrink-0" />
                                            <span className="truncate">Preço de Entrada</span>
                                        </span>
                                        <span className="text-white font-mono text-[10px] md:text-xs font-bold break-words">
                                            {signal.price.toFixed(5)}
                                        </span>
                                    </div>
                                )}

                                {/* Preço Atual - só mostra quando active */}
                                {status === 'active' && currentPrice && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-gray-400 flex items-center gap-1 text-xs truncate min-w-0">
                                            <Activity size={12} className="flex-shrink-0" />
                                            <span className="truncate">Preço Atual</span>
                                        </span>
                                        <span className={`font-mono text-[10px] md:text-xs font-bold break-words ${isBuy
                                            ? (currentPrice > signal.price ? 'text-green-500' : 'text-red-500')
                                            : (currentPrice < signal.price ? 'text-green-500' : 'text-red-500')
                                            }`}>
                                            {currentPrice.toFixed(5)}
                                        </span>
                                    </div>
                                )}

                                <div className="h-px bg-white/5" />

                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-gray-400 flex items-center gap-1 text-xs truncate min-w-0">
                                        <Clock size={12} className="flex-shrink-0" />
                                        <span className="truncate">Tempo Restante</span>
                                    </span>
                                    <span className="text-white font-mono text-xs md:text-sm animate-pulse flex-shrink-0 break-words">
                                        {timeLeft}
                                    </span>
                                </div>
                            </div>

                            {/* Informações Técnicas da Estratégia */}
                            {strategyInfo && (
                                <div className="w-full bg-white/5 rounded-xl p-3 border border-white/10 mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={14} className="text-primary" />
                                        <span className="text-xs font-bold text-gray-300">Análise Técnica</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {strategyInfo.indicators.map((indicator, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-0.5 bg-primary/10 border border-primary/30 rounded text-xs text-primary"
                                            >
                                                {indicator}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2">
                                        Estratégia: {strategyInfo.name}
                                    </p>
                                </div>
                            )}

                            {/* Botão Fechar */}
                            <button
                                onClick={onClose}
                                className="w-full py-2 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] bg-primary text-black hover:bg-primary/90"
                            >
                                Fechar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
