import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMarketData } from '../services/cryptoApi';
import { analyzeMarket } from '../utils/indicators';

export const useMarketData = (symbol: string, timeframe: number) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortController = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (isLoading) return;

    // Cancelar requisição anterior se existir
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const marketData = await fetchMarketData(symbol, timeframe);
      const analysis = analyzeMarket(marketData);
      
      setData({
        marketData,
        analysis,
        lastUpdate: Date.now()
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      console.error('Market data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, isLoading]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);

    // Listener para quando a aba volta a ficar ativa
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, refreshing data');
        fetchData();
      }
    };

    // Listener para foco da janela
    const handleFocus = () => {
      console.log('Window focused, refreshing data');
      fetchData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [symbol, timeframe, fetchData]);

  return { data, error, isLoading, refetch: fetchData };
};
