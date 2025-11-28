import { supabase } from './supabase';
import { Signal } from '../types/trading';
import { retry } from '../utils/retryUtils';

export const signalService = {
  async createSignal(signal: Omit<Signal, 'result' | 'profit_loss'> & {
    id?: string;
    martingaleStep?: number;
    martingaleMultiplier?: number;
    confluences?: string[];
    strategyName?: string;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate signal data before sending to database
      if (!signal.type || !signal.price || !signal.pair || !signal.timeframe || !signal.time) {
        throw new Error('Invalid signal data');
      }

      const signalData = {
        id: signal.id, // Use client-generated ID
        type: signal.type,
        price: signal.price,
        pair: signal.pair,
        confidence: signal.confidence,
        timeframe: signal.timeframe,
        user_id: user.id,
        martingale_step: signal.martingaleStep || 0,
        martingale_multiplier: signal.martingaleMultiplier || 1.0,
        time: signal.time,
        processing_status: 'pending',
        created_at: new Date().toISOString(),
        confluences: signal.confluences || [],
        strategy_name: signal.strategyName || ''
      };

      // Retry the operation up to 3 times with exponential backoff
      return await retry(async () => {
        // Check if signal already exists
        const { data: existingSignal, error: existingError } = await supabase
          .from('signals')
          .select()
          .eq('id', signal.id)
          .maybeSingle();

        if (existingError) {
          console.error('Error checking existing signal:', existingError);
          return null;
        }

        if (existingSignal) {
          console.warn('Signal already exists:', signal.id);
          return signal;
        }

        const { data, error } = await supabase
          .from('signals')
          .insert([signalData])
          .select()
          .maybeSingle();

        if (error) {
          console.error('Database error:', error);
          throw error; // This will trigger retry
        }

        if (!data) {
          throw new Error('No data returned from signal creation');
        }

        return {
          ...signal,
          id: data.id,
          time: data.time,
          martingaleStep: data.martingale_step,
          martingaleMultiplier: data.martingale_multiplier,
          confluences: data.confluences,
          strategyName: data.strategy_name
        };
      }, 3, 1000);
    } catch (error) {
      console.error('Error creating signal:', error);
      return null;
    }
  },

  async getPendingSignals(): Promise<Signal[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('user_id', user.id)
        .eq('processing_status', 'pending')
        .is('result', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending signals:', error);
        return [];
      }

      return (data || []).map(signal => ({
        id: signal.id,
        type: signal.type as 'buy' | 'sell',
        price: Number(signal.price) || 0,
        pair: signal.pair || '',
        confidence: Number(signal.confidence) || 0,
        result: signal.result as 'win' | 'loss' | undefined,
        profit_loss: Number(signal.profit_loss) || 0,
        time: signal.time || new Date().toISOString(),
        timeframe: Number(signal.timeframe) || 1,
        martingaleStep: Number(signal.martingale_step) || 0,
        martingaleMultiplier: Number(signal.martingale_multiplier) || 1.0,
        confluences: signal.confluences || [],
        strategyName: signal.strategy_name || ''
      }));
    } catch (error) {
      console.error('Error loading pending signals:', error);
      return [];
    }
  },

  async getAllSignals(): Promise<Signal[] | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('User not authenticated when fetching all signals');
        return null;
      }

      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all signals:', error);
        return null;
      }

      return data.map(signal => ({
        id: signal.id,
        type: signal.type as 'buy' | 'sell',
        price: Number(signal.price) || 0,
        pair: signal.pair || '',
        confidence: Number(signal.confidence) || 0,
        result: signal.result as 'win' | 'loss' | undefined,
        profit_loss: Number(signal.profit_loss) || 0,
        time: signal.time || new Date().toISOString(),
        timeframe: Number(signal.timeframe) || 1,
        martingaleStep: Number(signal.martingale_step) || 0,
        martingaleMultiplier: Number(signal.martingale_multiplier) || 1.0,
        confluences: signal.confluences || [],
        strategyName: signal.strategy_name || ''
      }));
    } catch (error) {
      console.error('Error fetching all signals:', error);
      return null;
    }
  },

  async getSignalById(signalId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('id', signalId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching signal:', error);
        return null;
      }

      if (data) {
        return {
          id: data.id,
          type: data.type as 'buy' | 'sell',
          price: Number(data.price) || 0,
          pair: data.pair || '',
          confidence: Number(data.confidence) || 0,
          result: data.result as 'win' | 'loss' | undefined,
          profit_loss: Number(data.profit_loss) || 0,
          time: data.time || new Date().toISOString(),
          timeframe: Number(data.timeframe) || 1,
          martingaleStep: Number(data.martingale_step) || 0,
          martingaleMultiplier: Number(data.martingale_multiplier) || 1.0,
          confluences: data.confluences || [],
          strategyName: data.strategy_name || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching signal:', error);
      return null;
    }
  },

  async updateSignalResult(
    signalId: string,
    result?: 'win' | 'loss',
    profitLoss?: number
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!signalId) {
        throw new Error('Invalid signal ID');
      }

      // Verify signal exists and hasn't been processed
      const { data: existingSignal, error: existingError } = await supabase
        .from('signals')
        .select('*')
        .eq('id', signalId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking signal:', existingError);
        return null;
      }

      if (!existingSignal) {
        console.error('Signal not found:', signalId);
        return null;
      }

      if (existingSignal.result) {
        console.warn('Signal already has result:', signalId);
        return existingSignal;
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
        processing_status: 'completed'
      };

      if (result) updateData.result = result;
      if (typeof profitLoss !== 'undefined') updateData.profit_loss = profitLoss;

      const { data: updatedSignal, error: updateError } = await supabase
        .from('signals')
        .update(updateData)
        .eq('id', signalId)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('Error updating signal:', updateError);
        return null;
      }

      return updatedSignal;
    } catch (error) {
      console.error('Error updating signal:', error);
      return null;
    }
  },

  async clearSignalHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { error } = await supabase
        .from('signals')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing signal history:', error);
      }
    } catch (error) {
      console.error('Error clearing signal history:', error);
    }
  },

  // Admin Methods
  async createAdminSignal(signal: { pair: string; type: 'buy' | 'sell'; scheduled_time: string; timeframe: number }) {
    try {
      const { data, error } = await supabase
        .from('admin_signals')
        .insert([{
          ...signal,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating admin signal:', error);
      return null;
    }
  },

  async getAdminSignals() {
    try {
      const { data, error } = await supabase
        .from('admin_signals')
        .select('*')
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching admin signals:', error);
      return [];
    }
  },

  async deleteAdminSignal(id: string) {
    try {
      const { error } = await supabase
        .from('admin_signals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting admin signal:', error);
      return false;
    }
  },

  normalizePair(pair: string) {
    if (!pair) return '';
    // Normaliza para formato padrão (ex: BTC/USD -> BTC/USDT para comparação)
    // Remove espaços e converte para uppercase
    let normalized = pair.toUpperCase().trim();
    // Se terminar com USD, converte para USDT para padronização de comparação
    if (normalized.endsWith('/USD')) {
      normalized = normalized.replace('/USD', '/USDT');
    }
    return normalized;
  },

  async getPendingAdminSignal(pair?: string) {
    try {
      const now = new Date();
      // CORREÇÃO: Busca sinais que serão executados no PRÓXIMO minuto (até 2 minutos no futuro)
      // Isso permite que o sinal seja exibido 1 minuto ANTES do horário agendado
      // Exemplo: Admin agenda 13:50, sistema busca às 13:49 e encontra, exibe o sinal com entrada 13:50
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000).toISOString();
      const threeMinutesFromNow = new Date(now.getTime() + 3 * 60 * 1000).toISOString();

      const { data: allSignals, error: fetchError } = await supabase
        .from('admin_signals')
        .select('*')
        .eq('status', 'pending')
        .gte('scheduled_time', oneMinuteAgo)
        .lte('scheduled_time', threeMinutesFromNow)
        .order('scheduled_time', { ascending: true });

      if (fetchError) throw fetchError;

      if (!allSignals || allSignals.length === 0) return null;

      // Filtra para encontrar sinais que:
      // 1. Estão agendados para o próximo minuto (para executar 1 min antes)
      // 2. Ou que já passaram mas ainda não foram executados (margem de 1 min)
      const nowMs = now.getTime();
      const validSignals = allSignals.filter(signal => {
        const scheduledMs = new Date(signal.scheduled_time).getTime();
        const timeDiff = scheduledMs - nowMs;
        // Válido se: entre -60s (passou até 1 min) até +180s (próximos 3 min)
        return timeDiff >= -60000 && timeDiff <= 180000;
      });

      if (validSignals.length === 0) return null;

      if (pair) {
        const normalizedTarget = this.normalizePair(pair);
        // Encontra o primeiro que combine (normalizado)
        const match = validSignals.find(s => this.normalizePair(s.pair) === normalizedTarget);
        return match || null;
      }

      return validSignals[0];
    } catch (error) {
      console.error('Error checking pending admin signal:', error);
      return null;
    }
  },

  async markAdminSignalExecuted(id: string) {
    try {
      const { error } = await supabase
        .from('admin_signals')
        .update({ status: 'executed' })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking admin signal executed:', error);
      return false;
    }
  }
};
