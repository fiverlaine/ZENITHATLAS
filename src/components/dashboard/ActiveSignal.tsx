import React, { useEffect, useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Zap, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { Signal } from '../../types/trading';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  signal: Signal | null;
  currentPrice?: number;
}

export const ActiveSignal: React.FC<Props> = ({ signal, currentPrice }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!signal) return;

    const interval = setInterval(() => {
      try {
        const signalTime = new Date(signal.time);

        // Verificar se a data é válida
        if (isNaN(signalTime.getTime())) {
          setTimeRemaining('Data inválida');
          return;
        }

        const now = new Date();

        if (now < signalTime) {
          const diffStart = signalTime.getTime() - now.getTime();
          const minutes = Math.floor(diffStart / 60000);
          const seconds = Math.floor((diffStart % 60000) / 1000);
          setTimeRemaining(`Inicia em ${minutes}:${seconds.toString().padStart(2, '0')}`);
          return;
        }

        const endTime = new Date(signalTime.getTime() + signal.timeframe * 60000);
        const diff = endTime.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining('Finalizando...');
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      } catch (error) {
        console.error('Erro ao calcular tempo restante:', error);
        setTimeRemaining('Erro');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [signal]);

  if (!signal) {
    return (
      <Card className="bg-bg-card/50 border-white/5">
        <div className="text-center py-12">
          <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="text-gray-600" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-400 mb-2">Nenhuma Operação Ativa</h3>
          <p className="text-gray-500">Inicie o sistema para começar a operar</p>
        </div>
      </Card>
    );
  }

  const isBuy = signal.type === 'buy';
  // Use primary for buy/green, red for sell/red
  const signalColorClass = isBuy ? 'text-primary' : 'text-red-500';
  const signalBgClass = isBuy ? 'bg-primary' : 'bg-red-500';
  const SignalIcon = isBuy ? TrendingUp : TrendingDown;

  const profitLoss = currentPrice && signal.price
    ? ((currentPrice - signal.price) / signal.price * 100) * (isBuy ? 1 : -1)
    : 0;

  return (
    <Card className={`${isBuy ? 'bg-primary/5 border-primary/30' : 'bg-red-500/5 border-red-500/30'} border-2`}>
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`${isBuy ? 'bg-primary/20' : 'bg-red-500/20'} p-2 rounded-lg flex-shrink-0`}>
              <SignalIcon className={signalColorClass} size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg md:text-xl font-bold text-white truncate">
                Operação {isBuy ? 'COMPRA' : 'VENDA'}
              </h3>
              <p className="text-gray-400 text-xs md:text-sm truncate">{signal.pair}</p>
            </div>
          </div>
        </div>
        <div className={`${signalBgClass} text-black px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold shadow-[0_0_10px_rgba(0,0,0,0.3)] flex-shrink-0`}>
          ATIVO
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-bg-card p-3 rounded-lg border border-white/5 min-w-0">
          <div className="flex items-center text-gray-400 text-xs mb-1 truncate">
            <DollarSign size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate">Entrada</span>
          </div>
          <p className="text-sm md:text-base font-bold text-white break-words">
            ${(signal.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {currentPrice && (
          <div className="bg-bg-card p-3 rounded-lg border border-white/5 min-w-0">
            <div className="flex items-center text-gray-400 text-xs mb-1 truncate">
              <DollarSign size={12} className="mr-1 flex-shrink-0" />
              <span className="truncate">Atual</span>
            </div>
            <p className="text-sm md:text-base font-bold text-white break-words">
              ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}

        <div className="bg-bg-card p-3 rounded-lg border border-white/5 min-w-0">
          <div className="flex items-center text-gray-400 text-xs mb-1 truncate">
            <Zap size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate">Confiança</span>
          </div>
          <p className="text-sm md:text-base font-bold text-white break-words">{signal.confidence || 0}%</p>
        </div>

        <div className="bg-bg-card p-3 rounded-lg border border-white/5 min-w-0">
          <div className="flex items-center text-gray-400 text-xs mb-1 truncate">
            <Clock size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate">Tempo</span>
          </div>
          <p className="text-xs md:text-sm font-bold text-white break-words">{timeRemaining}</p>
        </div>
      </div>

      {currentPrice && profitLoss !== 0 && (
        <div className={`p-3 md:p-4 rounded-lg ${profitLoss > 0 ? 'bg-primary/10 border border-primary/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-400 text-sm md:text-base truncate">Lucro/Prejuízo Atual</span>
            <span className={`text-lg md:text-xl font-bold flex-shrink-0 ${profitLoss > 0 ? 'text-primary' : 'text-red-500'}`}>
              {profitLoss > 0 ? '+' : ''}{profitLoss.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-gray-500">
          Iniciado em {(() => {
            try {
              const signalDate = new Date(signal.time);
              if (isNaN(signalDate.getTime())) {
                return 'Data inválida';
              }
              return format(signalDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            } catch (error) {
              console.error('Erro ao formatar data:', error);
              return 'Data inválida';
            }
          })()}
        </p>
      </div>
    </Card>
  );
};

