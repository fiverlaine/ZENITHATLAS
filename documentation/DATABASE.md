# Documentação do Banco de Dados - QuantumTrade

## 📋 Visão Geral

O banco de dados do QuantumTrade foi completamente recriado no Supabase com uma estrutura otimizada e segura para gerenciar sinais de trading de criptomoedas.

## 🗄️ Estrutura do Banco de Dados

### Tabela: `users`

Tabela responsável por armazenar informações dos usuários autenticados.

**Colunas:**
- `id` (UUID) - Identificador único do usuário (chave primária)
- `email` (TEXT) - Email do usuário (único)
- `created_at` (TIMESTAMPTZ) - Data de criação da conta
- `last_login` (TIMESTAMPTZ) - Último login do usuário

**Índices:**
- `users_pkey` - Índice único na coluna `id`
- `users_email_key` - Índice único na coluna `email`

**Políticas RLS (Row Level Security):**
- `Users can read their own data` - Usuários autenticados podem ler apenas seus próprios dados
- `Users can insert their own data` - Usuários autenticados podem inserir apenas seus próprios dados

**Triggers:**
- `on_auth_user_created` - Cria automaticamente um registro na tabela `users` quando um novo usuário se registra

---

### Tabela: `signals`

Tabela principal que armazena todos os sinais de trading gerados pelo sistema.

**Colunas:**
- `id` (UUID) - Identificador único do sinal (chave primária)
- `user_id` (UUID) - Referência ao usuário proprietário do sinal (FK para `auth.users.id`)
- `type` (TEXT) - Tipo do sinal: 'buy' ou 'sell'
- `price` (NUMERIC) - Preço no momento do sinal
- `pair` (TEXT) - Par de criptomoedas (ex: BTC/USD)
- `confidence` (NUMERIC) - Nível de confiança do sinal (0-100)
- `result` (TEXT) - Resultado do sinal: 'win', 'loss' ou NULL (pendente)
- `profit_loss` (NUMERIC) - Lucro/prejuízo percentual do sinal
- `timeframe` (INTEGER) - Timeframe do sinal em minutos
- `martingale_step` (INTEGER) - Passo do martingale (0-2)
- `martingale_multiplier` (NUMERIC) - Multiplicador do martingale (≥1.0)
- `time` (TEXT) - Horário do sinal (formato HH:MM:SS)
- `processing_status` (TEXT) - Status do processamento: 'pending', 'processing', 'completed', 'error'
- `created_at` (TIMESTAMPTZ) - Data/hora de criação
- `updated_at` (TIMESTAMPTZ) - Data/hora da última atualização

**Constraints:**
- `type` deve ser 'buy' ou 'sell'
- `price` deve ser maior que 0
- `confidence` deve estar entre 0 e 100
- `result` deve ser 'win' ou 'loss' (ou NULL)
- `timeframe` deve ser maior que 0
- `martingale_step` deve estar entre 0 e 2
- `martingale_multiplier` deve ser maior ou igual a 1.0
- `processing_status` deve ser 'pending', 'processing', 'completed' ou 'error'

**Índices:**
- `signals_pkey` - Índice único na coluna `id`
- `idx_signals_user_id` - Índice na coluna `user_id` (para consultas por usuário)
- `idx_signals_created_at` - Índice na coluna `created_at` (para ordenação temporal)
- `idx_signals_martingale` - Índice composto em (`user_id`, `martingale_step`, `martingale_multiplier`)
- `idx_signals_processing` - Índice parcial em (`user_id`, `processing_status`, `created_at DESC`) WHERE `processing_status = 'pending'`
- `idx_signals_active` - Índice parcial em (`user_id`, `created_at DESC`) WHERE `result IS NULL AND processing_status = 'pending'`

**Políticas RLS (Row Level Security):**
- `Users can read own signals` - Usuários podem ler apenas seus próprios sinais
- `Users can insert own signals` - Usuários podem inserir apenas sinais associados ao seu `user_id`
- `Users can update own signals` - Usuários podem atualizar apenas seus próprios sinais
- `Users can delete own signals` - Usuários podem deletar apenas seus próprios sinais

**Triggers:**
- `update_signals_updated_at` - Atualiza automaticamente o campo `updated_at` antes de cada UPDATE

---

## 🔐 Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado, garantindo que:
- Usuários só podem acessar seus próprios dados
- Políticas otimizadas com `(select auth.uid())` para melhor performance
- Validação de propriedade em todas as operações (SELECT, INSERT, UPDATE, DELETE)

### Funções com Search Path Seguro

