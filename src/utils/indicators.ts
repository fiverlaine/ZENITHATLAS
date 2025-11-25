import { RSI, EMA, MACD, BollingerBands, StochasticRSI, ADX, CCI, WilliamsR, MFI } from 'technicalindicators';

const safeCalculation = <T>(calculation: () => T, defaultValue: T): T => {
  try {
    return calculation();
  } catch (error) {
    console.error('Calculation error:', error);
    return defaultValue;
  }
};

// Calcula Pivot Points
const calculatePivotPoints = (high: number, low: number, close: number) => {
  if (isNaN(high) || isNaN(low) || isNaN(close)) {
    throw new Error('Valores inválidos para cálculo de Pivot Points');
  }

  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const r2 = pivot + (high - low);
  const s1 = 2 * pivot - high;
  const s2 = pivot - (high - low);

  return { pivot, r1, r2, s1, s2 };
};

// Encontra níveis de suporte e resistência
const findSupportResistanceLevels = (data: any[], lookback: number = 20) => {
  if (!data || data.length < lookback) {
    throw new Error('Dados insuficientes para análise de suporte/resistência');
  }

  const levels: { price: number; strength: number; type: 'support' | 'resistance' }[] = [];
  const priceRanges = new Map<string, number>();

  for (let i = data.length - lookback; i < data.length; i++) {
    if (!data[i] || isNaN(data[i].high) || isNaN(data[i].low)) {
      throw new Error('Dados inválidos para análise de suporte/resistência');
    }

    const high = Math.round(data[i].high * 100) / 100;
    const low = Math.round(data[i].low * 100) / 100;

    [high, low].forEach(price => {
      const key = price.toString();
      priceRanges.set(key, (priceRanges.get(key) || 0) + 1);
    });
  }

  priceRanges.forEach((count, priceStr) => {
    const price = parseFloat(priceStr);
    if (count >= 3) {
      const recentPrice = data[data.length - 1].close;
      const type = price > recentPrice ? 'resistance' : 'support';
      levels.push({
        price,
        strength: count,
        type
      });
    }
  });

  return levels.sort((a, b) => b.strength - a.strength).slice(0, 5);
};

export const calculateRSI = (prices: number[], period: number = 14) => {
  if (!prices || prices.length < period) {
    throw new Error('Dados insuficientes para cálculo do RSI');
  }

  return safeCalculation(
    () => RSI.calculate({ values: prices, period }),
    Array(prices.length).fill(50)
  );
};

export const calculateEMA = (prices: number[], period: number) => {
  if (!prices || prices.length < period) {
    throw new Error('Dados insuficientes para cálculo da EMA');
  }

  return safeCalculation(
    () => EMA.calculate({ values: prices, period }),
    Array(prices.length).fill(prices[prices.length - 1])
  );
};

export const calculateMACD = (prices: number[]) => {
  if (!prices || prices.length < 26) {
    throw new Error('Dados insuficientes para cálculo do MACD');
  }

  return safeCalculation(
    () => MACD.calculate({
      values: prices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    }),
    Array(prices.length).fill({ MACD: 0, signal: 0, histogram: 0 })
  );
};

export const calculateBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2) => {
  if (!prices || prices.length < period) {
    throw new Error('Dados insuficientes para cálculo das Bandas de Bollinger');
  }

  return safeCalculation(
    () => BollingerBands.calculate({ values: prices, period, stdDev }),
    Array(prices.length).fill({ middle: 0, upper: 0, lower: 0 })
  );
};

export const calculateStochasticRSI = (prices: number[], rsiPeriod: number = 14, stochasticPeriod: number = 14, kPeriod: number = 3, dPeriod: number = 3) => {
  if (!prices || prices.length < rsiPeriod + stochasticPeriod) {
    throw new Error('Dados insuficientes para cálculo do Stochastic RSI');
  }

  return safeCalculation(
    () => StochasticRSI.calculate({ values: prices, rsiPeriod, stochasticPeriod, kPeriod, dPeriod }),
    Array(prices.length).fill({ k: 0, d: 0, stochRSI: 0 })
  );
};

