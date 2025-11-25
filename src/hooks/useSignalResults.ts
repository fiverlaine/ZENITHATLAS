import { useCallback } from 'react';
import { Signal } from '../types/trading';
import { fetchMarketData } from '../services/cryptoApi';
import { signalService } from '../services/signalService';
import { useTradeStore } from './useTradeStore';
import { playAlert } from '../utils/sound';

export const useSignalResults = () => {
  const { updateSignal } = useTradeStore();

  const checkSignalResult = useCallback(async (
    signal: Signal,
    timeframe: number,
    onResult: (updatedSignal: Signal) => void
  ) => {
    if (!signal?.id || !signal.time) {
      console.warn('Invalid signal data:', signal);
      return;
    }

    try {
      // Verifica se o sinal existe e já tem resultado
      const existingSignal = await signalService.getSignalById(signal.id);
      
      if (!existingSignal) {
        console.warn('Signal not found:', signal.id);
        return;
      }

      // Se o sinal já tem resultado, apenas notifica
      if (existingSignal.result) {
        updateSignal(existingSignal);
        onResult(existingSignal);
        return;
      }

      // Calcula o tempo exato para verificação usando ISO string
      const signalTime = new Date(signal.time);
      const currentTime = new Date();
      const elapsedTime = currentTime.getTime() - signalTime.getTime();
      const waitTime = Math.max(0, (timeframe * 60 * 1000) - elapsedTime);

      console.log(`Signal ${signal.id}: elapsed=${elapsedTime}ms, wait=${waitTime}ms, timeframe=${timeframe}min`);

      // Se já passou o tempo do sinal, verifica imediatamente
      if (waitTime <= 1000) { // Tolerância de 1 segundo
        console.log(`Processing signal ${signal.id} immediately`);
        await processSignalResult(signal, onResult);
        return;
      }

      // Aguarda o tempo restante com timeout de segurança
      console.log(`Waiting ${waitTime}ms for signal ${signal.id}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Verifica novamente o sinal antes de processar
      const currentSignal = await signalService.getSignalById(signal.id);
      if (!currentSignal) {
        console.warn('Signal not found after wait:', signal.id);
        return;
      }

      // Se o sinal já foi processado durante a espera
      if (currentSignal.result) {
        console.log(`Signal ${signal.id} already processed during wait`);
        updateSignal(currentSignal);
        onResult(currentSignal);
        return;
      }

      // Processa o resultado
      console.log(`Processing signal ${signal.id} after wait`);
      await processSignalResult(signal, onResult);

    } catch (error) {
      console.error('Error processing signal result:', error);
      try {
        // Em caso de erro, marca como loss
        const currentSignal = await signalService.getSignalById(signal.id);
        if (currentSignal && !currentSignal.result) {
          console.log(`Marking signal ${signal.id} as loss due to error`);
          const updatedSignal = {
            ...signal,
            result: 'loss' as const,
            profitLoss: 0
          };
          await signalService.updateSignalResult(signal.id, 'loss', 0);
          updateSignal(updatedSignal);
          onResult(updatedSignal);
          
          // Play loss sound
          playAlert('loss');
        }
      } catch (updateError) {
        console.error('Failed to update failed signal:', updateError);
      }
    }
  }, [updateSignal]);

  // Função auxiliar para processar resultado do sinal
  const processSignalResult = async (signal: Signal, onResult: (updatedSignal: Signal) => void) => {
    const marketData = await fetchMarketData(signal.pair, signal.timeframe);
    if (!marketData?.length) {
      throw new Error('Failed to fetch market data');
    }

    const currentPrice = marketData[marketData.length - 1].close;
    if (!currentPrice) {
      throw new Error('Invalid current price');
    }

    // Calcula o resultado
    const priceChange = ((currentPrice - signal.price) / signal.price) * 100;
    const isWin = (signal.type === 'buy' && priceChange > 0) || 
                 (signal.type === 'sell' && priceChange < 0);

    const updatedSignal = {
      ...signal,
      result: isWin ? 'win' as const : 'loss' as const,
      profitLoss: signal.type === 'buy' ? priceChange : -priceChange
    };

    console.log(`Signal ${signal.id} result: ${updatedSignal.result}, P&L: ${updatedSignal.profitLoss}%`);

    // Play sound based on result
    playAlert(updatedSignal.result);

    // Atualiza o resultado no banco de dados
    const savedSignal = await signalService.updateSignalResult(
      signal.id,
      updatedSignal.result,
      updatedSignal.profitLoss
    );

    if (!savedSignal) {
      throw new Error('Failed to save signal result');
    }

    // Atualiza o estado e notifica
    updateSignal(updatedSignal);
    onResult(updatedSignal);
  };

  return { checkSignalResult };
};
