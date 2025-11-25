import { useState, useEffect, useRef, useCallback } from 'react';
import { Signal } from '../types/trading';
import { fetchMarketData } from '../services/cryptoApi';
import { analyzeMarket } from '../utils/indicators';
import { useTradeStore } from './useTradeStore';
import { useSettings } from './useSettings';
import { useSignalResults } from './useSignalResults';
import { signalService } from '../services/signalService';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';

const ANALYSIS_INTERVAL = 5000; // 5 segundos
const MAX_RETRIES = 3;
const MIN_CONFIDENCE = 70; // Aumentado para 70% para garantir sinais mais assertivos
const MAX_ATTEMPTS = 24; // Limite de tentativas (aprox 2 minutos)

export const useAutomation = (
  selectedPair: string,
  timeframe: number
) => {
  const { isAutomated, currentSignal, setCurrentSignal, addSignal, updateSignal } = useTradeStore();
  const { settings } = useSettings();
  const { checkSignalResult } = useSignalResults();

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingForAdmin, setWaitingForAdmin] = useState(false);

  const automationRef = useRef(isAutomated);
  const analysisInterval = useRef<NodeJS.Timeout>();
  const operationInProgress = useRef(false);
  const lastAnalysisTime = useRef<number>(0);
  const signalCheckTimeout = useRef<NodeJS.Timeout>();
  const retryCount = useRef(0);
  const attemptsRef = useRef(0);
  const mounted = useRef(true);
  const analyzeRef = useRef<() => Promise<void>>();
  const selectedPairRef = useRef(selectedPair);
  const executedAdminSignalsRef = useRef<Set<string>>(new Set());
  const scheduledExecutionRef = useRef<NodeJS.Timeout>();

  const resetState = useCallback(() => {
    if (!mounted.current) return;

    operationInProgress.current = false;
    setCurrentSignal(null);
    setError(null);
    lastAnalysisTime.current = 0;
    attemptsRef.current = 0;

    if (signalCheckTimeout.current) {
      clearTimeout(signalCheckTimeout.current);
      signalCheckTimeout.current = undefined;
    }
  }, [setCurrentSignal]);

  const handleSignalResult = useCallback(async (updatedSignal: Signal) => {
    if (!mounted.current || !updatedSignal.time || !updatedSignal.id) return;

    try {
      // Atualiza o sinal no store
      updateSignal(updatedSignal);

      const isLastGale = ((updatedSignal as any).martingaleStep || 0) === 2;
      const isMartingaleDisabled = true; // Martingale desabilitado por enquanto
      const isWin = updatedSignal.result === 'win';

      // Se o sinal foi completado, reseta o estado
      if (isWin || isLastGale || (updatedSignal.result === 'loss' && isMartingaleDisabled)) {
        // Atualiza o status no banco de dados
        await signalService.updateSignalResult(
          updatedSignal.id,
          updatedSignal.result,
          updatedSignal.profit_loss
        );

        // Reseta o estado
        resetState();

        // Só força uma nova análise se a automação ainda estiver ativa
        if (automationRef.current) {
          setTimeout(() => {
            if (mounted.current && automationRef.current && analyzeRef.current) {
              lastAnalysisTime.current = 0;
              analyzeRef.current();
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error handling signal result:', error);
      resetState();
    }
  }, [settings, resetState, updateSignal]);

  // Function to execute admin signal (extracted for reuse)
  const executeAdminSignal = useCallback(async (adminSignal: any) => {
    if (executedAdminSignalsRef.current.has(adminSignal.id)) return;

    console.log('Executing system signal:', adminSignal);
    executedAdminSignalsRef.current.add(adminSignal.id);

    const signalId = uuidv4();
    const signal: Omit<Signal, 'result' | 'profit_loss'> & {
      id?: string;
      martingaleStep?: number;
      martingaleMultiplier?: number;
    } = {
      id: signalId,
      type: adminSignal.type as 'buy' | 'sell',
      price: 0,
      time: new Date().toISOString(),
      pair: adminSignal.pair,
      confidence: 99,
      martingaleStep: 0,
      timeframe: adminSignal.timeframe
    };

    // Busca preço atual ou histórico
    const marketData = await fetchMarketData(adminSignal.pair, adminSignal.timeframe);
    if (Array.isArray(marketData) && marketData.length > 0) {
      const scheduledTime = new Date(adminSignal.scheduled_time).getTime() / 1000;
      // Tenta encontrar o candle correspondente ao horário agendado
      const matchingCandle = marketData.find(c => Math.abs(c.time - scheduledTime) < 60);

      if (matchingCandle) {
        signal.price = matchingCandle.close;
      } else {
        // Se não encontrar (ex: futuro ou muito antigo), usa o último
        signal.price = marketData[marketData.length - 1].close;
      }
    }

    const createdSignal = await signalService.createSignal(signal);

    if (createdSignal) {
      retryCount.current = 0;
      setCurrentSignal(signal);
      addSignal(signal);
      setAnalyzing(false); // Stop analyzing UI since signal is found

      // Mark as executed in DB
      await signalService.markAdminSignalExecuted(adminSignal.id);

      if (signalCheckTimeout.current) {
        clearTimeout(signalCheckTimeout.current);
      }

      const checkTime = adminSignal.timeframe * 60 * 1000;
      signalCheckTimeout.current = setTimeout(() => {
        checkSignalResult(signal, adminSignal.timeframe, handleSignalResult);
      }, checkTime);

      setTimeout(() => {
        if (mounted.current) {
          handleSignalResult({
            ...signal,
            result: 'loss',
            profit_loss: 0
          });
        }
      }, checkTime + 2000);
    }
  }, [setCurrentSignal, addSignal, checkSignalResult, handleSignalResult]);

  const scheduleAdminSignalExecution = useCallback((signal: any) => {
    if (scheduledExecutionRef.current) {
      clearTimeout(scheduledExecutionRef.current);
    }

    const now = Date.now();
    const scheduledTime = new Date(signal.scheduled_time).getTime();
    const delay = Math.max(0, scheduledTime - now);

    console.log(`Scheduling system signal execution in ${delay}ms`);

    scheduledExecutionRef.current = setTimeout(() => {
      executeAdminSignal(signal);
      if (mounted.current) setWaitingForAdmin(false);
    }, delay);
  }, [executeAdminSignal]);

  // Realtime subscription for Admin Signals
  useEffect(() => {
    if (!isAutomated) return;

    const channel = supabase
      .channel('admin-signals-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_signals'
      }, async (payload) => {
        const newSignal = payload.new as any;
        if (!newSignal || newSignal.status !== 'pending') return;

        // Normaliza pares para comparação (ex: BTC/USD == BTC/USDT)
        const normalizedNew = signalService.normalizePair(newSignal.pair);
        const normalizedCurrent = signalService.normalizePair(selectedPair);

        if (normalizedNew !== normalizedCurrent) return;

        const now = Date.now();
        const scheduledTime = new Date(newSignal.scheduled_time).getTime();
        const timeDiff = scheduledTime - now;

        // Se é um sinal novo para AGORA (ou passado recente)
        if (timeDiff <= 0 && timeDiff > -300000) {
          await executeAdminSignal(newSignal);
          if (mounted.current) setWaitingForAdmin(false);
        } else if (timeDiff > 0 && timeDiff < 120000) {
          // Se é para o futuro próximo (2 min), entra em modo de espera e agenda execução
          console.log('Realtime: System signal received for future, waiting...');
          if (mounted.current) setWaitingForAdmin(true);
          scheduleAdminSignalExecution(newSignal);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAutomated, executeAdminSignal, selectedPair]);

  const analyze = useCallback(async () => {
    if (!mounted.current || !isAutomated) return;

    const now = Date.now();
    const minInterval = selectedPairRef.current !== selectedPair ? 0 : ANALYSIS_INTERVAL;

    if (now - lastAnalysisTime.current < minInterval) {
      return;
    }

    // Atualiza a referência do par atual
    selectedPairRef.current = selectedPair;

    // Verifica se há uma operação em andamento
    if (currentSignal || operationInProgress.current) {
      setAnalyzing(false);
      return;
    }

    // Verifica outras condições
    if (!settings) {
      setAnalyzing(false);
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      operationInProgress.current = true;

      // 1. Verificar Sinais Administrativos (Prioridade Total)
      const adminSignal = await signalService.getPendingAdminSignal(selectedPair);

      if (adminSignal) {
        const scheduledTime = new Date(adminSignal.scheduled_time).getTime();
        const timeDiff = scheduledTime - now;

        // Se falta menos de 2 minutos, "congela" o sistema (fica buscando...)
        if (timeDiff > 0 && timeDiff < 120000) {
          console.log('System signal pending, pausing analysis...');
          if (mounted.current) setWaitingForAdmin(true);
          scheduleAdminSignalExecution(adminSignal);
          // Mantém analyzing = true para mostrar o popup, mas não faz nada
          return;
        }

        // Se chegou a hora (ou passou até 5 min), executa
        if (timeDiff <= 0 && timeDiff > -300000) {
          await executeAdminSignal(adminSignal);
          if (mounted.current) setWaitingForAdmin(false);
          return; // Sai da função, não roda análise técnica
        }
      }

      // 2. Análise Técnica Normal (se não houver sinal admin)
      const marketData = await fetchMarketData(selectedPair, timeframe);
      const { selectedStrategy } = useTradeStore.getState();
      const analysis = analyzeMarket(Array.isArray(marketData) ? marketData : [], selectedStrategy);

      // Validação adicional para sinais mais assertivos
      const isHighConfidence = analysis.confidence >= MIN_CONFIDENCE;
      const hasMultipleSignals = analysis.signals.length >= 1; // Alterado para 1 para aceitar sinais únicos
      const isStrongDirection = analysis.direction !== 'neutral';

      if (isHighConfidence && hasMultipleSignals && isStrongDirection) {
        console.log(`High confidence signal generated: ${analysis.confidence}%, signals: ${analysis.signals.length}, direction: ${analysis.direction}`);

        const signalId = uuidv4();
        const signal: Omit<Signal, 'result' | 'profit_loss'> & {
          id?: string;
          martingaleStep?: number;
          martingaleMultiplier?: number;
        } = {
          id: signalId,
          type: analysis.direction === 'up' ? 'buy' : 'sell',
          price: Array.isArray(marketData) && marketData.length > 0 ? marketData[marketData.length - 1].close : 0,
          time: new Date().toISOString(),
          pair: selectedPair,
          confidence: analysis.confidence,
          martingaleStep: 0,
          timeframe
        };

        lastAnalysisTime.current = now;

        const createdSignal = await signalService.createSignal(signal);

        if (createdSignal) {
          retryCount.current = 0;
          setCurrentSignal(signal);
          addSignal(signal);

          if (signalCheckTimeout.current) {
            clearTimeout(signalCheckTimeout.current);
          }

          // Configura o timeout para verificar o resultado
          const checkTime = timeframe * 60 * 1000;
          signalCheckTimeout.current = setTimeout(() => {
            console.log(`Timeout triggered for signal ${signal.id}`);
            checkSignalResult(signal, timeframe, handleSignalResult);
          }, checkTime);

          // Backup timeout para garantir que o sinal será finalizado (mais agressivo)
          setTimeout(() => {
            if (mounted.current) {
              console.log(`Backup timeout triggered for signal ${signal.id}`);
              handleSignalResult({
                ...signal,
                result: 'loss',
                profit_loss: 0
              });
            }
          }, checkTime + 2000); // 2 segundos extras para garantir
        } else {
          throw new Error('Failed to create signal');
        }
      } else {
        // Log quando não gera sinal para debug
        console.log(`Signal not generated: confidence=${analysis.confidence}%, signals=${analysis.signals.length}, direction=${analysis.direction}, required=${MIN_CONFIDENCE}%`);

        attemptsRef.current++;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setError('Nenhuma oportunidade encontrada após várias tentativas. Tente outro par ou estratégia.');
          resetState();
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Erro na análise. Tentando novamente...');

      retryCount.current++;
      if (retryCount.current <= MAX_RETRIES) {
        setTimeout(() => {
          if (mounted.current && analyzeRef.current) {
            analyzeRef.current();
          }
        }, retryCount.current * 1000);
      } else {
        resetState();
      }
    } finally {
      // Só desativa 'analyzing' se não estivermos esperando um sinal admin
      // Se estivermos no "tempo de espera", queremos manter o popup aberto
      const adminSignal = await signalService.getPendingAdminSignal(selectedPair);
      const now = Date.now();
      let isWaitingAdmin = false;

      if (adminSignal) {
        const scheduledTime = new Date(adminSignal.scheduled_time).getTime();
        const timeDiff = scheduledTime - now;
        if (timeDiff > 0 && timeDiff < 120000) {
          isWaitingAdmin = true;
        }
      }

      if (!isWaitingAdmin && !waitingForAdmin) {
        operationInProgress.current = false;
        if (mounted.current) setAnalyzing(false);
      }
    }
  }, [
    selectedPair,
    timeframe,
    settings,
    checkSignalResult,
    handleSignalResult,
    currentSignal,
    setCurrentSignal,
    addSignal,
    resetState,
    isAutomated,
    executeAdminSignal
  ]);

  // Atualiza a referência da função analyze
  useEffect(() => {
    analyzeRef.current = analyze;
  }, [analyze]);

  // Effect para iniciar/parar a automação
  useEffect(() => {
    automationRef.current = isAutomated;

    const startAnalysis = () => {
      if (isAutomated && !analysisInterval.current && analyzeRef.current) {
        // Força análise imediata ao iniciar
        lastAnalysisTime.current = 0;
        analyzeRef.current();

        analysisInterval.current = setInterval(() => {
          if (analyzeRef.current) {
            analyzeRef.current();
          }
        }, ANALYSIS_INTERVAL);
      }
    };

    const stopAnalysis = () => {
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
        analysisInterval.current = undefined;
      }
    };

    if (isAutomated) {
      startAnalysis();
    } else {
      stopAnalysis();
      // Não reseta o estado quando há uma entrada em andamento
      // A entrada atual continuará sendo monitorada até o final
      if (!currentSignal) {
        resetState();
      }
    }

    return () => {
      stopAnalysis();
    };
  }, [isAutomated, resetState]);

  // Effect para forçar análise quando o par ou timeframe mudar
  useEffect(() => {
    if (isAutomated && analyzeRef.current) {
      lastAnalysisTime.current = 0;
      analyzeRef.current();
    }
  }, [selectedPair, timeframe, isAutomated]);

  // Watchdog para garantir que sinais expirados sejam finalizados
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      if (!currentSignal || !currentSignal.time || currentSignal.result || operationInProgress.current) {
        return;
      }

      const signalTime = new Date(currentSignal.time).getTime();
      const expiryTime = signalTime + (currentSignal.timeframe * 60 * 1000);
      const now = Date.now();

      // Se já passou do tempo de expiração (+ 2 segundos de margem)
      if (now > expiryTime + 2000) {
        console.log('Watchdog: Signal expired, forcing check', currentSignal.id);
        checkSignalResult(currentSignal, currentSignal.timeframe, handleSignalResult);
      }
    }, 2000); // Verifica a cada 2 segundos

    return () => clearInterval(watchdogInterval);
  }, [currentSignal, checkSignalResult, handleSignalResult]);

  // Cleanup effect
  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
      }
      if (signalCheckTimeout.current) {
        clearTimeout(signalCheckTimeout.current);
      }
      if (scheduledExecutionRef.current) {
        clearTimeout(scheduledExecutionRef.current);
      }
    };
  }, []);

  return {
    analyzing,
    error,
    toggleAutomation: useCallback(() => {
      if (!settings && !isAutomated) {
        return false;
      }
      return true;
    }, [settings, isAutomated])
  };
};