export const calculateADX = (high: number[], low: number[], close: number[], period: number = 14) => {
  if (!high || !low || !close || high.length < period) {
    throw new Error('Dados insuficientes para cálculo do ADX');
  }

  return safeCalculation(
    () => ADX.calculate({ high, low, close, period }),
    Array(high.length).fill({ adx: 0, pdi: 0, mdi: 0 })
  );
};

export const calculateCCI = (high: number[], low: number[], close: number[], period: number = 20) => {
  if (!high || !low || !close || high.length < period) {
    throw new Error('Dados insuficientes para cálculo do CCI');
  }

  return safeCalculation(
    () => CCI.calculate({ high, low, close, period }),
    Array(high.length).fill(0)
  );
};

export const calculateWilliamsR = (high: number[], low: number[], close: number[], period: number = 14) => {
  if (!high || !low || !close || high.length < period) {
    throw new Error('Dados insuficientes para cálculo do Williams %R');
  }

  return safeCalculation(
    () => WilliamsR.calculate({ high, low, close, period }),
    Array(high.length).fill(-50)
  );
};

export const calculateMFI = (high: number[], low: number[], close: number[], volume: number[], period: number = 14) => {
  if (!high || !low || !close || !volume || high.length < period) {
    throw new Error('Dados insuficientes para cálculo do MFI');
  }

  return safeCalculation(
    () => MFI.calculate({ high, low, close, volume, period }),
    Array(high.length).fill(50)
  );
};

