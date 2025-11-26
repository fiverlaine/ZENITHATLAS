import axios from 'axios';

const SYMBOL_PRICES_API = 'https://symbol-prices-api.mybroker.dev';
const API_KEY = 'Sl293kk22ss8';
const PARTNER = 'mybroker';

const api = axios.create({
    baseURL: SYMBOL_PRICES_API,
    timeout: 10000,
    headers: {
        'api-key': API_KEY,
        'x-partner': PARTNER,
        'Content-Type': 'application/json'
    }
});

// Interceptor para adicionar x-timestamp atualizado em cada requisição
api.interceptors.request.use(config => {
    config.headers['x-timestamp'] = Date.now().toString();
    return config;
});

export interface BrokerCandle {
    volume: number;
    openPrice: number;
    closePrice: number;
    highPrice: number;
    lowPrice: number;
    time: number;
}

export const brokerApi = {
    /**
     * Busca o preço em um momento específico
     * @param pair Par de moedas (ex: BTCUSDT, ADA/USD)
     * @param timestamp Timestamp do momento (em ms)
     */
    async getPriceAtTime(pair: string, timestamp: number): Promise<number | null> {
        try {
            // Normaliza o par: remove '/' e garante que USD vire USDT se necessário
            let cleanPair = pair.replace('/', '');
            if (cleanPair.endsWith('USD') && !cleanPair.endsWith('USDT')) {
                cleanPair = cleanPair.replace('USD', 'USDT');
            }

            console.log(`Fetching price for ${cleanPair} at ${new Date(timestamp).toISOString()}`);

            const response = await api.get('/symbol-price/last', {
                params: {
                    pair: cleanPair,
                    slot: 'default',
                    limitTime: timestamp
                }
            });

            const data = response.data;

            // Se retornou "OK", significa que está no futuro
            if (data === 'OK' || typeof data === 'string') {
                console.warn(`Price not available yet (time in future): ${new Date(timestamp).toISOString()}`);
                return null;
            }

            // Retorna o closePrice (preço mais recente até aquele momento)
            if (data && typeof data === 'object' && 'closePrice' in data) {
                console.log(`Price at ${new Date(timestamp).toISOString()}: ${data.closePrice}`);
                return data.closePrice;
            }

            console.warn('Invalid response structure from Broker API:', data);
            return null;
        } catch (error: any) {
            console.error('Erro ao buscar preço na Broker API:', error);

            if (error.response?.status === 404 || error.response?.status === 400) {
                console.warn(`Price not found for ${pair} at ${new Date(timestamp).toISOString()}`);
                return null;
            }

            throw error;
        }
    },

    /**
     * Busca os preços de entrada e saída para verificação do sinal
     * @param pair Par de moedas (ex: BTCUSDT, ADA/USD)
     * @param entryTime Timestamp da entrada (em ms)
     * @param timeframe Timeframe em minutos
     */
    async getEntryAndExitPrices(pair: string, entryTime: number, timeframe: number): Promise<{ entryPrice: number; exitPrice: number } | null> {
        try {
            const cleanPair = pair.replace('/', '');
            const exitTime = entryTime + (timeframe * 60 * 1000);

            console.log(`Fetching entry and exit prices for ${cleanPair}`);
            console.log(`Entry: ${new Date(entryTime).toISOString()}, Exit: ${new Date(exitTime).toISOString()}`);

            // Busca o preço de entrada
            const entryPrice = await this.getPriceAtTime(cleanPair, entryTime);

            if (!entryPrice) {
                console.warn('Entry price not available');
                return null;
            }

            // Busca o preço de saída
            const exitPrice = await this.getPriceAtTime(cleanPair, exitTime);

            if (!exitPrice) {
                console.warn('Exit price not available');
                return null;
            }

            console.log(`Entry: ${entryPrice}, Exit: ${exitPrice}, Diff: ${exitPrice - entryPrice}`);

            return { entryPrice, exitPrice };
        } catch (error) {
            console.error('Erro ao buscar preços de entrada/saída:', error);
            throw error;
        }
    },
    /**
     * Busca o candle específico para verificação do sinal
     * @param pair Par de moedas (ex: BTCUSDT, ADA/USD)
     * @param startTime Timestamp inicial do candle (em ms)
     * @param timeframe Timeframe em minutos
     */
    async getCandle(pair: string, startTime: number, timeframe: number): Promise<BrokerCandle | null> {
        try {
            // Normaliza o par (remove / se houver)
            const cleanPair = pair.replace('/', '');

            // Calcula o limitTime (quando o candle fecharia = startTime + timeframe)
            const limitTime = startTime + (timeframe * 60 * 1000);

            console.log(`Fetching candle for ${cleanPair} at ${new Date(startTime).toISOString()}, closes at ${new Date(limitTime).toISOString()}`);

            // Usa /symbol-price/last para buscar o preço no momento do fechamento
            const response = await api.get('/symbol-price/last', {
                params: {
                    pair: cleanPair,
                    slot: 'default',
                    limitTime: limitTime
                }
            });

            const data = response.data;

            // Se retornou "OK", significa que o limitTime está no futuro
            if (data === 'OK' || typeof data === 'string') {
                console.warn(`Candle not available yet (limitTime in future): ${new Date(limitTime).toISOString()}`);
                return null;
            }

            // Verifica se a resposta tem os campos necessários
            if (data && typeof data === 'object' && 'openPrice' in data && 'closePrice' in data) {
                const candle: BrokerCandle = {
                    openPrice: data.openPrice,
                    closePrice: data.closePrice,
                    highPrice: data.highPrice,
                    lowPrice: data.lowPrice,
                    volume: data.volume || 0,
                    time: data.time || limitTime
                };

                console.log(`Candle fetched: Open=${candle.openPrice}, Close=${candle.closePrice}`);
                return candle;
            }

            console.warn('Invalid response structure from Broker API:', data);
            return null;
        } catch (error: any) {
            console.error('Erro ao buscar candle na Broker API:', error);

            // Se for erro 404 ou similar, retorna null ao invés de throw
            if (error.response?.status === 404 || error.response?.status === 400) {
                console.warn(`Candle not found for ${pair} at ${new Date(startTime).toISOString()}`);
                return null;
            }

            throw error;
        }
    }
};
