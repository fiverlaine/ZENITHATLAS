# MyBroker Broker API – Documentação Consolidada (v1.0)

> **Fonte:** documentação oficial da MyBroker Broker API (api-token + symbol-price + websocket).  
> **Última conferência:** 20/11/2025.

---

## 1. Visão geral

A MyBroker Broker API é dividida, basicamente, em **dois blocos** de serviços:

1. **Broker API (`api-token`)**  
   - Host principal: `https://broker-api.mybroker.dev`  
   - Focado em:
     - Tokens de API (API Key Token)
     - Carteiras do usuário
     - Ordens (trades)
     - Informações do usuário

2. **Symbol Prices API (`symbol-price`)**  
   - Host principal: `https://symbol-prices-api.mybroker.dev`  
   - Focado em:
     - Preço atual de pares (Ex.: `BTCUSDT`)
     - Último preço em determinado intervalo
     - Preços históricos agregados (OHLCV)
     - WebSocket com atualizações em tempo real

### 1.1 Conceitos importantes

- **API Key Token (`api-token` header)**  
  Token gerado na área logada do Broker, vinculado ao usuário, usado em endpoints como `/token/wallets`, `/token/trades`, `/token/users/me`.

- **api-key (header para Symbol Prices)**  
  Chave utilizada nos endpoints de preços (symbol-price). A documentação informa um **valor padrão** de `api-key` que já pode ser usado diretamente nas requisições de preço, sem necessidade de geração adicional.

- **`slot`**  
  Identifica o *tenant* / ambiente lógico de preços (por exemplo, `"default"`). Sem o `slot` correto, você pode receber dados de outro contexto ou simplesmente não receber dados.

- **`x-partner`**  
  Identifica o parceiro/afiliado (broker) que está consumindo a API de preços. Esse valor é fornecido pelo account manager.

- **`x-timestamp`**  
  Timestamp em milissegundos (`Date.now()` / Unix em ms) usado para validação de tempo nas chamadas, tanto na Broker API (api-token) quanto na Symbol Prices API.

---

## 2. Autenticação e parâmetros globais

### 2.1 Como gerar um API Key Token (para `api-token`)

1. Acesse sua conta no Broker (login normal).
2. Vá até o menu **Account** (ou “Conta”) e abra a aba **API Token**.
3. Clique em **Create a New Token** e dê um nome descritivo (por ex.: `n8n-prod`, `lovable-dev`).
4. A interface mostrará para cada token:
   - Data de criação
   - Nome do token
   - Valor do token (API Key Token)
   - Ação de exclusão

**Regras/limites:**

- Cada usuário pode ter **até 3 tokens ativos simultaneamente**.
- Para criar um novo token, caso o limite esteja estourado, é necessário excluir um existente.
- O token **não deve ser exposto publicamente** e, uma vez apagado, não é recuperável.

### 2.2 `slot`, `api-key` e `x-partner` (Symbol Prices API)

- **`api-key` (Symbol Prices)**  
  - É a chave de acesso para a API de preços.
  - A documentação fornece um valor padrão (ex.: `Sl293kk22ss8`), indicando que **você deve usar exatamente esse valor** nas chamadas da Symbol Prices API.
  - Não é necessário gerar uma nova `api-key` para esses endpoints de preço.

- **`slot`**  
  - Representa o “espaço” ou ambiente lógico de preços.
  - Ex.: `default`, ou um slot específico fornecido pelo account manager.
  - É especialmente usado em endpoints como `/symbol-price/last` e `/aggregated-prices/prices`.

- **`x-partner`**  
  - Identifica seu broker/parceiro.
  - Valor fornecido pelo account manager, que deve ser enviado em todas as requisições de preços (`symbol-price`) e na conexão WebSocket de preços.

- **Exemplo conceitual (Symbol Prices API):**

```bash
curl --request GET \
  'https://symbol-prices-api.mybroker.dev/symbol-price/last?pair=BTCUSDT&slot=default&limitTime=1738927401000' \
  --header 'api-key: <SUA_API_KEY_DE_PREÇOS>' \
  --header 'x-timestamp: <timestamp_ms>' \
  --header 'x-partner: <seu_partner>'
```

### 2.3 Cabeçalhos por família de endpoint

