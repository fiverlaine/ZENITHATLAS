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

export interface AnalysisResult {
  confidence: number;
  signals: string[]; // Lista de confluências (ex: "RSI Oversold", "MACD Bullish")
  direction: 'up' | 'down' | 'neutral';
  strategyName: string;
  indicators: any;
  levels: any;
}

export const analyzeMarket = (data: any[], strategyId: number = 1): AnalysisResult => {
  if (!data || !Array.isArray(data)) {
    throw new Error('Dados inválidos para análise');
  }

  if (data.length < 50) {
    throw new Error('Dados insuficientes para análise (mínimo 50 períodos)');
  }

  try {
    // Extração de dados
    const prices = data.map(c => Number(c.close));
    const highs = data.map(c => Number(c.high));
    const lows = data.map(c => Number(c.low));
    const volumes = data.map(c => Number(c.volume));

    const lastCandle = data[data.length - 1];
    const lastPrice = prices[prices.length - 1];

    // Cálculos de Indicadores
    const rsi = calculateRSI(prices);
    const bb = calculateBollingerBands(prices);
    const macd = calculateMACD(prices);
    const ema20 = calculateEMA(prices, 20);
    const ema50 = calculateEMA(prices, 50);
    const ema200 = prices.length >= 200 ? calculateEMA(prices, 200) : Array(prices.length).fill(prices[prices.length - 1]);
    const stochRsi = calculateStochasticRSI(prices);
    const adx = calculateADX(highs, lows, prices);
    const mfi = calculateMFI(highs, lows, prices, volumes);

    // Valores atuais
    const lastRSI = rsi[rsi.length - 1];
    const lastBB = bb[bb.length - 1];
    const lastMACD = macd[macd.length - 1];
    const lastEMA200 = ema200[ema200.length - 1];
    const lastStoch = stochRsi[stochRsi.length - 1];
    const lastADX = adx[adx.length - 1];
    const lastMFI = mfi[mfi.length - 1];

    let direction: 'up' | 'down' | 'neutral' = 'neutral';

    // --- Definição das Confluências ---
    const buySignals: string[] = [];
    const sellSignals: string[] = [];

    // 1. RSI (Reversal)
    const rsiBuy = lastRSI < 35;
    const rsiSell = lastRSI > 65;
    if (rsiBuy) buySignals.push(`RSI em Sobrevenda (${lastRSI.toFixed(2)})`);
    if (rsiSell) sellSignals.push(`RSI em Sobrecompra (${lastRSI.toFixed(2)})`);

    // 2. Bollinger Bands (Reversal)
    // Relaxando levemente a condição para "próximo da banda" (0.1%)
    const bbLowerThreshold = lastBB.lower * 1.001;
    const bbUpperThreshold = lastBB.upper * 0.999;
    const bbBuy = lastPrice <= bbLowerThreshold;
    const bbSell = lastPrice >= bbUpperThreshold;
    if (bbBuy) buySignals.push('Preço próximo/tocou Banda Inferior');
    if (bbSell) sellSignals.push('Preço próximo/tocou Banda Superior');

    // 3. MACD (Momentum)
    const macdBuy = lastMACD.histogram > 0 && lastMACD.MACD > lastMACD.signal;
    const macdSell = lastMACD.histogram < 0 && lastMACD.MACD < lastMACD.signal;
    if (macdBuy) buySignals.push('MACD Cruzamento Bullish');
    if (macdSell) sellSignals.push('MACD Cruzamento Bearish');

    // 4. EMA Trend (Trend Following)
    const trendBuy = lastPrice > lastEMA200;
    const trendSell = lastPrice < lastEMA200;
    if (trendBuy) buySignals.push('Tendência de Alta (Acima EMA200)');
    if (trendSell) sellSignals.push('Tendência de Baixa (Abaixo EMA200)');

    // 4.1 EMA Short Term Trend
    const shortTrendBuy = lastPrice > lastEMA200 && lastPrice > ema20[ema20.length - 1];
    const shortTrendSell = lastPrice < lastEMA200 && lastPrice < ema20[ema20.length - 1];
    if (shortTrendBuy) buySignals.push('Preço acima da EMA20');
    if (shortTrendSell) sellSignals.push('Preço abaixo da EMA20');

    // 4.2 EMA Crossover (Golden/Death Cross)
    const emaCrossBuy = ema20[ema20.length - 1] > ema50[ema50.length - 1];
    const emaCrossSell = ema20[ema20.length - 1] < ema50[ema50.length - 1];
    if (emaCrossBuy) buySignals.push('Cruzamento EMA 20/50 (Alta)');
    if (emaCrossSell) sellSignals.push('Cruzamento EMA 20/50 (Baixa)');

    // 5. Stochastic RSI (Momentum)
    const stochBuy = lastStoch.k < 20;
    const stochSell = lastStoch.k > 80;
    if (stochBuy) buySignals.push(`StochRSI Sobrevendido (${lastStoch.k.toFixed(2)})`);
    if (stochSell) buySignals.push(`StochRSI Sobrecomprado (${lastStoch.k.toFixed(2)})`);

    // 6. ADX (Trend Strength)
    const adxStrong = lastADX.adx > 20;
    if (adxStrong) {
      // ADX reforça a tendência atual
      if (trendBuy) buySignals.push(`Tendência Forte (ADX ${lastADX.adx.toFixed(2)})`);
      if (trendSell) sellSignals.push(`Tendência Forte (ADX ${lastADX.adx.toFixed(2)})`);
    }

    // 7. MFI (Volume Flow)
    const mfiBuy = lastMFI < 20;
    const mfiSell = lastMFI > 80;
    if (mfiBuy) buySignals.push(`MFI Sobrevendido (${lastMFI.toFixed(2)})`);
    if (mfiSell) sellSignals.push(`MFI Sobrecomprado (${lastMFI.toFixed(2)})`);


    // --- Lógica da Estratégia Selecionada ---

    let requiredConfluences = 0;
    let strategyName = '';

    // Define o número de confluências necessárias baseado na estratégia
    switch (strategyId) {
      case 1:
        requiredConfluences = 2;
        strategyName = 'Estratégia 1 (2 Confluências)';
        break;
      case 2:
        requiredConfluences = 3;
        strategyName = 'Estratégia 2 (3 Confluências)';
        break;
      case 3:
        requiredConfluences = 4;
        strategyName = 'Estratégia 3 (4 Confluências)';
        break;
      case 4:
        requiredConfluences = 5;
        strategyName = 'Estratégia 4 (5 Confluências)';
        break;
      case 5:
        requiredConfluences = 6;
        strategyName = 'Estratégia 5 (6 Confluências)';
        break;
      case 6:
        requiredConfluences = 7;
        strategyName = 'Estratégia 6 (7 Confluências)';
        break;
      default:
        requiredConfluences = 2;
        strategyName = 'Estratégia Padrão';
    }

    // Verifica se atingiu o número necessário de confluências
    let activeConfluences: string[] = [];

    if (buySignals.length >= requiredConfluences) {
      direction = 'up';
      activeConfluences = buySignals;
    } else if (sellSignals.length >= requiredConfluences) {
      direction = 'down';
      activeConfluences = sellSignals;
    }

    // Cálculo de Confiança
    let confidence = 0;
    if (direction !== 'neutral') {
      // Base: (Confluências Encontradas / Necessárias) * 100
      // Ex: 3 encontradas / 2 necessárias = 150% -> cap em 99%
      const count = direction === 'up' ? buySignals.length : sellSignals.length;
      confidence = Math.min((count / requiredConfluences) * 100, 99);

      // Garante que se atingiu o mínimo, a confiança é pelo menos 80%
      if (confidence < 80) confidence = 80;
    }

    console.log(`📊 Análise: ${strategyName} | Req: ${requiredConfluences} | Buy: ${buySignals.length} | Sell: ${sellSignals.length} | Conf: ${confidence.toFixed(1)}%`);

    return {
      confidence,
      signals: activeConfluences, // Retorna a lista de confluências ativas
      direction,
      strategyName,
      indicators: {
        rsiValues: rsi,
        macd: macd,
        ema20,
        ema50,
        ema200,
        bollingerBands: bb,
        stochRsi,
        adx,
        mfi
      },
      levels: {
        pivotPoints: calculatePivotPoints(lastCandle.high, lastCandle.low, lastCandle.close),
        supportResistance: findSupportResistanceLevels(data)
      }
    };

  } catch (error) {
    console.error('Analysis error:', error);
    throw error instanceof Error ? error : new Error('Falha na análise técnica');
  }
};