Todas as funções do banco de dados têm `search_path` configurado para evitar vulnerabilidades de injeção de search path:
- `handle_new_user()` - SET search_path = public, pg_temp
- `update_updated_at_column()` - SET search_path = public, pg_temp

### Constraints e Validações

O banco de dados implementa validações robustas em nível de schema:
- Tipos de dados restritos (enums via CHECK constraints)
- Validação de ranges numéricos
- Chaves estrangeiras para integridade referencial
- Valores padrão adequados

---

## 🚀 Performance

### Otimizações Implementadas

1. **Índices Estratégicos:**
   - Índices compostos para consultas complexas
   - Índices parciais para sinais pendentes
   - Índice temporal para ordenação eficiente

2. **Políticas RLS Otimizadas:**
   - Uso de `(select auth.uid())` para evitar reavaliação por linha
   - Reduz significativamente o overhead em grandes volumes de dados

3. **Triggers Eficientes:**
   - Atualização automática de timestamps
   - Criação automática de usuários sem overhead

---

## 📊 Migrações Aplicadas

### 1. `create_complete_database_structure` (20251024213848)
- Criação das tabelas `users` e `signals`
- Implementação de RLS e políticas de segurança
- Criação de índices e triggers
- Ativação da extensão uuid-ossp

### 2. `fix_function_search_path_security` (20251024214XXX)
- Correção de vulnerabilidades de search_path em funções
- Implementação de SET search_path seguro

### 3. `optimize_rls_policies_performance` (20251024214XXX)
- Otimização das políticas RLS para melhor performance
- Substituição de `auth.uid()` por `(select auth.uid())`

---

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_SUPABASE_URL=https://cidyednczjxofbysntvh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZHllZG5jemp4b2ZieXNudHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjI1MDcsImV4cCI6MjA3Njg5ODUwN30.lWNIXVfYFaUxUFOrOMT7Axdlhr5Xgo1Fk93S000PUIU
```

**Importante:** O arquivo `.env` está no `.gitignore` e não deve ser commitado no repositório.

### Informações do Projeto Supabase

- **Nome do Projeto:** QuantumTrade
- **ID do Projeto:** cidyednczjxofbysntvh
- **Região:** us-east-2
- **URL da API:** https://cidyednczjxofbysntvh.supabase.co
- **Versão do PostgreSQL:** 17.6.1.025

---

## 📝 Queries Úteis

### Consultar todos os sinais de um usuário
```sql
SELECT * FROM signals
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Consultar sinais pendentes
```sql
SELECT * FROM signals
WHERE user_id = auth.uid()
  AND result IS NULL
  AND processing_status = 'pending'
ORDER BY created_at DESC;
```

### Estatísticas de win rate
```sql
SELECT 
  COUNT(*) as total_signals,
  COUNT(*) FILTER (WHERE result = 'win') as wins,
  COUNT(*) FILTER (WHERE result = 'loss') as losses,
  ROUND(
    (COUNT(*) FILTER (WHERE result = 'win')::NUMERIC / 
     NULLIF(COUNT(*) FILTER (WHERE result IS NOT NULL), 0)) * 100, 
    2
  ) as win_rate_percentage
FROM signals
WHERE user_id = auth.uid();
```

### Estatísticas por par de criptomoedas
```sql
SELECT 
  pair,
  COUNT(*) as total_signals,
  COUNT(*) FILTER (WHERE result = 'win') as wins,
  ROUND(
    (COUNT(*) FILTER (WHERE result = 'win')::NUMERIC / 
     NULLIF(COUNT(*) FILTER (WHERE result IS NOT NULL), 0)) * 100, 
    2
  ) as win_rate_percentage
FROM signals
WHERE user_id = auth.uid()
GROUP BY pair
ORDER BY total_signals DESC;
```

---

## 🛠️ Manutenção

### Backup

O Supabase realiza backups automáticos diários. Para backups adicionais, use:

```bash
# Instale o Supabase CLI
npm install -g supabase

# Faça login
supabase login

# Link ao projeto
supabase link --project-ref cidyednczjxofbysntvh

# Export do banco de dados
supabase db dump -f backup.sql
```

### Monitoramento

Acesse o painel do Supabase para:
- Monitorar queries lentas
- Verificar uso de índices
- Analisar logs de erro
- Verificar uso de recursos

**Link do Dashboard:** https://supabase.com/dashboard/project/cidyednczjxofbysntvh

---

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Linter](https://supabase.com/docs/guides/database/database-linter)

---

**Última Atualização:** 24 de Outubro de 2025
**Versão do Banco:** 1.0.0
**Status:** ✅ Totalmente Funcional