export const analyzeMarket = (data: any[], strategy: string = 'protocolo_v4') => {
  if (!data || !Array.isArray(data)) {
    throw new Error('Dados inválidos para análise');
  }

  if (data.length < 50) { // Aumentado para garantir dados suficientes para EMA 50/100
    throw new Error('Dados insuficientes para análise (mínimo 50 períodos)');
  }

  try {
    // Validar e extrair preços
    const prices = data.map((candle, index) => {
      const close = Number(candle.close);
      if (isNaN(close) || close <= 0) {
        throw new Error(`Preço de fechamento inválido detectado no candle ${index + 1}`);
      }
      return close;
    });

    const highs = data.map((candle, index) => {
      const high = Number(candle.high);
      if (isNaN(high) || high <= 0) {
        throw new Error(`Preço máximo inválido detectado no candle ${index + 1}`);
      }
      return high;
    });

    const lows = data.map((candle, index) => {
      const low = Number(candle.low);
      if (isNaN(low) || low <= 0) {
        throw new Error(`Preço mínimo inválido detectado no candle ${index + 1}`);
      }
      return low;
    });

    const volumes = data.map((candle, index) => {
      const vol = Number(candle.volume);
      return isNaN(vol) ? 0 : vol;
    });

    const lastCandle = data[data.length - 1];
    if (!lastCandle) {
      throw new Error('Último candle não encontrado');
    }

    const pivotPoints = calculatePivotPoints(
      lastCandle.high,
      lastCandle.low,
      lastCandle.close
    );

    const supportResistanceLevels = findSupportResistanceLevels(data);

    // Indicadores comuns
    const rsi = calculateRSI(prices);
    const ema9 = calculateEMA(prices, 9);
    const ema20 = calculateEMA(prices, 20);
    const ema21 = calculateEMA(prices, 21);
    const ema50 = calculateEMA(prices, 50);

    // EMA 100 e 200 requerem mais dados
    const ema100 = prices.length >= 100 ? calculateEMA(prices, 100) : Array(prices.length).fill(prices[prices.length - 1]);
    const ema200 = prices.length >= 200 ? calculateEMA(prices, 200) : Array(prices.length).fill(prices[prices.length - 1]);

    const macd = calculateMACD(prices);
    const bb = calculateBollingerBands(prices);
    const stochRsi = calculateStochasticRSI(prices);
    const adx = calculateADX(highs, lows, prices);
    const cci = calculateCCI(highs, lows, prices);
    const williamsR = calculateWilliamsR(highs, lows, prices);
    const mfi = calculateMFI(highs, lows, prices, volumes);

    const lastPrice = prices[prices.length - 1];
    const lastRSI = rsi[rsi.length - 1];
    const lastEMA9 = ema9[ema9.length - 1];
    const lastEMA20 = ema20[ema20.length - 1];
    const lastEMA21 = ema21[ema21.length - 1];
    const lastEMA50 = ema50[ema50.length - 1];
    const lastEMA100 = ema100[ema100.length - 1];
    const lastEMA200 = ema200[ema200.length - 1];
    const lastMACD = macd[macd.length - 1];
    const lastBB = bb[bb.length - 1];
    const lastStochRSI = stochRsi[stochRsi.length - 1];
    const lastADX = adx[adx.length - 1];
    const lastCCI = cci[cci.length - 1];
    const lastWilliamsR = williamsR[williamsR.length - 1];
    const lastMFI = mfi[mfi.length - 1];

    if (isNaN(lastPrice)) {
      throw new Error('Valores inválidos nos indicadores');
    }

    const signals: string[] = [];
    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    let confidence = 50;

    // Lógica das Estratégias
    switch (strategy) {
      case 'momentum_alpha':
        // Estratégia 2: Momentum Alpha (MACD + RSI + ADX)
        // Compra: MACD > Signal + RSI > 50 + ADX > 20 + Histograma Positivo
        if (lastMACD.MACD > lastMACD.signal && lastRSI > 50 && lastADX.adx > 20 && lastMACD.histogram > 0) {
          signals.push('MACD Cruzamento Alta + RSI Bullish + Momentum Forte');
          confidence = 85;
          direction = 'up';
        }
        // Venda: MACD < Signal + RSI < 50 + ADX > 20 + Histograma Negativo
        else if (lastMACD.MACD < lastMACD.signal && lastRSI < 50 && lastADX.adx > 20 && lastMACD.histogram < 0) {
          signals.push('MACD Cruzamento Baixa + RSI Bearish + Momentum Forte');
          confidence = 85;
          direction = 'down';
        }
        break;

      case 'trend_surfer':
        // Estratégia 3: Trend Surfer (EMA Cross + Trend Filter + ADX)
        // Compra: EMA9 > EMA21 + Preço > EMA200 + ADX > 25
        if (lastEMA9 > lastEMA21 && lastPrice > lastEMA200 && lastADX.adx > 25) {
          signals.push('Cruzamento EMA9/21 Alta + Tendência Primária Alta + ADX Forte');
          confidence = 90;
          direction = 'up';
        }
        // Venda: EMA9 < EMA21 + Preço < EMA200 + ADX > 25
        else if (lastEMA9 < lastEMA21 && lastPrice < lastEMA200 && lastADX.adx > 25) {
          signals.push('Cruzamento EMA9/21 Baixa + Tendência Primária Baixa + ADX Forte');
          confidence = 90;
          direction = 'down';
        }
        break;

      case 'cci_reversal':
        // Estratégia 4: CCI Reversal
        // Compra: CCI < -100 (Oversold) e cruzando para cima
        if (lastCCI < -100 && cci[cci.length - 2] < lastCCI) {
          signals.push('CCI Oversold Reversal');
          confidence = 80;
          direction = 'up';
        }
        // Venda: CCI > 100 (Overbought) e cruzando para baixo
        else if (lastCCI > 100 && cci[cci.length - 2] > lastCCI) {
          signals.push('CCI Overbought Reversal');
          confidence = 80;
          direction = 'down';
        }
        break;

      case 'williams_r':
        // Estratégia 5: Williams %R
        // Compra: %R < -80 (Oversold) e começando a subir
        if (lastWilliamsR < -80 && lastWilliamsR > williamsR[williamsR.length - 2]) {
          signals.push('Williams %R Oversold Reversal');
          confidence = 82;
          direction = 'up';
        }
        // Venda: %R > -20 (Overbought) e começando a cair
        else if (lastWilliamsR > -20 && lastWilliamsR < williamsR[williamsR.length - 2]) {
          signals.push('Williams %R Overbought Reversal');
          confidence = 82;
          direction = 'down';
        }
        break;

      case 'mfi_reversal':
        // Estratégia 6: MFI Reversal (Money Flow Index)
        // Compra: MFI < 20 (Oversold)
        if (lastMFI < 20) {
          signals.push('MFI Oversold (Fluxo de dinheiro entrando)');
          confidence = 85;
          direction = 'up';
        }
        // Venda: MFI > 80 (Overbought)
        else if (lastMFI > 80) {
          signals.push('MFI Overbought (Fluxo de dinheiro saindo)');
          confidence = 85;
          direction = 'down';
        }
        break;

      case 'protocolo_v4':
      default:
        // Estratégia 1: Protocolo V4 (Mean Reversion + Trend Filter)
        // Compra: Preço toca banda inferior + RSI < 30 + StochRSI < 20 + Preço > EMA200 (Pullback na tendência de alta)
        if (lastPrice <= lastBB.lower && lastRSI < 30 && lastStochRSI.k < 20 && lastPrice > lastEMA200) {
          signals.push('Reversão em Suporte (BB Inferior) + Sobrevenda Extrema + Tendência Primária Alta');
          confidence = 90;
          direction = 'up';
        }
        // Venda: Preço toca banda superior + RSI > 70 + StochRSI > 80 + Preço < EMA200 (Pullback na tendência de baixa)
        else if (lastPrice >= lastBB.upper && lastRSI > 70 && lastStochRSI.k > 80 && lastPrice < lastEMA200) {
          signals.push('Reversão em Resistência (BB Superior) + Sobrecompra Extrema + Tendência Primária Baixa');
          confidence = 90;
          direction = 'down';
        }
        // Condições secundárias (menos confiança, mas ainda com filtro de tendência)
        else if (lastPrice <= lastBB.lower && lastRSI < 40 && lastPrice > lastEMA100) {
          signals.push('Toque Banda Inferior + RSI Baixo + Tendência Média Alta');
          confidence = 70;
          direction = 'up';
        } else if (lastPrice >= lastBB.upper && lastRSI > 60 && lastPrice < lastEMA100) {
          signals.push('Toque Banda Superior + RSI Alto + Tendência Média Baixa');
          confidence = 70;
          direction = 'down';
        }
        break;
    }

    // Análise de Suporte e Resistência (Reforço)
    const nearestSupport = supportResistanceLevels
      .filter(level => level.type === 'support' && level.price < lastPrice)
      .sort((a, b) => b.price - a.price)[0];

    const nearestResistance = supportResistanceLevels
      .filter(level => level.type === 'resistance' && level.price > lastPrice)
      .sort((a, b) => a.price - b.price)[0];

    if (nearestSupport) {
      const distanceToSupport = ((lastPrice - nearestSupport.price) / lastPrice) * 100;
      if (distanceToSupport < 0.5 && direction === 'up') {
        signals.push(`Confirmação: Próximo ao suporte (${nearestSupport.price.toFixed(2)})`);
        confidence += 5;
      }
    }

    if (nearestResistance) {
      const distanceToResistance = ((nearestResistance.price - lastPrice) / lastPrice) * 100;
      if (distanceToResistance < 0.5 && direction === 'down') {
        signals.push(`Confirmação: Próximo à resistência (${nearestResistance.price.toFixed(2)})`);
        confidence += 5;
      }
    }

    return {
      confidence: Math.min(confidence, 99),
      signals,
      direction,
      indicators: {
        rsiValues: rsi,
        macd: macd,
        ema20,
        ema50,
        ema100,
        ema200,
        bollingerBands: bb,
        stochRsi,
        adx
      },
      levels: {
        pivotPoints,
        supportResistance: supportResistanceLevels
      }
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error instanceof Error ? error : new Error('Falha na análise técnica');
  }
};
