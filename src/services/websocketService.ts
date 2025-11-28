import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const subscribers: ((data: any) => void)[] = [];

// URL do WebSocket da API de Preços
const WS_URL = 'https://symbol-prices-api.mybroker.dev/symbol-prices';

export const connectWebSocket = (symbol: string) => {
  if (socket) {
    socket.disconnect();
  }

  // Conexão com socket.io passando os headers necessários
  socket = io(WS_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    extraHeaders: {
      'x-partner': 'vsbroker',
      'x-timestamp': Date.now().toString()
    }
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket Connected');

    // Formato do símbolo para subscrição: "slot:PAIR"
    // Ex: "default:BTCUSDT"
    const cleanPair = symbol.replace('/', '').toUpperCase();
    const subscriptionSymbol = `default:${cleanPair}`;

    console.log(`🔌 Subscribing to: ${subscriptionSymbol}`);
    socket?.emit('last-symbol-price', subscriptionSymbol);
  });

  socket.on('message', (payload: any) => {
    // O evento de atualização de preço é "symbol.price.update"
    if (payload?.event === 'symbol.price.update' && payload?.data) {
      const data = payload.data;

      // Normaliza os dados para o formato esperado pela aplicação
      const normalizedData = {
        p: data.closePrice, // Price
        t: data.time,       // Time
        s: data.pair        // Symbol
      };

      subscribers.forEach(callback => callback(normalizedData));
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket Disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('⚠️ WebSocket Connection Error:', error);
  });

  return () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };
};

export const subscribeToTrades = (callback: (data: any) => void) => {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };
};