| Família                    | Host base                                     | Autenticação obrigatória (headers)                                           |
|---------------------------|-----------------------------------------------|-------------------------------------------------------------------------------|
| **Broker API (api-token)**| `https://broker-api.mybroker.dev`             | `api-token: <seu_api_key_token>`, `x-timestamp: <timestamp_ms>`              |
| **Symbol Prices API**     | `https://symbol-prices-api.mybroker.dev`      | `api-key: <api_key>`, `x-timestamp: <timestamp_ms>`, `x-partner: <partner>`  |
| **WebSocket de preços**   | `https://symbol-prices-api.mybroker.dev/...`  | Enviar `x-timestamp` e `x-partner` em `extraHeaders` na conexão socket.io    |

---

## 3. Endpoints `api-token` (Broker API)

Base: `https://broker-api.mybroker.dev`  
Headers em todos os endpoints abaixo:

```text
api-token: <seu_api_key_token>
x-timestamp: <timestamp_ms>
```

---

### 3.1 Carteiras – `GET /token/wallets`

- **Método:** `GET`
- **URL:** `/token/wallets`
- **Descrição:** Retorna todas as carteiras associadas ao usuário autenticado pelo `api-token`.

#### 3.1.1 Parâmetros

- **Query:** nenhum parâmetro obrigatório.
- **Headers:** `api-token`, `x-timestamp`.

#### 3.1.2 Estrutura de resposta (resumo)

Retorna um **array de carteiras**, cada item contendo, por exemplo:

- `id` – identificador da carteira
- `userId` – identificador do usuário
- `type` – tipo de carteira (ex.: real, demo, etc.)
- `balance` – saldo atual
- `createdAt` – data/hora de criação

Exemplo simplificado:

```json
[
  {
    "id": "wallet-1",
    "userId": "user-123",
    "type": "REAL",
    "balance": 1000.50,
    "createdAt": "2024-03-04T10:15:30Z"
  }
]
```

---

### 3.2 Trades (ordens) – `/token/trades`

Base: `/token/trades`

#### 3.2.1 Listar todas as ordens paginadas – `GET /token/trades`

- **Método:** `GET`
- **URL:** `/token/trades`
- **Descrição:** Lista as trades do usuário autenticado, com paginação.

**Query params principais:**

| Parâmetro  | Tipo     | Obrigatório | Descrição                                 |
|-----------|----------|------------|-------------------------------------------|
| `page`    | integer  | Não        | Página (padrão: 1)                        |
| `pageSize`| integer  | Não        | Registros por página (padrão: 10)        |
| `userId`  | string   | Não        | Filtra trades de um usuário específico    |

**Resposta (resumo):**

```json
{
  "currentPage": 1,
  "perPage": 10,
  "lastPage": 5,
  "nextPage": 2,
  "prevPage": null,
  "pages": 5,
  "total": 10,
  "count": 50,
  "data": [
    {
      "id": "trade-id-1",
      "symbol": "BTCUSDT",
      "userId": "user-123",
      "amount": 20,
      "status": "COMPLETED",
      "result": "WON",
      "direction": "BUY",
      "createdAt": "2024-11-15T20:22:37.287Z"
    }
  ]
}
```

#### 3.2.2 Listar trades por usuário – `GET /token/trades?userId=:id`

- Usa o mesmo endpoint `/token/trades`, mas com o filtro `userId`.
- Exemplo: `/token/trades?page=1&pageSize=10&userId=01JTS65T...`
- Retorna apenas as ordens vinculadas ao `userId` informado.

---

### 3.2.3 Buscar ordem por ID – `GET /token/trades/{id}`

- **Método:** `GET`
- **URL:** `/token/trades/{id}`
- **Descrição:** Retorna os detalhes de uma ordem específica.

**Path params:**

| Parâmetro | Tipo   | Obrigatório | Descrição                      |
|-----------|--------|------------|--------------------------------|
| `id`      | string | Sim        | ID da trade a ser consultada   |

**Resposta (exemplo reduzido):**

```json
{
  "id": "trade-id-1",
  "userId": "user-123",
  "tenantId": "tenant-xyz",
  "status": "CANCELLED",
  "symbol": "BTCUSDT",
  "amount": 20,
  "createdAt": "2024-11-15T20:22:37.287Z"
}
```

---

### 3.2.4 Abrir uma nova ordem – `POST /token/trades/open`

- **Método:** `POST`
- **URL:** `/token/trades/open`
- **Descrição:** Cria uma nova trade com base nos parâmetros enviados no corpo da requisição.

**Headers obrigatórios:**

```text
api-token: <seu_api_key_token>
x-timestamp: <timestamp_ms>
Content-Type: application/json
```

**Body (campos típicos):**

