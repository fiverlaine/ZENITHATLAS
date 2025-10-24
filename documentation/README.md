# QuantumTrade - Plataforma de Estratégia Financeira

## Visão Geral

O QuantumTrade é uma aplicação web moderna desenvolvida em React/TypeScript para análise e trading de criptomoedas. A plataforma oferece ferramentas avançadas de análise técnica, geração de sinais de trading e gerenciamento de posições.

## Arquitetura do Projeto

### Tecnologias Principais
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Chart.js + React-Chartjs-2
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Indicadores Técnicos**: TechnicalIndicators

### Estrutura de Pastas

```
src/
├── components/           # Componentes React organizados por funcionalidade
│   ├── auth/            # Autenticação (Login, Termos, Privacidade)
│   ├── analytics/       # Componentes de análise e métricas
│   ├── charts/          # Gráficos especializados (MACD, RSI, etc.)
│   ├── layout/          # Layout da aplicação (Header, Footer)
│   ├── trading/         # Controles de trading
│   └── ui/              # Componentes de interface reutilizáveis
├── hooks/               # Custom hooks para lógica de negócio
├── services/            # Serviços para APIs e integrações
├── types/               # Definições de tipos TypeScript
└── utils/               # Utilitários e funções auxiliares
```

## Funcionalidades Principais

### 1. Sistema de Autenticação
- Login seguro via Supabase Auth
- Gerenciamento de sessão persistente
- Diálogos de termos e privacidade

### 2. Análise de Mercado
- **MarketAnalyzer**: Análise em tempo real do mercado
- **SignalAnalyzer**: Geração automática de sinais de compra/venda
- **PatternIndicator**: Detecção de padrões de trading

### 3. Indicadores Técnicos
- **RSI (Relative Strength Index)**
- **MACD (Moving Average Convergence Divergence)**
- **EMA (Exponential Moving Average)**
- **StochRSI (Stochastic RSI)**
- **ADX (Average Directional Index)**

### 4. Gráficos e Visualização
- **PriceChart**: Gráfico de preços com candlesticks
- **LiveChart**: Gráfico em tempo real
- **IndicatorsChart**: Visualização de indicadores técnicos
- **TradingViewChart**: Interface similar ao TradingView

### 5. Sistema de Trading
- **TradingControls**: Controles para seleção de pares e timeframes
- **TradingView**: Interface principal de trading
- **SignalHistory**: Histórico de sinais e performance

### 6. Analytics e Relatórios
- **Analytics**: Dashboard com métricas de performance
- **PerformanceMetrics**: Métricas detalhadas de trading
- **TradeHistory**: Histórico completo de trades

## Configuração do Banco de Dados

O projeto utiliza Supabase com as seguintes tabelas principais (baseado nas migrações):

### Tabelas Principais
- **users**: Dados dos usuários
- **trading_signals**: Sinais de trading gerados
- **trades**: Histórico de trades executados
- **user_settings**: Configurações personalizadas
- **analytics_data**: Dados para análise e relatórios

## Configuração do Ambiente

### 1. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_CRYPTO_API_KEY=sua_chave_da_api_de_cripto
```

### 2. Instalação e Execução
```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## Hooks Personalizados

### useAuth
Gerencia autenticação e sessão do usuário

### useTradeStore
Store principal para gerenciamento de estado de trading

### useSignalResults
Lógica para verificação de resultados de sinais

### useMarketData
Integração com APIs de dados de mercado

### useAnalytics
Processamento de dados analíticos

## Serviços

### authService
Gerenciamento de autenticação via Supabase

### cryptoApi
Integração com APIs de criptomoedas

### signalService
Geração e processamento de sinais de trading

### websocketService
Conexão em tempo real para dados de mercado

### analyticsService
Processamento de dados analíticos

## Padrões de Desenvolvimento

### 1. Componentes
- Componentes funcionais com hooks
- Props tipadas com TypeScript
- Separação clara de responsabilidades

### 2. Estado
- Zustand para estado global
- useState para estado local
- Custom hooks para lógica reutilizável

### 3. Styling
- Tailwind CSS para estilização
- Classes utilitárias
- Design responsivo mobile-first

### 4. Performance
- Memoização com useMemo e useCallback
- Lazy loading de componentes
- Otimização de re-renders

## Segurança

- Autenticação segura via Supabase
- Validação de dados no frontend e backend
- Rate limiting para APIs
- Sanitização de inputs

## Próximos Passos

1. Configurar variáveis de ambiente
2. Executar migrações do banco de dados
3. Configurar APIs de criptomoedas
4. Testar funcionalidades principais
5. Deploy em produção

## Contribuição

Para contribuir com o projeto:
1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Abra um Pull Request

## Licença

Este projeto está sob licença MIT.
