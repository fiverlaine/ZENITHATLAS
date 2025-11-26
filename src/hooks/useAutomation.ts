import { useState, useEffect, useRef, useCallback } from 'react';
import { Signal } from '../types/trading';
import { fetchMarketData } from '../services/cryptoApi';
import { analyzeMarket } from '../utils/indicators';
import { useTradeStore } from './useTradeStore';
import { useSettings } from './useSettings';
import { useSignalResults } from './useSignalResults';
import { signalService } from '../services/signalService';
import { systemService } from '../services/systemService';
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
  const [systemEnabled, setSystemEnabled] = useState(true);

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
  const currentSignalRef = useRef(currentSignal); // Ref para acesso no realtime
  
  // Mantém a ref do currentSignal atualizada
  useEffect(() => {
    currentSignalRef.current = currentSignal;
  }, [currentSignal]);

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

      // Se o sinal foi completado, atualiza no banco mas NÃO reseta o estado
      // O popup ficará aberto até o usuário fechar manualmente
      if (isWin || isLastGale || (updatedSignal.result === 'loss' && isMartingaleDisabled)) {
        // Atualiza o status no banco de dados
        await signalService.updateSignalResult(
          updatedSignal.id,
          updatedSignal.result,
          updatedSignal.profit_loss
        );

        console.log(`✅ Signal ${updatedSignal.id} completed with result: ${updatedSignal.result}`);

        // NÃO reseta o estado - popup fica aberto
        // resetState();

        // NÃO força nova análise automaticamente
        // O usuário deve fechar o popup e buscar nova entrada manualmente
      }
    } catch (error) {
      console.error('Error handling signal result:', error);
      // Em caso de erro, também não reseta
    }
  }, [updateSignal]);

  // Function to execute admin signal (extracted for reuse)
  // CORREÇÃO: Agora executa 1 minuto ANTES do scheduled_time
  // O sinal é gerado com time = scheduled_time (horário real de entrada)
  const executeAdminSignal = useCallback(async (adminSignal: any) => {
    if (executedAdminSignalsRef.current.has(adminSignal.id)) return;

    const now = Date.now();
    const scheduledTime = new Date(adminSignal.scheduled_time).getTime();
    const timeDiff = scheduledTime - now;

    console.log(`🔔 Admin Signal Check: ${adminSignal.pair} scheduled for ${new Date(scheduledTime).toISOString()}`);
    console.log(`⏰ Time until entry: ${Math.round(timeDiff / 1000)}s`);

    // NOVA LÓGICA: Só executa se estiver entre 0 e 90 segundos antes do scheduled_time
    // Isso garante que o sinal aparece ~1 minuto antes da entrada real
    if (timeDiff > 90000) {
      console.log(`⏳ Too early to execute, waiting... (${Math.round(timeDiff / 1000)}s remaining)`);
      return; // Muito cedo, não executa ainda
    }

    // Se já passou mais de 60 segundos do horário agendado, é tarde demais
    if (timeDiff < -60000) {
      console.log(`⚠️ Signal expired, marking as executed`);
      await signalService.markAdminSignalExecuted(adminSignal.id);
      return;
    }

    console.log('✅ Executing system signal:', adminSignal);
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
      time: adminSignal.scheduled_time, // Usa o horário AGENDADO como horário de entrada
      pair: adminSignal.pair,
      confidence: 99,
      martingaleStep: 0,
      timeframe: adminSignal.timeframe
    };

    // Busca preço atual (será atualizado no momento exato da entrada pelo useSignalResults)
    const marketData = await fetchMarketData(adminSignal.pair, adminSignal.timeframe);
    if (Array.isArray(marketData) && marketData.length > 0) {
      // Usa o último preço disponível como referência inicial
      signal.price = marketData[marketData.length - 1].close;
    }

    const createdSignal = await signalService.createSignal(signal);

    if (createdSignal) {
      retryCount.current = 0;
      setCurrentSignal(signal);
      addSignal(signal);
      setAnalyzing(false);

      // Mark as executed in DB
      await signalService.markAdminSignalExecuted(adminSignal.id);

      if (signalCheckTimeout.current) {
        clearTimeout(signalCheckTimeout.current);
      }

      // Calcula quando verificar o resultado:
      // - O sinal entra no scheduled_time
      // - O sinal sai no scheduled_time + (timeframe * 60 * 1000)
      // - Começamos a monitorar imediatamente, mas a verificação real só acontece no tempo certo
      const entryTime = new Date(adminSignal.scheduled_time).getTime();
      const exitTime = entryTime + (adminSignal.timeframe * 60 * 1000);
      const timeUntilExit = exitTime - Date.now();

      console.log(`📊 Signal ${signalId} - Entry: ${new Date(entryTime).toLocaleTimeString()}, Exit: ${new Date(exitTime).toLocaleTimeString()}`);
      console.log(`⏱️ Time until result check: ${Math.round(timeUntilExit / 1000)}s`);

      // Inicia o monitoramento imediatamente - useSignalResults vai esperar os tempos corretos
      signalCheckTimeout.current = setTimeout(() => {
        checkSignalResult(signal, adminSignal.timeframe, handleSignalResult);
      }, 0);

      // Backup timeout para garantir resultado
      const backupTime = Math.max(timeUntilExit + 15000, 15000);
      setTimeout(() => {
        if (mounted.current && !signal.result) {
          console.log(`⚠️ Backup check for signal ${signalId}`);
          checkSignalResult(signal, adminSignal.timeframe, handleSignalResult);
        }
      }, backupTime);
    }
  }, [setCurrentSignal, addSignal, checkSignalResult, handleSignalResult]);

  const scheduleAdminSignalExecution = useCallback((signal: any) => {
    if (scheduledExecutionRef.current) {
      clearTimeout(scheduledExecutionRef.current);
    }

    const now = Date.now();
    const scheduledTime = new Date(signal.scheduled_time).getTime();
    // CORREÇÃO: Executa 60 segundos ANTES do horário agendado (1 minuto antes)
    // Isso permite que o usuário veja o sinal antes da entrada real
    const executeAt = scheduledTime - 60000; // 1 minuto antes
    const delay = Math.max(0, executeAt - now);

    console.log(`📅 Scheduling signal execution ${Math.round(delay / 1000)}s from now (1 min before entry at ${new Date(scheduledTime).toLocaleTimeString()})`);

    scheduledExecutionRef.current = setTimeout(() => {
      executeAdminSignal(signal);
      if (mounted.current) setWaitingForAdmin(false);
    }, delay);
  }, [executeAdminSignal]);

  // Realtime subscription for Admin Signals - SEMPRE ATIVO quando buscando
  // CORREÇÃO: Subscription independente do par para capturar QUALQUER sinal admin
  useEffect(() => {
    if (!isAutomated) return;

    console.log('📡 Iniciando subscription realtime para sinais admin...');

    const channel = supabase
      .channel('admin-signals-realtime-' + Date.now()) // ID único para evitar conflitos
      .on('postgres_changes', {
        event: 'INSERT', // Captura apenas novos sinais
        schema: 'public',
        table: 'admin_signals'
      }, async (payload) => {
        console.log('📡 REALTIME: Novo sinal admin recebido!', payload);
        
        const newSignal = payload.new as any;
        if (!newSignal || newSignal.status !== 'pending') {
          console.log('📡 Sinal ignorado (status não é pending)');
          return;
        }

        // Normaliza pares para comparação
        const normalizedNew = signalService.normalizePair(newSignal.pair);
        const normalizedCurrent = signalService.normalizePair(selectedPairRef.current);

        console.log(`📡 Comparando: sinal=${normalizedNew}, buscando=${normalizedCurrent}`);

        // IMPORTANTE: Verifica se o par corresponde
        if (normalizedNew !== normalizedCurrent) {
          console.log(`📡 Par não corresponde, ignorando (${normalizedNew} != ${normalizedCurrent})`);
          return;
        }

        // Verifica se já está processando ou já tem sinal ativo
        if (operationInProgress.current || currentSignalRef.current) {
          console.log('📡 Já existe operação em andamento, ignorando');
          return;
        }

        const now = Date.now();
        const scheduledTime = new Date(newSignal.scheduled_time).getTime();
        const timeDiff = scheduledTime - now;

        console.log(`📡 ⚡ REALTIME: Sinal ${newSignal.pair} recebido! Entrada em ${Math.round(timeDiff / 1000)}s`);

        // EXECUÇÃO IMEDIATA: Se o sinal está dentro da janela de tempo
        if (timeDiff <= 90000 && timeDiff > -60000) {
          console.log('📡 ✅ Executando sinal IMEDIATAMENTE via realtime!');
          operationInProgress.current = true;
          setAnalyzing(false);
          await executeAdminSignal(newSignal);
          if (mounted.current) setWaitingForAdmin(false);
        } else if (timeDiff > 90000 && timeDiff < 300000) {
          // Se falta mais de 90s mas menos de 5min, agenda a execução
          console.log(`📡 📅 Agendando execução para daqui ${Math.round((timeDiff - 60000) / 1000)}s`);
          if (mounted.current) setWaitingForAdmin(true);
          scheduleAdminSignalExecution(newSignal);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', // Também captura updates (caso mude de cancelled para pending)
        schema: 'public',
        table: 'admin_signals'
      }, async (payload) => {
        const newSignal = payload.new as any;
        const oldSignal = payload.old as any;
        
        // Se mudou para pending e antes não era
        if (newSignal?.status === 'pending' && oldSignal?.status !== 'pending') {
          console.log('📡 Sinal atualizado para pending, verificando...');
          
          const normalizedNew = signalService.normalizePair(newSignal.pair);
          const normalizedCurrent = signalService.normalizePair(selectedPairRef.current);
          
          if (normalizedNew !== normalizedCurrent) return;
          if (operationInProgress.current || currentSignalRef.current) return;

          const now = Date.now();
          const scheduledTime = new Date(newSignal.scheduled_time).getTime();
          const timeDiff = scheduledTime - now;

          if (timeDiff <= 90000 && timeDiff > -60000) {
            console.log('📡 ✅ Executando sinal atualizado via realtime!');
            operationInProgress.current = true;
            setAnalyzing(false);
            await executeAdminSignal(newSignal);
            if (mounted.current) setWaitingForAdmin(false);
          }
        }
      })
      .subscribe((status) => {
        console.log(`📡 Status da subscription: ${status}`);
      });

    return () => {
      console.log('📡 Removendo subscription realtime...');
      supabase.removeChannel(channel);
    };
  }, [isAutomated, executeAdminSignal, scheduleAdminSignalExecution]);

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
      // CORREÇÃO: Agora busca sinais que serão executados no próximo minuto
      const adminSignal = await signalService.getPendingAdminSignal(selectedPair);

      if (adminSignal) {
        const scheduledTime = new Date(adminSignal.scheduled_time).getTime();
        const timeDiff = scheduledTime - now;

        console.log(`🔍 Found admin signal for ${adminSignal.pair}, scheduled in ${Math.round(timeDiff / 1000)}s`);

        // NOVA LÓGICA: Executa 1 minuto antes (entre 0 e 90 segundos antes da entrada)
        // Se falta entre 0 e 90 segundos, executa AGORA (usuário vê 1 min antes da entrada)
        if (timeDiff > 0 && timeDiff <= 90000) {
          console.log('⚡ Admin signal ready! Executing 1 min before entry...');
          await executeAdminSignal(adminSignal);
          if (mounted.current) setWaitingForAdmin(false);
          return;
        }

        // Se falta mais de 90s mas menos de 3 minutos, agenda a execução
        if (timeDiff > 90000 && timeDiff < 180000) {
          console.log('📅 Admin signal scheduled, waiting...');
          if (mounted.current) setWaitingForAdmin(true);
          scheduleAdminSignalExecution(adminSignal);
          return;
        }

        // Se já passou (até 60s), ainda tenta executar
        if (timeDiff <= 0 && timeDiff > -60000) {
          console.log('⚠️ Admin signal slightly past, executing now...');
          await executeAdminSignal(adminSignal);
          if (mounted.current) setWaitingForAdmin(false);
          return;
        }
      }

      // 2. Verificar se o sistema está habilitado para análise técnica
      // Se desativado, apenas sinais do admin são processados
      const isSystemActive = await systemService.isSystemEnabled();

      if (!isSystemActive) {
        console.log('System disabled - skipping technical analysis, only admin signals allowed');
        // Não gera sinais técnicos, apenas continua verificando sinais do admin
        attemptsRef.current++;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setError('Sistema em modo Admin. Aguardando sinal do administrador...');
          // Não reseta, continua buscando sinais do admin
        }
        return;
      }

      // 3. Análise Técnica Normal (só se o sistema estiver ativo)
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
          time: (() => {
            const next = new Date();
            next.setMinutes(next.getMinutes() + 1);
            next.setSeconds(0);
            next.setMilliseconds(0);
            return next.toISOString();
          })(),
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
          const entryTime = new Date(signal.time).getTime();
          const expiryTime = entryTime + (timeframe * 60 * 1000);

          // Inicia o monitoramento IMEDIATAMENTE para poder logar a entrada e saída
          // O useSignalResults vai gerenciar a espera pelos momentos certos
          const checkTime = 0;

          console.log(`Starting signal monitoring immediately for signal ${signal.id}`);

          signalCheckTimeout.current = setTimeout(() => {
            console.log(`Monitoring started for signal ${signal.id}`);
            checkSignalResult(signal, timeframe, handleSignalResult);
          }, checkTime);

          // Backup timeout para garantir que o sinal será finalizado se algo travar
          // Define para depois do tempo de expiração + margem de segurança
          const backupTime = Math.max(0, expiryTime - now + 10000); // 10s após o fim

          setTimeout(() => {
            if (mounted.current) {
              // Verifica se o sinal ainda está ativo (não foi finalizado)
              // Nota: Isso é um fallback de segurança
              console.log(`Backup watchdog check for signal ${signal.id}`);
            }
          }, backupTime);
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

  // Efeito para carregar e monitorar status do sistema
  useEffect(() => {
    const loadSystemStatus = async () => {
      const enabled = await systemService.isSystemEnabled();
      if (mounted.current) {
        setSystemEnabled(enabled);
      }
    };

    loadSystemStatus();

    // Subscribe para mudanças em tempo real
    const unsubscribe = systemService.subscribeToSystemSettings((enabled) => {
      if (mounted.current) {
        setSystemEnabled(enabled);
        console.log(`System status changed: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Polling rápido de backup para sinais admin (caso realtime falhe)
  useEffect(() => {
    if (!isAutomated) return;

    const checkAdminSignals = async () => {
      // Não verifica se já tem operação ou sinal ativo
      if (operationInProgress.current || currentSignalRef.current) return;
      
      try {
        const adminSignal = await signalService.getPendingAdminSignal(selectedPairRef.current);
        
        if (adminSignal && !executedAdminSignalsRef.current.has(adminSignal.id)) {
          const now = Date.now();
          const scheduledTime = new Date(adminSignal.scheduled_time).getTime();
          const timeDiff = scheduledTime - now;
          
          // Se está na janela de execução (entre -60s e +90s)
          if (timeDiff <= 90000 && timeDiff > -60000) {
            console.log('🔄 Polling: Encontrou sinal admin pendente, executando...');
            operationInProgress.current = true;
            setAnalyzing(false);
            await executeAdminSignal(adminSignal);
            if (mounted.current) setWaitingForAdmin(false);
          }
        }
      } catch (error) {
        console.error('Erro no polling de sinais admin:', error);
      }
    };

    // Verifica a cada 2 segundos como backup do realtime
    const pollInterval = setInterval(checkAdminSignals, 2000);
    
    // Verifica imediatamente também
    checkAdminSignals();

    return () => {
      clearInterval(pollInterval);
    };
  }, [isAutomated, executeAdminSignal]);

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