| Campo            | Tipo    | Obrigatório | Descrição                                                   |
|-----------------|---------|------------|-------------------------------------------------------------|
| `isDemo`        | boolean | Sim        | `true` para conta demo, `false` para conta real            |
| `amount`        | number  | Sim        | Valor da operação                                           |
| `symbol`        | string  | Sim        | Ativo negociado (ex.: `BTCUSDT`, `APPLE.OTC`)              |
| `direction`     | string  | Sim        | Direção (`"BUY"` ou `"SELL"`)                              |
| `expirationType`| string  | Sim        | Tipo de expiração (ex.: `"CANDLE_CLOSE"`, `"TIME_FIXED"`)  |
| `closeType`     | string  | Sim        | Tempo/forma de fechamento (ex.: `"00:05"`, `"01:00"`)      |

**Exemplo de request:**

```bash
curl -X POST "https://broker-api.mybroker.dev/token/trades/open" \
  -H "api-token: <seu_token>" \
  -H "x-timestamp: <timestamp_ms>" \
  -H "Content-Type: application/json" \
  -d '{
    "isDemo": false,
    "amount": 2.0,
    "closeType": "00:05",
    "expirationType": "CANDLE_CLOSE",
    "symbol": "APPLE.OTC",
    "direction": "SELL"
  }'
```

**Resposta (resumo):**

```json
{
  "id": "trade-id-gerado",
  "userId": "user-123",
  "symbol": "BTCUSDT",
  "amount": 20,
  "direction": "BUY",
  "payout": 63,
  "result": "PENDING",
  "openTime": 1741114908999,
  "closeTime": 1741114968999,
  "tenantId": "tenant-xyz",
  "wallets": [
    {
      "id": "wallet-id",
      "type": "DEMO",
      "amount": 20,
      "balance": 10003.865
    }
  ]
}
```

---

### 3.3 Dados do usuário – `GET /token/users/me`

- **Método:** `GET`
- **URL:** `/token/users/me`
- **Descrição:** Retorna os dados completos do usuário vinculado ao `api-token`.

**Headers:**

```text
api-token: <seu_api_key_token>
x-timestamp: <timestamp_ms>
```

**Resposta (campos principais):**

Campos típicos presentes na resposta:

- Identificação:
  - `id`, `tenantId`, `affiliateId`, `nickname`
- Dados pessoais:
  - `name`, `email`, `country`, `language`
- Configurações:
  - `params.maxWithdrawalAmount`, `params.ignoreTenantUserLimitation`
- Copy trade:
  - `copyTradeParams.copyCommissionRate`
  - `copyTradeParams.maxFollowerAmountPerTrade`
  - `copyTradeParams.autoApproveCopyFollowers`
- Status:
  - `active`, `banned`, `deleted`, `emailVerified`
- Contato:
  - `phoneCountryCode`, `phone`
- Auditoria:
  - `lastLoginAt`, `createdAt`, `updatedAt`

Exemplo reduzido:

```json
{
  "id": "user-123",
  "tenantId": "tenant-xyz",
  "email": "[email protected]",
  "name": "Nome do Usuário",
  "nickname": "#18715772",
  "country": "BR",
  "language": "ptBr",
  "active": true,
  "banned": false,
  "params": {
    "maxWithdrawalAmount": 2000,
    "ignoreTenantUserLimitation": false
  },
  "copyTradeParams": {
    "copyCommissionRate": 50,
    "maxFollowerAmountPerTrade": 10000000,
    "autoApproveCopyFollowers": false
  },
  "lastLoginAt": "2025-05-27T18:39:38.187Z"
}
```

---

## 4. Endpoints de preços (Symbol Prices API)

Base: `https://symbol-prices-api.mybroker.dev`  
Headers comuns:

```text
api-key: <api_key_de_preços>
x-timestamp: <timestamp_ms>
x-partner: <partner_name>
```

> **Importante:** Antes de usar qualquer endpoint de preços, garanta que você entendeu `slot`, `api-key` e `x-partner`.

---

### 4.1 Preço atual de um par – `GET /symbol-price/default/{pair}`

- **Método:** `GET`
- **URL completa:**  
  `https://symbol-prices-api.mybroker.dev/symbol-price/default/{pair}`
- **Descrição:** Retorna o último dado de preço disponível para um determinado par, no `slot` padrão (`default`).

**Path params:**

| Parâmetro | Tipo   | Obrigatório | Descrição                         |
|-----------|--------|------------|-----------------------------------|
| `pair`    | string | Sim        | Par negociado (ex.: `BTCUSDT`)    |

