import React, { useState, useEffect } from 'react';
import { QuickActions } from './dashboard/QuickActions';
import { ActiveSignal } from './dashboard/ActiveSignal';
import { UnifiedChart } from './dashboard/UnifiedChart';
import { SettingsDialog } from './SettingsDialog';
import { SearchingPopup } from './SearchingPopup';
import { SignalPopup } from './SignalPopup';
import { useTradeStore } from '../hooks/useTradeStore';
import { useAutomation } from '../hooks/useAutomation';
import { Card } from './ui/Card';
import { Play, Settings2, Zap } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    currentSignal,
    isAutomated,
    setAutomated,
    selectedPair,
    timeframe,
    setPair,
    setTimeframe,
    selectedStrategy,
    setStrategy
  } = useTradeStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showSignalPopup, setShowSignalPopup] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>();
  const [isSearching, setIsSearching] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('');

  const { toggleAutomation, error: automationError } = useAutomation(
    selectedPair,
    timeframe
  );

  // Quando um sinal é encontrado, parar a busca e mostrar popup
  useEffect(() => {
    if (currentSignal && isSearching) {
      setIsSearching(false);
      setAutomated(false); // Parar automação após encontrar
      setShowSignalPopup(true);
    }
  }, [currentSignal, isSearching, setAutomated]);

  // Monitorar erros da automação
  useEffect(() => {
    if (automationError && isSearching) {
      setIsSearching(false);
      setAutomated(false);
      alert(automationError);
    }
  }, [automationError, isSearching, setAutomated]);

  const handleSearchEntry = () => {
    if (!selectedStrategy) {
      alert('Por favor, selecione uma estratégia primeiro.');
      return;
    }

    setIsSearching(true);
    setAutomated(true);
    toggleAutomation(); // Inicia a análise
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    setAutomated(false);
    toggleAutomation(); // Para a análise
  };

  // Simular preço atual para demonstração
  useEffect(() => {
    if (currentSignal && currentSignal.price) {
      const interval = setInterval(() => {
        const variation = (Math.random() - 0.5) * 100;
        setCurrentPrice((currentSignal.price || 0) + variation);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentSignal]);

  // Countdown timer effect
  useEffect(() => {
    if (!currentSignal || !currentSignal.time) {
      setRemainingTime('');
      return;
    }

    const interval = setInterval(() => {
      const startTime = new Date(currentSignal.time).getTime();
      const endTime = startTime + (currentSignal.timeframe * 60 * 1000);
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setRemainingTime('00:00');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSignal]);

  const strategies = [
    { id: 'protocolo_v4', name: 'Protocolo V4', desc: 'BB + EMA100 + EMA20 + RSI' },
    { id: 'momentum_alpha', name: 'Momentum Alpha', desc: 'MACD + StochRSI' },
    { id: 'trend_surfer', name: 'Trend Surfer', desc: 'ADX + EMA Cross' },
    { id: 'cci_reversal', name: 'CCI Reversal', desc: 'CCI Oversold/Overbought' },
    { id: 'williams_r', name: 'Williams %R', desc: 'Williams %R Reversal' },
    { id: 'mfi_reversal', name: 'MFI Reversal', desc: 'MFI Money Flow' }
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Popup de Sinal Encontrado */}
      <SignalPopup
        isOpen={showSignalPopup}
        signal={currentSignal}
        onClose={() => setShowSignalPopup(false)}
      />

      {/* Popup de Busca */}
      <SearchingPopup
        isOpen={isSearching}
        strategyName={strategies.find(s => s.id === selectedStrategy)?.name || 'Estratégia Personalizada'}
        onCancel={handleCancelSearch}
      />

      {/* Seletor de Estratégia (Obrigatório e Visível) */}
      <Card className="p-6 bg-gradient-to-br from-bg-card to-bg-card/50 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="text-primary" size={20} />
          <h3 className="text-lg font-bold text-white">Selecione a Estratégia</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => setStrategy(strategy.id)}
              className={`p-4 rounded-xl border text-left transition-all duration-300 ${selectedStrategy === strategy.id
                ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(97,248,0,0.15)]'
                : 'border-white/5 hover:border-primary/30 hover:bg-white/5'
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className={`font-bold ${selectedStrategy === strategy.id ? 'text-primary' : 'text-white'}`}>
                  {strategy.name}
                </h4>
                {selectedStrategy === strategy.id && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <p className="text-xs text-gray-400">{strategy.desc}</p>
            </button>
          ))}
        </div>

        {/* Botão Principal de Busca */}
        <button
          onClick={handleSearchEntry}
          disabled={isSearching || !!currentSignal}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${isSearching || !!currentSignal
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-primary text-black hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(97,248,0,0.4)] hover:scale-[1.02]'
            }`}
        >
          {isSearching ? (
            <>
              <Settings2 className="animate-spin" />
              Buscando Oportunidade...
            </>
          ) : currentSignal ? (
            <>
              <Zap />
              Finalizando entrada em {remainingTime}
            </>
          ) : (
            <>
              <Play fill="currentColor" />
              BUSCAR ENTRADA
            </>
          )}
        </button>
      </Card>

      {/* Ações Rápidas (Par e Timeframe) */}
      <QuickActions
        isAutomated={isAutomated}
        hasActiveSignal={!!currentSignal}
        selectedPair={selectedPair}
        timeframe={timeframe}
        onToggleAutomation={() => { }} // Desativado aqui pois agora é pelo botão principal
        onPairChange={setPair}
        onTimeframeChange={setTimeframe}
        hideToggle={true} // Prop nova para esconder o toggle antigo
      />

      {/* Layout Principal */}
      <div className="space-y-6">
        <UnifiedChart selectedPair={selectedPair} timeframe={timeframe} />
        <ActiveSignal signal={currentSignal} currentPrice={currentPrice} />
      </div>

      {showSettings && (
        <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};
