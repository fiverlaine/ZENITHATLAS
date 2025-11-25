import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { fetchMarketData } from '../../services/cryptoApi';
import { analyzeMarket } from '../../utils/indicators';
import { Loader2, TrendingUp } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  selectedPair: string;
  timeframe: number;
}

export const UnifiedChart: React.FC<Props> = ({ selectedPair, timeframe }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [realtimePrice, setRealtimePrice] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const marketData = await fetchMarketData(selectedPair, timeframe);
      const analysis = analyzeMarket(Array.isArray(marketData) ? marketData : []);

      const marketDataArray = Array.isArray(marketData) ? marketData : [];

      const labels = marketDataArray.map((d: any) => {
        const date = new Date(d.time * 1000);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      });

      const prices = marketDataArray.map((d: any) => d.close);

      setChartData({
        labels,
        prices,
        rawPrices: prices,
        rsi: analysis.indicators.rsiValues,
        ema20: analysis.indicators.ema20,
        ema50: analysis.indicators.ema50,
        macd: analysis.indicators.macd
      });
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Erro ao carregar dados do gráfico');
    } finally {
      setLoading(false);
    }
  }, [selectedPair, timeframe]);

  // WebSocket para dados em tempo real (Binance)
  useEffect(() => {
    let symbol = selectedPair.replace('/', '').toLowerCase();
    // Mapeamento básico para pares comuns na Binance (USDT)
    if (symbol.endsWith('usd')) {
      symbol = symbol.replace('usd', 'usdt');
    }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);

        setRealtimePrice(price);

        // Atualiza o último ponto do gráfico em tempo real
        setChartData((prev: any) => {
          if (!prev || !prev.prices || prev.prices.length === 0) return prev;

          const newPrices = [...prev.prices];
          newPrices[newPrices.length - 1] = price;

          return {
            ...prev,
            prices: newPrices
          };
        });
      } catch (e) {
        console.error('Error parsing WS data:', e);
      }
    };

    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
    };

    return () => {
      ws.close();
    };
  }, [selectedPair]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Atualiza histórico a cada 10s

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    const handleFocus = () => {
      fetchData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-green-500 mx-auto mb-2" size={32} />
          <p className="text-gray-400">Carregando gráfico...</p>
        </div>
      </Card>
    );
  }

  if (error || !chartData) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error || 'Erro ao carregar dados'}</p>
        </div>
      </Card>
    );
  }

  // Gráfico unificado com preço, EMAs e RSI
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Preço',
        data: chartData.prices,
        borderColor: '#61F800', // Primary
        backgroundColor: 'rgba(97, 248, 0, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        yAxisID: 'y',
      },
      {
        label: 'EMA 20',
        data: chartData.ema20,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [5, 5],
        tension: 0.1,
        yAxisID: 'y',
      },
      {
        label: 'EMA 50',
        data: chartData.ema50,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        borderDash: [5, 5],
        tension: 0.1,
        yAxisID: 'y',
      },
      {
        label: 'RSI',
        data: chartData.rsi,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
        yAxisID: 'y1',
        hidden: false
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
          usePointStyle: true,
          padding: 10,
          font: {
            size: 10,
            family: 'Outfit'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 17, 17, 0.9)',
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(156, 163, 175)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        titleFont: { family: 'Outfit' },
        bodyFont: { family: 'Outfit' },
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.yAxisID === 'y1') {
                label += context.parsed.y.toFixed(2);
              } else {
                label += '$' + context.parsed.y.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          maxRotation: 0,
          autoSkipPadding: 10,
          font: {
            size: 10,
            family: 'Outfit'
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 10,
            family: 'Outfit'
          },
          callback: function (value: any) {
            return '$' + value.toLocaleString('pt-BR');
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgb(168, 85, 247)',
          font: {
            size: 10,
            family: 'Outfit'
          },
          callback: function (value: any) {
            return value;
          }
        }
      }
    }
  };

  // Valores atuais para display
  const currentPrice = realtimePrice || chartData.prices[chartData.prices.length - 1];
  const currentRSI = chartData.rsi[chartData.rsi.length - 1];
  const ema20 = chartData.ema20[chartData.ema20.length - 1];
  const ema50 = chartData.ema50[chartData.ema50.length - 1];
  const trend = ema20 > ema50 ? 'Alta' : 'Baixa';

  return (
    <Card className="bg-bg-card/50 border-white/5">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Análise de Mercado - {selectedPair}
          </h3>
          <p className="text-xs text-gray-400 mt-1">Atualização em tempo real</p>
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4">
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-400">Preço Atual</p>
            <p className="text-sm sm:text-lg font-bold text-primary">
              ${currentPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-400">RSI</p>
            <p className={`text-sm sm:text-lg font-bold ${currentRSI > 70 ? 'text-red-500' : currentRSI < 30 ? 'text-primary' : 'text-yellow-500'
              }`}>
              {currentRSI?.toFixed(1)}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-400">Tendência</p>
            <p className={`text-sm sm:text-lg font-bold ${trend === 'Alta' ? 'text-primary' : 'text-red-500'}`}>
              {trend}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[300px] sm:h-[350px] lg:h-[400px]">
        <Line data={data} options={options} />
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-800">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">EMA 20</p>
          <p className="text-xs sm:text-sm font-bold text-blue-400">
            ${ema20?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">EMA 50</p>
          <p className="text-xs sm:text-sm font-bold text-yellow-400">
            ${ema50?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">MACD</p>
          <p className="text-xs sm:text-sm font-bold text-purple-400">
            {chartData.macd?.MACD?.[chartData.macd.MACD.length - 1]?.toFixed(2) || '--'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Signal</p>
          <p className="text-xs sm:text-sm font-bold text-purple-400">
            {chartData.macd?.signal?.[chartData.macd.signal.length - 1]?.toFixed(2) || '--'}
          </p>
        </div>
      </div>
    </Card>
  );
};