**Resposta (campos principais):**

- `id` – identificador do registro de preço
- `slot` – slot de preços (ex.: `"default"`)
- `pair` – par (`BTCUSDT`, etc.)
- `type` – tipo de ativo (`"crypto"`, etc.)
- `time` – timestamp em milissegundos
- `volume` – volume negociado
- `openPrice`, `closePrice`, `highPrice`, `lowPrice`
- `createdAt`, `updatedAt` – timestamps em ISO 8601

Exemplo:

```json
{
  "id": "price-id",
  "slot": "default",
  "pair": "BTCUSDT",
  "type": "crypto",
  "time": 1741287954000,
  "volume": 0,
  "openPrice": 88232.89,
  "closePrice": 88234.63,
  "highPrice": 88234.63,
  "lowPrice": 88225.87,
  "createdAt": "2025-03-06T19:05:55.313Z",
  "updatedAt": "2025-03-06T19:05:55.313Z"
}
```

---

### 4.2 Último preço em um intervalo – `GET /symbol-price/last`

- **Método:** `GET`
- **URL:** `/symbol-price/last`
- **Descrição:** Retorna o preço mais recente de um par dentro de um limite de tempo definido por `limitTime`.

**Query params:**

| Parâmetro  | Tipo     | Obrigatório | Descrição                                                                      |
|-----------|----------|------------|--------------------------------------------------------------------------------|
| `pair`    | string   | Sim        | Par (ex.: `BTCUSDT`)                                                           |
| `slot`    | string   | Não        | Slot de preço (padrão: `"default"`)                                           |
| `limitTime` | integer| Não        | Limite máximo de tempo em ms (timestamp). Se for futuro, resposta pode ser `"OK"`. |

**Autenticação:**

- `api-key`, `x-timestamp`, `x-partner` obrigatórios.

**Comportamento especial:**

- Se o `limitTime` estiver **no futuro**, a API pode retornar apenas `"OK"`.
- Se o `limitTime` estiver **no passado ou presente**, retorna um objeto com preços (similar ao endpoint de preço atual).

---

### 4.3 Preços agregados (histórico) – `GET /aggregated-prices/prices`

- **Método:** `GET`
- **URL:** `/aggregated-prices/prices`
- **Descrição:** Retorna dados históricos agregados (OHLCV) para um par em um intervalo definido.

**Query params:**

| Parâmetro   | Tipo    | Obrigatório | Descrição                                                |
|------------|---------|------------|----------------------------------------------------------|
| `pair`     | string  | Sim        | Par de negociação (ex.: `BTCUSDT`)                      |
| `slot`     | string  | Não        | Slot (padrão: `"default"`)                              |
| `type`     | string  | Sim        | Tipo de ativo (ex.: `"crypto"`)                         |
| `interval` | string  | Sim        | Intervalo de agregação (ex.: `"1m"`, `"5m"`, `"1h"`)    |
| `skip`     | integer | Não        | Quantidade de registros a pular (padrão: 0)             |
| `limit`    | integer | Não        | Máximo de registros a retornar (padrão: 1000)           |
| `startTime`| integer | Sim        | Timestamp inicial em ms                                  |
| `endTime`  | integer | Sim        | Timestamp final em ms                                    |

**Resposta:**

Array de objetos com, por exemplo:

- `volume` – volume negociado
- `openPrice` – preço de abertura
- `closePrice` – preço de fechamento
- `highPrice` – máxima do período
- `lowPrice` – mínima do período
- `time` – timestamp em ms do candle/intervalo

Exemplo:

```json
[
  {
    "volume": 0,
    "openPrice": 100063.99,
    "closePrice": 100058.82,
    "highPrice": 100066.66,
    "lowPrice": 100058.82,
    "time": 1733688300000
  },
  {
    "volume": 0,
    "openPrice": 100058.82,
    "closePrice": 100084.01,
    "highPrice": 100107.99,
    "lowPrice": 100058.82,
    "time": 1733688360000
  }
]
```

---

## 5. WebSocket de preços (Symbol Prices)

A API de WebSocket usa **socket.io** para enviar atualizações de preço em tempo real.

### 5.1 Endpoint e conexão

- **URL de conexão (socket.io):**  
  `https://symbol-prices-api.mybroker.dev/symbol-prices`

**Opções típicas de conexão (Node.js / TypeScript):**

