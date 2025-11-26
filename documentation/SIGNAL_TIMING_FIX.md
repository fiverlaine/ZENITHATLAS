# Correção do Sistema de Sinais - Timing e API de Preços

## Data: 26/11/2025

## Problemas Corrigidos

### 1. Sinal Sendo Gerado na Hora Exata (ao invés de 1 minuto antes)

**Problema Original:**
Quando o admin agendava um sinal para 13:50, o sistema detectava e exibia o sinal exatamente às 13:50, não dando tempo para o usuário se preparar.

**Solução Implementada:**
O sistema agora detecta e exibe o sinal **1 minuto antes** do horário agendado:
- Admin agenda: BTC/USDT Compra às 13:50
- Sistema detecta às: 13:49
- Popup exibe: "Entrada 13:50, Saída 13:51"
- Usuário tem 1 minuto para se preparar antes da entrada real

**Arquivos Modificados:**
- `src/services/signalService.ts` - Função `getPendingAdminSignal()`
- `src/hooks/useAutomation.ts` - Funções `executeAdminSignal()` e `scheduleAdminSignalExecution()`

### 2. API de Preços Mostrando Resultados Incorretos

**Problema Original:**
O sistema às vezes mostrava WIN quando deveria ser LOSS (e vice-versa) porque:
- Preço de entrada era buscado no momento errado
- Preço de saída era buscado antes do tempo correto
- Não havia retry adequado quando a API falhava

**Solução Implementada:**
- **Preço de Entrada**: Buscado no início exato do minuto (quando a vela abre) + cache para evitar requisições duplicadas
- **Preço de Saída**: Buscado após o fechamento do candle (final do timeframe) com margem de segurança
- **Retry System**: 5 tentativas com backoff exponencial para cada busca de preço
- **Fallback**: Se a API do broker falhar, usa CryptoCompare como alternativa
- **Cache de Preços**: Evita inconsistências ao buscar o mesmo preço múltiplas vezes

**Arquivos Modificados:**
- `src/services/brokerApi.ts` - Adicionado cache, retry e melhor tratamento de erros
- `src/hooks/useSignalResults.ts` - Lógica completamente refatorada para garantir timing correto

## Detalhes Técnicos

### Fluxo de Execução do Sinal Admin

```
1. Admin agenda sinal: BTC/USDT Compra 13:50
2. Sistema verifica a cada 5s os sinais pendentes
3. Às 13:49 (1 min antes):
   - Sistema detecta o sinal
   - Gera o sinal para o usuário com time = 13:50
   - Popup aparece mostrando "Entrada 13:50, Saída 13:51"
4. Às 13:50:
   - Sistema busca preço de ENTRADA (abertura da vela)
   - Armazena o preço para comparação
5. Às 13:51:
   - Sistema busca preço de SAÍDA (fechamento da vela)
   - Compara: Se preço subiu = WIN (para compra), Se caiu = LOSS
```

### Cache de Preços

```typescript
// Cache para evitar requisições duplicadas
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 5000; // 5 segundos
```

### Sistema de Retry

```typescript
// Retry com backoff exponencial
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retries - 1, delay * 1.5);
    }
};
```

### 3. Correção do Realtime (100% em tempo real)

**Problema Original:**
Quando o admin adicionava um sinal, o usuário que estava buscando entrada não recebia em tempo real - precisava dar F5 e buscar novamente.

**Solução Implementada:**
- **Subscription Realtime Robusta**: Subscription com ID único para evitar conflitos
- **Captura de INSERT e UPDATE**: Monitora novos sinais e atualizações
- **Polling de Backup**: Verificação a cada 2 segundos como backup do realtime
- **Refs Atualizadas**: Uso de refs para garantir acesso aos valores mais recentes
- **Execução Imediata**: Quando um sinal é recebido via realtime, executa imediatamente

**Arquivos Modificados:**
- `src/hooks/useAutomation.ts` - Subscription realtime e polling de backup

## Testes Realizados

- ✅ Painel Admin funcionando corretamente
- ✅ Sinais sendo agendados com sucesso
- ✅ Lógica de timing (1 min antes) implementada
- ✅ Sistema de cache de preços funcionando
- ✅ Sistema de retry implementado
- ✅ Realtime funcionando 100% (sem necessidade de F5)

## Logs de Debug

O sistema agora produz logs detalhados para facilitar debug:

```
═══════════════════════════════════════════════════
🎯 VERIFICAÇÃO DO SINAL abc123
═══════════════════════════════════════════════════
📌 Par: BTC/USDT | Tipo: BUY
⏰ Entrada: 13:50:00
⏰ Saída: 13:51:00
⏰ Agora: 13:49:30

🔍 BUSCANDO PREÇO DE ENTRADA...
✅ PREÇO DE ENTRADA: 87652.34 (tentativa 1)

⏳ Aguardando 60s até o fechamento...

🔍 BUSCANDO PREÇO DE SAÍDA...
✅ PREÇO DE SAÍDA: 87700.00 (tentativa 1)

═══════════════════════════════════════════════════
📊 RESULTADO FINAL
═══════════════════════════════════════════════════
   Preço Entrada: 87652.34
   Preço Saída:   87700.00
   Diferença:     +47.66
   Variação:      +0.0544%
   Tipo:          BUY
   🎉 WIN!
═══════════════════════════════════════════════════
```

## Sistema de Realtime Detalhado

### Subscription com ID Único
```typescript
const channel = supabase
  .channel('admin-signals-realtime-' + Date.now()) // ID único para evitar conflitos
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'admin_signals'
  }, async (payload) => {
    // Processamento imediato
  })
  .subscribe();
```

### Polling de Backup (a cada 2s)
```typescript
const pollInterval = setInterval(async () => {
  const adminSignal = await signalService.getPendingAdminSignal(selectedPair);
  if (adminSignal && timeDiff <= 90000 && timeDiff > -60000) {
    await executeAdminSignal(adminSignal);
  }
}, 2000);
```

### Refs para Valores Atualizados
```typescript
const currentSignalRef = useRef(currentSignal);
const selectedPairRef = useRef(selectedPair);

// Mantém refs atualizadas
useEffect(() => {
  currentSignalRef.current = currentSignal;
}, [currentSignal]);
```

## Notas Importantes

1. **Margem de Segurança**: O sistema adiciona 2-3 segundos de margem ao buscar preços para garantir que os dados estejam disponíveis na API.

2. **Preço de Entrada Fixo**: Uma vez buscado, o preço de entrada é armazenado e não muda, evitando inconsistências.

3. **Fallback Automático**: Se a API do broker falhar após 5 tentativas, o sistema usa automaticamente o CryptoCompare.

4. **Proteção contra Duplicatas**: O sistema evita processar o mesmo sinal múltiplas vezes.

5. **Realtime 100%**: Combinação de Supabase Realtime + Polling de backup garante que nenhum sinal seja perdido.

