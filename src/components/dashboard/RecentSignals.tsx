import React from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Signal } from '../../types/trading';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  signals: Signal[];
  maxItems?: number;
}

export const RecentSignals: React.FC<Props> = ({ signals, maxItems = 10 }) => {
  const recentSignals = signals
    .filter(s => s && s.result && s.id && s.pair && s.type) // Apenas sinais válidos e finalizados
    .slice(0, maxItems);

  if (recentSignals.length === 0) {
    return (
      <Card className="bg-gray-900/30 border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Histórico Recente</h2>
        <div className="text-center py-8">
          <Clock className="text-gray-600 mx-auto mb-3" size={32} />
          <p className="text-gray-500">Nenhuma operação finalizada ainda</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/30 border-gray-800">
      <h2 className="text-xl font-bold text-white mb-4">Histórico Recente</h2>

      <div className="space-y-3">
        {recentSignals.map((signal) => {
          const isBuy = signal.type === 'buy';
          const isWin = signal.result === 'win';
          const SignalIcon = isBuy ? TrendingUp : TrendingDown;
          const ResultIcon = isWin ? CheckCircle : XCircle;

          return (
            <div
              key={signal.id}
              className={`p-4 rounded-lg border-2 transition-all hover:scale-[1.02] ${isWin
                  ? 'bg-green-500/5 border-green-500/30'
                  : 'bg-red-500/5 border-red-500/30'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                    <SignalIcon
                      className={isBuy ? 'text-green-500' : 'text-red-500'}
                      size={20}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {signal.pair}
                      </span>
                      <span className={`text-sm px-2 py-0.5 rounded ${isBuy
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                        }`}>
                        {isBuy ? 'COMPRA' : 'VENDA'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      ${(signal.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {signal.timeframe || 1}min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {signal.profit_loss !== undefined && signal.profit_loss !== null && (
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isWin ? 'text-green-500' : 'text-red-500'
                        }`}>
                        {isWin ? 'WIN' : 'LOSS'}
                      </p>
                    </div>
                  )}

                  <ResultIcon
                    className={isWin ? 'text-green-500' : 'text-red-500'}
                    size={24}
                  />
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-800/50">
                <p className="text-xs text-gray-500">
                  {signal.time ? format(new Date(signal.time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data não disponível'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

