import React from 'react';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { Card } from '../ui/Card';

interface Props {
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  isActive: boolean;
}

export const SimpleStats: React.FC<Props> = ({
  totalSignals,
  wins,
  losses,
  winRate,
  isActive
}) => {
  const getWinRateColor = (rate: number) => {
    if (rate >= 70) return 'text-primary';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getWinRateBgColor = (rate: number) => {
    if (rate >= 70) return 'bg-primary/10 border-primary/30';
    if (rate >= 50) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Taxa de Acerto */}
      <Card className={`${getWinRateBgColor(winRate)} border-2 min-w-0 overflow-hidden`}>
        <div className="flex items-start justify-between mb-2">
          <div className="bg-bg-card/50 p-1.5 md:p-2 rounded-lg flex-shrink-0">
            <Target className={getWinRateColor(winRate)} size={16} />
          </div>
          {isActive && (
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(97,248,0,0.5)] flex-shrink-0" />
          )}
        </div>
        <p className="text-gray-400 text-xs md:text-sm mb-1 truncate">Taxa de Acerto</p>
        <p className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${getWinRateColor(winRate)} break-words`}>
          {totalSignals > 0 ? winRate.toFixed(1) : '0.0'}%
        </p>
      </Card>

      {/* Total de Operações */}
      <Card className="bg-bg-card/50 border-white/5 min-w-0 overflow-hidden">
        <div className="bg-white/10 p-1.5 md:p-2 rounded-lg w-fit mb-2">
          <Activity className="text-white" size={16} />
        </div>
        <p className="text-gray-400 text-xs md:text-sm mb-1 truncate">Total Operações</p>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white break-words">{totalSignals}</p>
      </Card>

      {/* Vitórias */}
      <Card className="bg-bg-card/50 border-white/5 min-w-0 overflow-hidden">
        <div className="bg-primary/10 p-1.5 md:p-2 rounded-lg w-fit mb-2">
          <TrendingUp className="text-primary" size={16} />
        </div>
        <p className="text-gray-400 text-xs md:text-sm mb-1 truncate">Vitórias</p>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-primary break-words">{wins}</p>
      </Card>

      {/* Perdas */}
      <Card className="bg-bg-card/50 border-white/5 min-w-0 overflow-hidden">
        <div className="bg-red-500/10 p-1.5 md:p-2 rounded-lg w-fit mb-2">
          <TrendingDown className="text-red-500" size={16} />
        </div>
        <p className="text-gray-400 text-xs md:text-sm mb-1 truncate">Perdas</p>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-500 break-words">{losses}</p>
      </Card>
    </div>
  );
};

