import { User, Session } from '@supabase/supabase-js';

export interface Signal {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  time: string;
  pair: string;
  confidence: number;
  result?: 'win' | 'loss';
  profit_loss?: number;
  timeframe: number;
  confluences?: string[];
  strategyName?: string;
}

export interface Position extends Signal {
  stopLoss: number;
  status: 'open' | 'closed' | 'stopped';
}

export interface CandlePattern {
  type: 'doji' | 'engulfing' | 'hammer';
  strength: 'weak' | 'medium' | 'strong';
  description: string;
}

export interface TradingSettings {
  balance: number;
  entryPercentage: number;
  stopLoss: number;
  profile: 'conservative' | 'moderate' | 'aggressive' | 'custom';
}

export type View = 'signals' | 'trading' | 'analytics' | 'learn';
