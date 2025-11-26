import { useCallback, useRef } from 'react';
import { Signal } from '../types/trading';
import { fetchMarketData } from '../services/cryptoApi';
import { signalService } from '../services/signalService';
import { useTradeStore } from './useTradeStore';
import { playAlert } from '../utils/sound';
import { brokerApi } from '../services/brokerApi';

// Armazena preços de entrada para cada sinal (garante consistência)
const entryPricesStore = new Map<string, { price: number; timestamp: number }>();

export const useSignalResults = () => {
  const { updateSignal } = useTradeStore();
  const processingSignals = useRef<Set<string>>(new Set());

  const checkSignalResult = useCallback(async (
    signal: Signal,
    _timeframe: number,
    onResult: (updatedSignal: Signal) => void
  ) => {
    if (!signal?.id || !signal.time) {
      console.warn('Invalid signal data:', signal);
      return;
    }

    // Evita processar o mesmo sinal múltiplas vezes
    if (processingSignals.current.has(signal.id)) {
      console.log(`⏳ Signal ${signal.id} already being processed, skipping...`);
      return;
    }

    processingSignals.current.add(signal.id);

    try {
      // Verifica se o sinal existe e já tem resultado
      const existingSignal = await signalService.getSignalById(signal.id);

      if (!existingSignal) {
        console.warn('Signal not found:', signal.id);
        processingSignals.current.delete(signal.id);
        return;
      }

      // Se o sinal já tem resultado, apenas notifica
      if (existingSignal.result) {
        updateSignal(existingSignal);
        onResult(existingSignal);
        processingSignals.current.delete(signal.id);
        return;
      }

      // Processa o resultado
      console.log(`🚀 Starting signal verification for ${signal.id}`);
      await processSignalResult(signal, onResult, updateSignal);

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
            profit_loss: 0
          };
          await signalService.updateSignalResult(signal.id, 'loss', 0);
          updateSignal(updatedSignal);
          onResult(updatedSignal);
          playAlert('loss');
        }
      } catch (updateError) {
        console.error('Failed to update failed signal:', updateError);
      }
    } finally {
      processingSignals.current.delete(signal.id);
    }
  }, [updateSignal]);

  return { checkSignalResult };
};

