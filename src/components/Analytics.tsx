import React, { useState, useMemo } from 'react';
import { SimpleStats } from './dashboard/SimpleStats';
import { useTradeStore } from '../hooks/useTradeStore';
import { BarChart3, TrendingUp, Target, Activity } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');

  const { signals, isAutomated } = useTradeStore();

  // Filtrar sinais por período
  const filteredSignals = useMemo(() => {
    return signals.filter(signal => {
      if (!signal || !signal.time) return false;
      const signalDate = new Date(signal.time);
      return signalDate >= dateRange.start && signalDate <= dateRange.end;
    });
  }, [signals, dateRange]);

  // Calcular estatísticas dos sinais filtrados
  const completedSignals = filteredSignals.filter(s => s && s.result && s.id);
  const wins = completedSignals.filter(s => s.result === 'win').length;
  const losses = completedSignals.filter(s => s.result === 'loss').length;
  const winRate = completedSignals.length > 0
    ? (wins / completedSignals.length) * 100
    : 0;

  // Calcular lucro total
  const totalProfit = completedSignals.reduce((sum, signal) => {
    return sum + (signal.profit_loss || 0);
  }, 0);

  // Performance por par
  const pairStats = useMemo(() => {
    const pairs: Record<string, { total: number; wins: number; losses: number; profit: number }> = {};

    completedSignals.forEach(signal => {
      if (!pairs[signal.pair]) {
        pairs[signal.pair] = { total: 0, wins: 0, losses: 0, profit: 0 };
      }
      pairs[signal.pair].total++;
      if (signal.result === 'win') pairs[signal.pair].wins++;
      if (signal.result === 'loss') pairs[signal.pair].losses++;
      pairs[signal.pair].profit += signal.profit_loss || 0;
    });

    return Object.entries(pairs).map(([pair, stats]) => ({
      pair,
      ...stats,
      winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  }, [completedSignals]);

  const handlePeriodChange = (period: '7d' | '30d' | '90d' | 'custom') => {
    setSelectedPeriod(period);

    if (period === 'custom') return;

    const now = new Date();
    let start: Date;

    switch (period) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    setDateRange({ start, end: now });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-3 rounded-xl">
            <BarChart3 className="text-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Relatório</h1>
            <p className="text-gray-400">Análise detalhada de performance</p>
          </div>
        </div>
      </div>

      {/* Filtros de Data */}
      <Card className="bg-bg-card/50 border-white/5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Período de Análise</h3>
            <p className="text-sm text-gray-400">
              {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['7d', '30d', '90d', 'custom'] as const).map((period) => (
              <Button
                key={period}
                onClick={() => handlePeriodChange(period)}
                variant={selectedPeriod === period ? 'primary' : 'secondary'}
                className="text-xs px-3 py-1"
              >
                {period === '7d' ? '7 dias' :
                  period === '30d' ? '30 dias' :
                    period === '90d' ? '90 dias' : 'Personalizado'}
              </Button>
            ))}
          </div>
        </div>

        {selectedPeriod === 'custom' && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Data Inicial</label>
                <input
                  type="date"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Data Final</label>
                <input
                  type="date"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Estatísticas Principais */}
      <SimpleStats
        totalSignals={completedSignals.length}
        wins={wins}
        losses={losses}
        winRate={winRate}
        isActive={isAutomated}
      />

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary text-sm font-medium">Lucro Total</p>
              <p className="text-2xl font-bold text-white">
                {totalProfit > 0 ? '+' : ''}{totalProfit.toFixed(2)}%
              </p>
            </div>
            <div className="bg-primary/20 p-3 rounded-xl">
              <TrendingUp className="text-primary" size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Operações Ativas</p>
              <p className="text-2xl font-bold text-white">
                {filteredSignals.filter(s => !s.result).length}
              </p>
            </div>
            <div className="bg-white/10 p-3 rounded-xl">
              <Activity className="text-white" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Performance por Par */}
      {pairStats.length > 0 && (
        <Card className="bg-bg-card/50 border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <Target className="text-purple-500" size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Performance por Par</h3>
              <p className="text-gray-400 text-sm">Análise detalhada por ativo</p>
            </div>
          </div>

          <div className="space-y-4">
            {pairStats.map((stat) => (
              <div
                key={stat.pair}
                className="bg-white/5 rounded-lg p-4 border border-white/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-white">{stat.pair}</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">{stat.total} operações</span>
                    <span className={`font-medium ${stat.winRate >= 50 ? 'text-primary' : 'text-red-500'
                      }`}>
                      {stat.winRate.toFixed(1)}% acerto
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-primary text-sm">Vitórias</p>
                    <p className="text-lg font-bold text-white">{stat.wins}</p>
                  </div>
                  <div>
                    <p className="text-red-400 text-sm">Perdas</p>
                    <p className="text-lg font-bold text-white">{stat.losses}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Lucro</p>
                    <p className={`text-lg font-bold ${stat.profit > 0 ? 'text-primary' : 'text-red-500'
                      }`}>
                      {stat.profit > 0 ? '+' : ''}{stat.profit.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Estado Vazio */}
      {completedSignals.length === 0 && (
        <Card className="bg-bg-card/50 border-white/5">
          <div className="text-center py-12">
            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="text-gray-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">Nenhuma Operação no Período</h3>
            <p className="text-gray-500">
              Não há operações finalizadas no período selecionado.
              Tente ajustar o filtro de data ou inicie o sistema para gerar operações.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
