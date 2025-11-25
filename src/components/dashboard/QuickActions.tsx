import React from 'react';
import { Play, Pause, Power } from 'lucide-react';
import { Card } from '../ui/Card';

interface Props {
  isAutomated: boolean;
  hasActiveSignal: boolean;
  selectedPair: string;
  timeframe: number;
  onToggleAutomation: () => void;
  onPairChange: (pair: string) => void;
  onTimeframeChange: (tf: number) => void;
  hideToggle?: boolean;
}

const CRYPTO_PAIRS = [
  'BTC/USD',
  'ETH/USD',
  'BNB/USD',
  'ADA/USD',
  'SOL/USD',
  'XRP/USD',
  'DOT/USD',
  'MATIC/USD'
];

const TIMEFRAMES = [
  { value: 1, label: '1 minuto' },
  { value: 5, label: '5 minutos' }
];

export const QuickActions: React.FC<Props> = ({
  isAutomated,
  hasActiveSignal,
  selectedPair,
  timeframe,
  onToggleAutomation,
  onPairChange,
  onTimeframeChange,
  hideToggle = false
}) => {
  return (
    <Card className="bg-gradient-to-br from-bg-card to-bg-card/50 border-primary/20">
      <div className="space-y-4">
        {/* Seleção de Par e Timeframe */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Par de Moedas</label>
            <select
              value={selectedPair}
              onChange={(e) => onPairChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none transition-colors"
            >
              {CRYPTO_PAIRS.map(pair => (
                <option key={pair} value={pair} className="bg-bg-card">
                  {pair}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none transition-colors"
            >
              {TIMEFRAMES.map(tf => (
                <option key={tf.value} value={tf.value} className="bg-bg-card">
                  {tf.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botão de Automação - Só mostra se hideToggle for false */}
        {!hideToggle && (
          <button
            onClick={onToggleAutomation}
            disabled={hasActiveSignal}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${isAutomated
              ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
              : 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(97,248,0,0.3)] hover:scale-105'
              } ${hasActiveSignal ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Power size={20} />
            {isAutomated ? 'PARAR SISTEMA' : 'INICIAR SISTEMA'}
          </button>
        )}

        {/* Status do Sistema */}
        {isAutomated && (
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-2 shadow-[0_0_10px_rgba(97,248,0,0.5)]" />
              <p className="text-primary text-sm font-medium">Sistema Ativo</p>
            </div>
          </div>
        )}

        {/* Status quando parado mas com entrada em andamento */}
        {!isAutomated && hasActiveSignal && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
              <p className="text-yellow-400 text-sm font-medium">Sistema Parado - Entrada Finalizando</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

