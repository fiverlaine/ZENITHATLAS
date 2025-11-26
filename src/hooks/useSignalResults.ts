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
    _timeframe: number,
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

      // Processa o resultado IMEDIATAMENTE
      // O processSignalResult vai gerenciar a espera pelos momentos certos
      console.log(`🚀 Starting signal verification for ${signal.id}`);
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
    let entryPrice: number;
    let exitPrice: number;
    let isBrokerVerification = false;

    try {
      const entryTime = new Date(signal.time).getTime();
      const exitTime = entryTime + (signal.timeframe * 60 * 1000);
      const now = Date.now();

      console.log(`🎯 Starting verification for signal ${signal.id}`);
      console.log(`⏰ Entry time: ${new Date(entryTime).toISOString()}`);
      console.log(`⏰ Exit time: ${new Date(exitTime).toISOString()}`);
      console.log(`⏰ Current time: ${new Date(now).toISOString()}`);

      // PASSO 1: Aguardar até o momento de ENTRADA (se necessário)
      const waitForEntry = Math.max(0, entryTime - now);
      if (waitForEntry > 0) {
        console.log(`⏳ Waiting ${waitForEntry}ms until entry time...`);
        await new Promise(resolve => setTimeout(resolve, waitForEntry));
      }

      // PASSO 2: Buscar preço de ENTRADA
      console.log(`🔍 FETCHING ENTRY PRICE at ${new Date().toISOString()}`);
      try {
        const brokerApi = await import('../services/brokerApi').then(m => m.brokerApi);
        const fetchedEntryPrice = await brokerApi.getPriceAtTime(signal.pair, entryTime);

        if (fetchedEntryPrice) {
          entryPrice = fetchedEntryPrice;
          isBrokerVerification = true;
          console.log(`✅ ENTRY PRICE FROM BROKER API: ${entryPrice}`);
        } else {
          throw new Error('Entry price not available from Broker API');
        }
      } catch (entryError) {
        console.warn(`⚠️ Failed to fetch entry price from Broker API, using signal price:`, entryError);
        entryPrice = signal.price;
        isBrokerVerification = false;
        console.log(`📌 ENTRY PRICE FROM SIGNAL: ${entryPrice}`);
      }

      // PASSO 3: Aguardar até o momento de SAÍDA
      const nowAfterEntry = Date.now();
      const waitForExit = Math.max(0, exitTime - nowAfterEntry);
      console.log(`⏳ Waiting ${waitForExit}ms until exit time...`);
      await new Promise(resolve => setTimeout(resolve, waitForExit));

      // PASSO 4: Buscar preço de SAÍDA
      console.log(`🔍 FETCHING EXIT PRICE at ${new Date().toISOString()}`);
      try {
        const brokerApi = await import('../services/brokerApi').then(m => m.brokerApi);
        const fetchedExitPrice = await brokerApi.getPriceAtTime(signal.pair, exitTime);

        if (fetchedExitPrice) {
          exitPrice = fetchedExitPrice;
          console.log(`✅ EXIT PRICE FROM BROKER API: ${exitPrice}`);
        } else {
          throw new Error('Exit price not available from Broker API');
        }
      } catch (exitError) {
        console.warn(`⚠️ Failed to fetch exit price from Broker API, falling back to CryptoCompare:`, exitError);

        // Fallback para CryptoCompare
        const marketData = await fetchMarketData(signal.pair, signal.timeframe) as any[];
        if (!marketData?.length) {
          throw new Error('Failed to fetch market data');
        }
        exitPrice = marketData[marketData.length - 1].close;
        isBrokerVerification = false;
        console.log(`📌 EXIT PRICE FROM CRYPTOCOMPARE: ${exitPrice}`);
      }

      // PASSO 5: Comparar e calcular resultado
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 RESULT CALCULATION FOR SIGNAL ${signal.id}`);
      console.log(`   Pair: ${signal.pair}`);
      console.log(`   Type: ${signal.type.toUpperCase()}`);
      console.log(`   Entry Price: ${entryPrice}`);
      console.log(`   Exit Price: ${exitPrice}`);
      console.log(`   Difference: ${(exitPrice - entryPrice).toFixed(5)}`);

      const priceChange = ((exitPrice - entryPrice) / entryPrice) * 100;
      const isWin = (signal.type === 'buy' && exitPrice > entryPrice) ||
        (signal.type === 'sell' && exitPrice < entryPrice);

      console.log(`   Price Change: ${priceChange.toFixed(4)}%`);
      console.log(`   Result: ${isWin ? '🎉 WIN' : '❌ LOSS'}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const updatedSignal = {
        ...signal,
        result: isWin ? 'win' as const : 'loss' as const,
        profitLoss: signal.type === 'buy' ? priceChange : -priceChange,
        price: isBrokerVerification ? entryPrice : signal.price
      };

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
    } catch (error) {
      console.error('❌ Error in processSignalResult:', error);
      throw error;
    }
  };

  return { checkSignalResult };
};