// Função auxiliar para processar resultado do sinal
// CORREÇÃO: Busca preços nos momentos exatos e armazena o preço de entrada
const processSignalResult = async (
  signal: Signal, 
  onResult: (updatedSignal: Signal) => void,
  updateSignal: (signal: Signal) => void
) => {
  let entryPrice: number | null = null;
  let exitPrice: number | null = null;

  const entryTime = new Date(signal.time).getTime();
  const exitTime = entryTime + (signal.timeframe * 60 * 1000);
  const now = Date.now();

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`🎯 VERIFICAÇÃO DO SINAL ${signal.id}`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`📌 Par: ${signal.pair} | Tipo: ${signal.type.toUpperCase()}`);
  console.log(`⏰ Entrada: ${new Date(entryTime).toLocaleTimeString()}`);
  console.log(`⏰ Saída: ${new Date(exitTime).toLocaleTimeString()}`);
  console.log(`⏰ Agora: ${new Date(now).toLocaleTimeString()}`);

  // ═══════════════════════════════════════════════════════════════
  // PASSO 1: PREÇO DE ENTRADA
  // ═══════════════════════════════════════════════════════════════
  
  // Verifica se já temos o preço de entrada armazenado
  const storedEntry = entryPricesStore.get(signal.id);
  if (storedEntry) {
    entryPrice = storedEntry.price;
    console.log(`📌 Usando preço de entrada armazenado: ${entryPrice}`);
  } else {
    // Aguarda até o momento de entrada (+ 2 segundos de margem)
    const waitForEntry = Math.max(0, entryTime + 2000 - now);
    if (waitForEntry > 0) {
      console.log(`⏳ Aguardando ${Math.round(waitForEntry / 1000)}s até o momento de entrada...`);
      await new Promise(resolve => setTimeout(resolve, waitForEntry));
    }

    // Busca o preço de entrada com retry
    console.log(`\n🔍 BUSCANDO PREÇO DE ENTRADA...`);
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        // Busca o preço no momento exato da entrada (início do minuto)
        const fetchedPrice = await brokerApi.getPriceAtTime(signal.pair, entryTime);
        
        if (fetchedPrice && fetchedPrice > 0) {
          entryPrice = fetchedPrice;
          entryPricesStore.set(signal.id, { price: entryPrice, timestamp: Date.now() });
          console.log(`✅ PREÇO DE ENTRADA: ${entryPrice} (tentativa ${attempt})`);
          break;
        }
        
        console.log(`⚠️ Tentativa ${attempt}: preço não disponível, aguardando...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } catch (error) {
        console.warn(`❌ Tentativa ${attempt} falhou:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    // Fallback: usa o preço do sinal
    if (!entryPrice) {
      entryPrice = signal.price;
      entryPricesStore.set(signal.id, { price: entryPrice, timestamp: Date.now() });
      console.log(`📌 Usando preço do sinal como entrada: ${entryPrice}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASSO 2: AGUARDAR ATÉ O FIM DO TIMEFRAME
  // ═══════════════════════════════════════════════════════════════
  
  const nowAfterEntry = Date.now();
  const waitForExit = Math.max(0, exitTime + 3000 - nowAfterEntry); // +3s de margem
  
  if (waitForExit > 0) {
    console.log(`\n⏳ Aguardando ${Math.round(waitForExit / 1000)}s até o fechamento...`);
    await new Promise(resolve => setTimeout(resolve, waitForExit));
  }

  // ═══════════════════════════════════════════════════════════════
  // PASSO 3: PREÇO DE SAÍDA
  // ═══════════════════════════════════════════════════════════════
  
  console.log(`\n🔍 BUSCANDO PREÇO DE SAÍDA...`);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // Busca o preço no momento de saída (fechamento do candle)
      const fetchedPrice = await brokerApi.getPriceAtTime(signal.pair, exitTime);
      
      if (fetchedPrice && fetchedPrice > 0) {
        exitPrice = fetchedPrice;
        console.log(`✅ PREÇO DE SAÍDA: ${exitPrice} (tentativa ${attempt})`);
        break;
      }
      
      console.log(`⚠️ Tentativa ${attempt}: preço não disponível, aguardando...`);
      await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
    } catch (error) {
      console.warn(`❌ Tentativa ${attempt} falhou:`, error);
      await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
    }
  }

  // Fallback: busca do CryptoCompare
  if (!exitPrice) {
    console.log(`\n📡 Fallback: buscando do CryptoCompare...`);
    try {
      const marketData = await fetchMarketData(signal.pair, signal.timeframe) as any[];
      if (marketData?.length > 0) {
        exitPrice = marketData[marketData.length - 1].close;
        console.log(`📌 Preço de saída do CryptoCompare: ${exitPrice}`);
      }
    } catch (error) {
      console.error('Falha no fallback:', error);
    }
  }

  // Se ainda não tem preço de saída, usa o de entrada (empate = loss)
  if (!exitPrice) {
    console.warn(`⚠️ Não foi possível obter preço de saída, usando preço de entrada`);
    exitPrice = entryPrice;
  }

  // ═══════════════════════════════════════════════════════════════
  // PASSO 4: CALCULAR RESULTADO
  // ═══════════════════════════════════════════════════════════════
  
  const priceDiff = exitPrice - entryPrice;
  const priceChange = ((priceDiff) / entryPrice) * 100;
  
  // Determina WIN ou LOSS
  // COMPRA (buy/call): WIN se preço subiu (exitPrice > entryPrice)
  // VENDA (sell/put): WIN se preço caiu (exitPrice < entryPrice)
  const isWin = signal.type === 'buy' 
    ? exitPrice > entryPrice 
    : exitPrice < entryPrice;

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 RESULTADO FINAL`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`   Preço Entrada: ${entryPrice}`);
  console.log(`   Preço Saída:   ${exitPrice}`);
  console.log(`   Diferença:     ${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(5)}`);
  console.log(`   Variação:      ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(4)}%`);
  console.log(`   Tipo:          ${signal.type.toUpperCase()}`);
  console.log(`   ${isWin ? '🎉 WIN!' : '❌ LOSS'}`);
  console.log(`${'═'.repeat(50)}\n`);

  const updatedSignal: Signal = {
    ...signal,
    result: isWin ? 'win' : 'loss',
    profit_loss: Math.abs(priceChange),
    price: entryPrice // Atualiza com o preço real de entrada
  };

  // Play sound
  playAlert(updatedSignal.result);

  // Salva no banco
  const savedSignal = await signalService.updateSignalResult(
    signal.id,
    updatedSignal.result,
    updatedSignal.profit_loss
  );

  if (!savedSignal) {
    throw new Error('Failed to save signal result');
  }

  // Limpa o cache do preço de entrada
  entryPricesStore.delete(signal.id);

  // Notifica
  updateSignal(updatedSignal);
  onResult(updatedSignal);
};
