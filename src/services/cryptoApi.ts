import axios from 'axios';
import { marketDataCache } from './cacheService';

const BASE_URL = 'https://min-api.cryptocompare.com/data';
const API_KEY = 'da26d8c9f8c8e9b8b7c2858e3c30d9996e3c78f70c9a6d5938f893f239444cef';

// Configuração do axios com retry e timeout mais longos
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Aumentado para 15 segundos
  headers: {
    'Authorization': `Apikey ${API_KEY}`
  }
});

// Função de retry com backoff exponencial
const retryRequest = async (fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

export const fetchMarketData = async (symbol: string, timeframe: number) => {
  try {
    // Tentar obter do cache primeiro
    const cachedData = marketDataCache.get(symbol, timeframe);
    if (cachedData) {
      return cachedData;
    }

    const [base, quote] = symbol.split('/');

    if (!base || !quote) {
      throw new Error('Par de trading inválido');
    }

    // Função que faz a requisição real
    const makeRequest = async () => {
      const response = await api.get('/v2/histominute', {
        params: {
          fsym: base,
          tsym: quote,
          limit: 300, // Aumentado para suportar EMA 200
          aggregate: timeframe
        }
      });

      if (response.data.Response === 'Error') {
        throw new Error(response.data.Message || 'Erro ao buscar dados');
      }

      return response;
    };

    // Faz a requisição com retry
    const response = await retryRequest(makeRequest);

    const data = response.data?.Data?.Data;

    if (!data || !Array.isArray(data)) {
      throw new Error('Dados de mercado indisponíveis');
    }

    if (data.length === 0) {
      throw new Error('Sem dados disponíveis para o período solicitado');
    }

    const formattedData = data.map((candle, index) => {
      // Validação rigorosa dos dados
      const open = Number(candle.open);
      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);
      const volume = Number(candle.volumefrom);
      const time = Number(candle.time);

      if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(time)) {
        throw new Error(`Dados inválidos detectados no candle ${index + 1}`);
      }

      if (high < low) {
        throw new Error(`Preço máximo menor que mínimo no candle ${index + 1}`);
      }

      if (open <= 0 || close <= 0) {
        throw new Error(`Preços inválidos detectados no candle ${index + 1}`);
      }

      return {
        time,
        open,
        high,
        close,
        low,
        volume: isNaN(volume) ? 0 : volume // Volume pode ser 0
      };
    });

    // Armazenar no cache apenas se os dados forem válidos
    marketDataCache.set(symbol, timeframe, formattedData);

    return formattedData;
  } catch (error: any) {
    // Tratamento específico de erros
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tempo limite excedido. Tentando novamente...');
    }
    if (error.response?.status === 429) {
      throw new Error('Limite de requisições excedido. Aguarde um momento...');
    }
    if (error.response?.data?.Message) {
      throw new Error(`Erro da API: ${error.response.data.Message}`);
    }

    // Propaga o erro original se já for uma mensagem de erro personalizada
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Erro ao buscar dados do mercado. Tentando novamente...');
  }
};
