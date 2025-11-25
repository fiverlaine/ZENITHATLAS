import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Signal, View } from '../types/trading';
import { signalService } from '../services/signalService';
import { fetchMarketData } from '../services/cryptoApi';
import { supabase } from '../services/supabase';

interface TradeState {
  isAutomated: boolean;
  signals: Signal[];
  currentSignal: Signal | null;
  currentView: View;
  selectedPair: string;
  timeframe: number;
  selectedStrategy: string;
  setAutomated: (value: boolean) => void;
  setCurrentSignal: (signal: Signal | null) => void;
  setView: (view: View) => void;
  setPair: (pair: string) => void;
  setTimeframe: (timeframe: number) => void;
  setStrategy: (strategy: string) => void;
  addSignal: (signal: Signal) => void;
  updateSignal: (signal: Signal) => void;
  clearSignals: () => void;
  loadPendingSignals: () => Promise<void>;
  initializeSignals: () => Promise<void>;
  subscribeRealtime: () => Promise<() => void>;
}

const initialState: Omit<TradeState, 'setAutomated' | 'setCurrentSignal' | 'setView' | 'setPair' | 'setTimeframe' | 'setStrategy' | 'addSignal' | 'updateSignal' | 'clearSignals' | 'loadPendingSignals' | 'initializeSignals' | 'subscribeRealtime'> = {
  isAutomated: false,
  signals: [],
  currentSignal: null,
  currentView: 'signals',
  selectedPair: 'BTC/USDT',
  timeframe: 1,
  selectedStrategy: 'protocolo_v4',
};

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setAutomated: (value) => {
        // Permite parar a automação mesmo com entrada em andamento
        // A entrada atual continuará até o final do seu tempo
        set({ isAutomated: value });
      },
      setCurrentSignal: (signal) => {
        if (!signal) {
          set({ currentSignal: null });
          return;
        }

        const existingSignal = get().signals.find(s => s.id === signal.id);
        if (existingSignal?.result) {
          set({ currentSignal: null });
          return;
        }

        set({ currentSignal: signal });
      },
      setView: (view) => set({ currentView: view }),
      setPair: (pair) => {
        // Permite trocar par mesmo com operação ativa; a automação respeita operação atual
        set({ selectedPair: pair });
      },
      setTimeframe: (timeframe) => {
        // Permite trocar timeframe mesmo com operação ativa
        set({ timeframe });
      },
      setStrategy: (strategy) => set({ selectedStrategy: strategy }),
      addSignal: (signal) => {
        const { signals } = get();
        if (!signals.some(s => s.id === signal.id)) {
          set((state) => ({
            signals: [signal, ...state.signals],
            currentSignal: signal
          }));
        }
      },
      updateSignal: (signal) => {
        if (!signal.id) return;

        set((state) => {
          const updatedSignals = state.signals.map(s =>
            s.id === signal.id ? signal : s
          );

          const updatedCurrentSignal = state.currentSignal?.id === signal.id
            ? (signal.result ? null : signal)
            : state.currentSignal;

          return {
            signals: updatedSignals,
            currentSignal: updatedCurrentSignal
          };
        });
      },
      clearSignals: () => set({ signals: [], currentSignal: null }),
      loadPendingSignals: async () => {
        try {
          const pendingSignals = await signalService.getPendingSignals();
          const state = get();

          // Adiciona sinais pendentes novos ao estado
          const newSignals = pendingSignals.filter(
            pending => !state.signals.some(current => current.id === pending.id)
          );

          if (newSignals.length > 0) {
            const lastPendingSignal = newSignals.find(signal => !signal.result);

            set((state) => ({
              signals: [...newSignals, ...state.signals],
              currentSignal: lastPendingSignal || state.currentSignal
            }));
          }

          // Finaliza automaticamente sinais pendentes que já expiraram
          const now = Date.now();
          for (const signal of pendingSignals) {
            try {
              const signalTime = new Date(signal.time).getTime();
              const expiry = signalTime + (signal.timeframe * 60 * 1000);
              if (now >= expiry) {
                const marketData = await fetchMarketData(signal.pair, signal.timeframe);
                const currentPrice = Array.isArray(marketData) && marketData.length > 0
                  ? marketData[marketData.length - 1].close
                  : undefined;

                if (!currentPrice) {
                  // Se não conseguir preço, marca como loss por segurança
                  await signalService.updateSignalResult(signal.id, 'loss', 0);
                  set((state) => ({
                    signals: state.signals.map(s => s.id === signal.id ? { ...s, result: 'loss', profit_loss: 0 } : s),
                    currentSignal: state.currentSignal?.id === signal.id ? null : state.currentSignal
                  }));
                  continue;
                }

                const priceChange = ((currentPrice - signal.price) / signal.price) * 100;
                const isWin = (signal.type === 'buy' && priceChange > 0) || (signal.type === 'sell' && priceChange < 0);
                const profitLoss = signal.type === 'buy' ? priceChange : -priceChange;

                await signalService.updateSignalResult(signal.id, isWin ? 'win' : 'loss', profitLoss);

                set((state) => ({
                  signals: state.signals.map(s => s.id === signal.id ? { ...s, result: isWin ? 'win' : 'loss', profit_loss: profitLoss } : s),
                  currentSignal: state.currentSignal?.id === signal.id ? null : state.currentSignal
                }));
              }
            } catch (finalizeError) {
              console.error('Failed to auto-finalize pending signal:', finalizeError);
            }
          }
        } catch (error) {
          console.error('Error loading pending signals:', error);
        }
      },
      initializeSignals: async () => {
        try {
          // Busca todos os sinais do usuário
          const allSignals = await signalService.getAllSignals();

          if (!allSignals) {
            console.warn('No signals found during initialization');
            return;
          }

          // Encontra o último sinal pendente
          const lastPendingSignal = allSignals.find(signal => !signal.result);

          // Atualiza o estado
          set({
            signals: allSignals,
            currentSignal: lastPendingSignal || null
          });
        } catch (error) {
          console.error('Error initializing signals:', error);
        }
      },
      subscribeRealtime: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return () => { };

          const channel = supabase
            .channel('signals-realtime')
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'signals',
              filter: `user_id=eq.${user.id}`
            }, (payload) => {
              const row: any = payload.new;
              const signal: Signal = {
                id: row.id,
                type: row.type,
                price: Number(row.price) || 0,
                pair: row.pair,
                confidence: Number(row.confidence) || 0,
                time: row.time,
                timeframe: Number(row.timeframe) || 1,
                result: row.result as any,
                profit_loss: Number(row.profit_loss) || 0
              };
              const state = get();
              if (!state.signals.some(s => s.id === signal.id)) {
                set((state) => ({ signals: [signal, ...state.signals], currentSignal: !signal.result ? signal : state.currentSignal }));
              }
            })
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'signals',
              filter: `user_id=eq.${user.id}`
            }, (payload) => {
              const row: any = payload.new;
              const updated: Signal = {
                id: row.id,
                type: row.type,
                price: Number(row.price) || 0,
                pair: row.pair,
                confidence: Number(row.confidence) || 0,
                time: row.time,
                timeframe: Number(row.timeframe) || 1,
                result: row.result as any,
                profit_loss: Number(row.profit_loss) || 0
              };
              set((state) => ({
                signals: state.signals.map(s => s.id === updated.id ? updated : s),
                currentSignal: updated.result ? (state.currentSignal?.id === updated.id ? null : state.currentSignal) : state.currentSignal
              }));
            })
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } catch (error) {
          console.error('Error subscribing realtime:', error);
          return () => { };
        }
      }
    }),
    {
      name: 'trade-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return initialState;
        }
        return persistedState as TradeState;
      }
    }
  )
);
