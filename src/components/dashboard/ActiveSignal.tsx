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

        const endTime = new Date(signalTime.getTime() + signal.timeframe * 60000);
        const now = new Date();
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
  const signalBorderClass = isBuy ? 'border-primary' : 'border-red-500';
  const SignalIcon = isBuy ? TrendingUp : TrendingDown;

  const profitLoss = currentPrice && signal.price
    ? ((currentPrice - signal.price) / signal.price * 100) * (isBuy ? 1 : -1)
    : 0;

  return (
    <Card className={`${isBuy ? 'bg-primary/5 border-primary/30' : 'bg-red-500/5 border-red-500/30'} border-2`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`${isBuy ? 'bg-primary/20' : 'bg-red-500/20'} p-2 rounded-lg`}>
              <SignalIcon className={signalColorClass} size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                Operação {isBuy ? 'COMPRA' : 'VENDA'}
              </h3>
              <p className="text-gray-400 text-sm">{signal.pair}</p>
            </div>
          </div>
        </div>
        <div className={`${signalBgClass} text-black px-3 py-1 rounded-full text-sm font-bold shadow-[0_0_10px_rgba(0,0,0,0.3)]`}>
          ATIVO
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-bg-card p-4 rounded-lg border border-white/5">
          <div className="flex items-center text-gray-400 text-sm mb-1">
            <DollarSign size={14} className="mr-1" />
            Entrada
          </div>
          <p className="text-lg font-bold text-white">
            ${(signal.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {currentPrice && (
          <div className="bg-bg-card p-4 rounded-lg border border-white/5">
            <div className="flex items-center text-gray-400 text-sm mb-1">
              <DollarSign size={14} className="mr-1" />
              Atual
            </div>
            <p className="text-lg font-bold text-white">
              ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}

        <div className="bg-bg-card p-4 rounded-lg border border-white/5">
          <div className="flex items-center text-gray-400 text-sm mb-1">
            <Zap size={14} className="mr-1" />
            Confiança
          </div>
          <p className="text-lg font-bold text-white">{signal.confidence || 0}%</p>
        </div>

        <div className="bg-bg-card p-4 rounded-lg border border-white/5">
          <div className="flex items-center text-gray-400 text-sm mb-1">
            <Clock size={14} className="mr-1" />
            Tempo Restante
          </div>
          <p className="text-lg font-bold text-white">{timeRemaining}</p>
        </div>
      </div>

      {currentPrice && profitLoss !== 0 && (
        <div className={`p-4 rounded-lg ${profitLoss > 0 ? 'bg-primary/10 border border-primary/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Lucro/Prejuízo Atual</span>
            <span className={`text-xl font-bold ${profitLoss > 0 ? 'text-primary' : 'text-red-500'}`}>
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

