# QuantumTrade - Plataforma de Estratégia Financeira

## ⚡ VERSÃO 2.3 - Navegação Mobile Redesenhada

> **NOVIDADE**: Menu bottom mobile futurístico com navegação intuitiva entre Início, Relatório e Histórico. Veja a documentação completa em [NAVIGATION_UPDATE.md](./NAVIGATION_UPDATE.md)

> **VERSÃO 2.0**: O QuantumTrade foi completamente redesenhado com foco em simplicidade e facilidade de uso. Veja a documentação em [NEW_DESIGN.md](./NEW_DESIGN.md)

## Visão Geral

O QuantumTrade é uma aplicação web moderna desenvolvida em React/TypeScript para análise e trading de criptomoedas. A plataforma oferece uma **interface simplificada e intuitiva** com ferramentas avançadas de análise técnica, geração automática de sinais e gerenciamento inteligente de operações.

## Arquitetura do Projeto

### Tecnologias Principais
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Chart.js + React-Chartjs-2
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Indicadores Técnicos**: TechnicalIndicators

### Estrutura de Pastas (Versão 2.0)

```
src/
├── components/           # Componentes React organizados por funcionalidade
│   ├── Dashboard.tsx    # ⭐ Componente principal unificado
│   ├── dashboard/       # ⭐ Novos componentes do dashboard
│   │   ├── QuickActions.tsx      # Ações rápidas (Iniciar/Parar/Config)
│   │   ├── SimpleStats.tsx       # Métricas essenciais (4 cards)
│   │   ├── ActiveSignal.tsx      # Operação ativa em tempo real
│   │   └── RecentSignals.tsx     # Histórico simplificado
│   ├── auth/            # Autenticação (Login, Termos, Privacidade)
│   ├── analytics/       # Componentes de análise detalhada
│   ├── charts/          # Gráficos especializados
│   ├── layout/          # Layout da aplicação
│   │   ├── SimpleHeader.tsx  # ⭐ Header simplificado
│   │   └── Footer.tsx
│   ├── trading/         # Controles de trading (legado)
│   └── ui/              # Componentes de interface reutilizáveis
├── hooks/               # Custom hooks para lógica de negócio
├── services/            # Serviços para APIs e integrações
├── types/               # Definições de tipos TypeScript
└── utils/               # Utilitários e funções auxiliares
```

⭐ = Novos componentes da versão 2.0

## 🎯 Funcionalidades Principais (Versão 2.0)

### 1. Dashboard Unificado
- **Interface única** que centraliza todas as funcionalidades
- **Cards de métricas** com estatísticas em tempo real
- **Ações rápidas** com botões grandes e intuitivos
- **Visualização de operação ativa** com countdown e P&L
- **Histórico recente** de operações finalizadas

### 2. Sistema de Automação Inteligente
- **Ativação com 1 clique** - Sistema inicia/para facilmente
- **Geração automática de sinais** baseada em análise técnica
- **Monitoramento contínuo** do mercado
- **Feedback visual** de estado (ativo/inativo)
- **Proteção** contra ativação com operação em andamento

### 3. Operação Ativa em Tempo Real
- **Visualização clara** da operação em andamento
- **Countdown** até finalização
- **Cálculo de P&L** em tempo real
- **Informações essenciais**: preço entrada, preço atual, confiança
- **Design contextual** (verde para compra, vermelho para venda)

### 4. Métricas Simplificadas
- **Taxa de Acerto** com código de cores inteligente
- **Total de Operações** realizadas
- **Vitórias** destacadas em verde
- **Perdas** destacadas em vermelho

### 5. Histórico e Relatórios
- **Histórico recente** com últimas 10 operações
- **Relatórios detalhados** acessíveis por demanda
- **Analytics completo** com gráficos e estatísticas
- **Performance por par** de criptomoedas

### 6. Sistema de Autenticação
- Login seguro via Supabase Auth
- Gerenciamento de sessão persistente
- Interface de login moderna e responsiva

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