```ts
import { io } from "socket.io-client";

const socket = io("https://symbol-prices-api.mybroker.dev/symbol-prices", {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 5000,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 10000,
  transports: ["websocket"],
  extraHeaders: {
    "x-timestamp": String(Date.now()),
    "x-partner": "<nome_do_broker>"
  }
});
```

### 5.2 Assinando símbolos

Depois de conectado:

- O cliente pode emitir um evento para assinar o último preço de um par:

```ts
socket.on("connect", () => {
  console.log("Symbol WS connected");
  socket.emit("last-symbol-price", "default:BTCUSDT");
  // Você pode emitir outros pares, como: "default:ETHUSDT", etc.
});
```

> O formato `"slot:SYMBOL"` é usado, por exemplo: `"default:BTCUSDT"`.

### 5.3 Recebendo atualizações

A documentação mostra que as mensagens chegam em um payload que contém `event` e `data`. Quando o `event` é `"symbol.price.update"`, os dados de preço são atualizados.

Exemplo (conceitual):

```ts
socket.on("message", (payload: any) => {
  if (payload.event !== "symbol.price.update") return;

  const data = payload.data;

  const update = {
    price: data.closePrice,
    time: data.time,
    symbol: data.pair,
    slot: data.slot
  };

  // Atualize sua aplicação com o novo preço
  console.log("Price update:", update);
});
```

Campos típicos em `payload.data`:

- `pair` – par (ex.: `BTCUSDT`)
- `closePrice` – último preço de fechamento
- `time` – timestamp da atualização
- `slot` – slot associado

### 5.4 Tratando desconexões e erros

Eventos úteis:

```ts
socket.on("disconnect", () => {
  console.warn("WS disconnected");
});

socket.on("connect_error", (err) => {
  console.warn("WS connect error", err);
});

socket.on("connect_timeout", (timeout) => {
  console.warn("WS timeout", timeout);
});
```

---

## 6. Tabela-resumo de endpoints

### 6.1 Broker API (`api-token`)

| Recurso          | Método | URL                                 | Auth                            | Descrição                                      |
|------------------|--------|-------------------------------------|----------------------------------|------------------------------------------------|
| Carteiras        | GET    | `/token/wallets`                   | `api-token`, `x-timestamp`      | Lista todas as carteiras do usuário           |
| Trades (lista)   | GET    | `/token/trades`                    | `api-token`, `x-timestamp`      | Lista trades paginadas                         |
| Trade por ID     | GET    | `/token/trades/{id}`               | `api-token`, `x-timestamp`      | Detalhes de uma trade específica               |
| Trades por user  | GET    | `/token/trades?userId=:id`         | `api-token`, `x-timestamp`      | Lista trades de um determinado usuário         |
| Abrir trade      | POST   | `/token/trades/open`               | `api-token`, `x-timestamp`      | Cria uma nova trade                            |
| Usuário atual    | GET    | `/token/users/me`                  | `api-token`, `x-timestamp`      | Retorna dados do usuário vinculado ao token    |

### 6.2 Symbol Prices API

| Recurso                  | Método | URL                                           | Auth                                  | Descrição                                           |
|--------------------------|--------|-----------------------------------------------|----------------------------------------|-----------------------------------------------------|
| Preço atual              | GET    | `/symbol-price/default/{pair}`               | `api-key`, `x-timestamp`, `x-partner` | Último preço disponível para o par                  |
| Último preço por tempo   | GET    | `/symbol-price/last`                         | `api-key`, `x-timestamp`, `x-partner` | Último preço dentro de um limite de tempo           |
| Preços agregados (hist.) | GET    | `/aggregated-prices/prices`                  | `api-key`, `x-timestamp`, `x-partner` | OHLCV histórico, com `interval`, `startTime`, etc.  |
| WebSocket de preços      | WS     | `wss://symbol-prices-api.mybroker.dev/...`   | `x-timestamp`, `x-partner` (headers)  | Atualizações em tempo real via `socket.io`          |

---

## 7. Observações finais

- Sempre sincronize o `x-timestamp` com o horário atual do servidor/cliente (Unix timestamp em ms).
- Guarde `api-token` e `api-key` em local seguro (variáveis de ambiente, secret manager, etc.).
- Para uso em produção (n8n, Lovable, microserviços), recomenda-se centralizar:
  - Geração/rotação de `api-token` (quando necessário)
  - Configuração de `slot` e `x-partner`
  - Tratamento de erros HTTP (401, 404, 500) e reconexão de WebSocket.

