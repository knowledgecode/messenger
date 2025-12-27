# Messenger

A type-safe Request/Reply and Pub/Sub messaging library for cross-context communication in browsers, enabling seamless message exchange between the main window, iframes, and web workers.

## Features

- **Request/Reply Pattern**: Send requests and receive responses asynchronously
- **Pub/Sub Pattern**: Publish messages to multiple subscribers
- **Cross-Context Communication**: Works seamlessly between:
  - Main window ↔ iframes
  - Main window ↔ web workers
  - iframe ↔ iframe
  - Components within the same context
- **Type-Safe**: Built with TypeScript for excellent type inference
- **Promise-Based**: Modern async/await API
- **Secure**: Uses MessageChannel API for isolated communication

## Installation

```shell
npm i @knowledgecode/messenger
```

## Usage

### Node.js / Bundlers (Recommended)

```typescript
import { MessengerClient, MessengerServer } from '@knowledgecode/messenger';
```

### Browser (UMD - Legacy)

For legacy environments without ES module support:

```html
<script src="./node_modules/@knowledgecode/messenger/dist/messenger.js"></script>
<script>
  const { MessengerClient, MessengerServer } = self.messenger;
</script>
```

For workers in legacy environments:

```typescript
// worker.ts (legacy)
importScripts('./node_modules/@knowledgecode/messenger/dist/messenger.js');
const { MessengerServer } = self.messenger;
```

## Quick Start

> **Note**: The examples below are written in TypeScript. Build them to JavaScript files using TypeScript compiler or a bundler before running in the browser.

### Example: Main Window ↔ Worker

#### main.ts (build to main.js)

```typescript
import { MessengerClient } from '@knowledgecode/messenger';

const messenger = new MessengerClient();
const worker = new Worker('./worker.js', { type: 'module' });

(async () => {
  // Connect to the worker's server named 'calculator'
  await messenger.connect('calculator', worker);

  // Request/Reply: Send a request and wait for response
  const result = await messenger.req<number>('add', { x: 2, y: 3 });
  console.log(result); // => 5

  // Send: Fire and forget
  messenger.send('close');
  messenger.disconnect();
})();
```

#### worker.ts (build to worker.js)

```typescript
import { MessengerServer } from '@knowledgecode/messenger';

interface AddRequest {
  x: number;
  y: number;
}

const messenger = new MessengerServer('calculator', self);

// Bind handler for 'add' topic
messenger.bind<AddRequest>('add', (data) => {
  if (!data) {
    return 0;
  }
  return data.x + data.y;
});

// Bind handler for 'close' topic
messenger.bind<void>('close', () => {
  messenger.close();
  self.close();
});
```

### Example: Main Window ↔ iframe

#### main.ts (build to main.js)

```typescript
import { MessengerClient } from '@knowledgecode/messenger';

interface StatusUpdate {
  status: string;
  timestamp: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const messenger = new MessengerClient();
const iframe = document.querySelector('iframe');

(async () => {
  // Connect to iframe's server with targetOrigin for security
  await messenger.connect('iframe-app', iframe!.contentWindow!, {
    targetOrigin: 'https://example.com', // Use '*' only for development
    timeout: 5000
  });

  // Subscribe to messages published from the iframe
  messenger.subscribe<StatusUpdate>('status-update', (data) => {
    if (data) {
      console.log('Status:', data.status);
    }
  });

  // Send request to iframe
  const userData = await messenger.req<User>('get-user', { id: 123 });
  console.log(userData);
})();
```

#### iframe.ts (build to iframe.js)

```typescript
import { MessengerServer } from '@knowledgecode/messenger';

interface GetUserRequest {
  id: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const messenger = new MessengerServer('iframe-app', self);

messenger.bind<GetUserRequest>('get-user', async (data) => {
  if (!data) {
    throw new Error('User ID is required');
  }
  const response = await fetch(`/api/users/${data.id}`);
  return await response.json() as User;
});

// Publish status updates to subscribers
setInterval(() => {
  messenger.publish('status-update', { status: 'running', timestamp: Date.now() });
}, 1000);
```

### Example: Same-Context Communication (Component to Component)

You can use Messenger for communication between components within the same window or worker context.

#### data-service.ts (build to data-service.js)

```typescript
import { MessengerServer } from '@knowledgecode/messenger';

interface DataItem {
  id: number;
  value: string;
}

const messenger = new MessengerServer('data-service', self);

messenger.bind<void>('get-data', (): DataItem[] => {
  return [
    { id: 1, value: 'Item 1' },
    { id: 2, value: 'Item 2' },
    { id: 3, value: 'Item 3' }
  ];
});
```

#### app.ts (build to app.js)

```typescript
import { MessengerClient } from '@knowledgecode/messenger';

interface DataItem {
  id: number;
  value: string;
}

const messenger = new MessengerClient();

(async () => {
  // Connect to the data service in the same context
  await messenger.connect('data-service', self);

  // Request data from the service
  const items = await messenger.req<DataItem[]>('get-data');
  console.log('Received items:', items);

  messenger.disconnect();
})();
```

## API Reference

### MessengerClient

Client for connecting to a MessengerServer and sending messages.

#### `constructor()`

Creates a new MessengerClient instance.

```typescript
const messenger = new MessengerClient();
```

#### `connect(name, endpoint, options)`

Establishes a connection to a MessengerServer.

**Parameters:**

- `name` (**string**): Unique name of the MessengerServer to connect to
- `endpoint` (**Window | Worker**, optional): Target context that has `postMessage()` method. Defaults to `self`
- `options` (**object**, optional): Connection options
  - `targetOrigin` (**string**, optional): Target origin for security (iframe only). Defaults to `'*'`. For production, always specify the exact origin
  - `timeout` (**number**, optional): Connection timeout in milliseconds. If omitted, waits indefinitely

**Returns:** `Promise<void>` - Resolves when connection is established

**Throws:**

- `Error` if endpoint doesn't have `postMessage()` method
- `Error` if connection times out

**Examples:**

```typescript
// Connect to iframe with security and timeout
const iframe = document.querySelector('iframe');
await messenger.connect('my-iframe', iframe!.contentWindow!, {
  targetOrigin: 'https://trusted-domain.com',
  timeout: 5000
});
```

```typescript
// Connect to worker
const worker = new Worker('./worker.js', { type: 'module' });
await messenger.connect('my-worker', worker, { timeout: 3000 });
```

```typescript
// Connect from within a worker to parent
await messenger.connect('main', self);
```

#### `disconnect()`

Disconnects from the server, clears all subscriptions, and cleans up resources.

```typescript
messenger.disconnect();
```

#### `send(topic, data)`

Sends a one-way message to a topic. Does not wait for a response.

**Parameters:**

- `topic` (**string**): Topic name
- `data` (**unknown**): Data to send

**Throws:** `Error` if not connected

```typescript
messenger.send('log', { level: 'info', message: 'Task completed' });
```

#### `req<T>(topic, data, timeout)`

Sends a request to a topic and waits for a response.

**Type Parameters:**

- `T` (optional): The expected response type. Defaults to `unknown`

**Parameters:**

- `topic` (**string**): Topic name
- `data` (**unknown**, optional): Data to send
- `timeout` (**number**, optional): Request timeout in milliseconds. If omitted, waits indefinitely

**Returns:** `Promise<T>` - Resolves with the response data of type `T`

**Throws:**

- `Error` if not connected
- `Error` if request times out
- `Error` if the topic is not bound on the server

**Examples:**

```typescript
// Simple request with type inference
const result = await messenger.req<number>('calculate', { operation: 'add', values: [1, 2, 3] });
```

```typescript
// Request with timeout and type safety
interface DataResponse {
  id: number;
  value: string;
}

try {
  const data = await messenger.req<DataResponse>('fetch-data', { id: 123 }, 5000);
  console.log(data.value); // TypeScript knows about the 'value' property
} catch (error) {
  console.error('Request failed:', (error as Error).message);
}
```

#### `subscribe<T>(topic, listener)`

Subscribes to messages published on a topic.

**Type Parameters:**

- `T` (optional): The expected message data type. Defaults to `unknown`

**Parameters:**

- `topic` (**string**): Topic name
- `listener` (**function**): Callback function invoked when messages are published
  - Signature: `(data?: T) => void`

**Throws:** `Error` if not connected

```typescript
interface Notification {
  title: string;
  message: string;
  timestamp: number;
}

messenger.subscribe<Notification>('notifications', (data) => {
  if (data) {
    console.log('Notification received:', data.title);
  }
});
```

#### `unsubscribe(topic, listener)`

Unsubscribes from a topic.

**Parameters:**

- `topic` (**string**, optional): Topic name. If omitted, clears all subscriptions
- `listener` (**function**, optional): Specific listener to remove. If omitted, removes all listeners for the topic

```typescript
// Remove specific listener
interface UpdateData {
  version: string;
}

const listener = (data?: UpdateData) => {
  if (data) {
    console.log(data.version);
  }
};
messenger.subscribe<UpdateData>('updates', listener);
messenger.unsubscribe('updates', listener);

// Remove all listeners for a topic
messenger.unsubscribe('updates');

// Remove all subscriptions
messenger.unsubscribe();
```

---

### MessengerServer

Server for accepting client connections and handling messages.

#### `constructor(name, endpoint)`

Creates a new MessengerServer instance.

**Parameters:**

- `name` (**string**): Unique name for this server. Clients use this name to connect
- `endpoint` (**Window | Worker**, optional): Context to listen on. Defaults to `self`

```typescript
// In a worker
const messenger = new MessengerServer('my-worker', self);

// In an iframe
const messenger = new MessengerServer('my-iframe', self);

// In main window (listening for messages from a specific worker)
const worker = new Worker('./worker.js', { type: 'module' });
const messenger = new MessengerServer('worker-listener', worker);
```

#### `bind<T>(topic, listener)`

Binds a handler to a topic for receiving messages.

**Type Parameters:**

- `T` (optional): The expected message data type. Defaults to `unknown`

**Parameters:**

- `topic` (**string**): Topic name (must be unique per server)
- `listener` (**function**): Handler function
  - Signature: `(data?: T) => unknown`
  - For `send()` messages: return value is ignored
  - For `req()` messages: return value (or resolved Promise value) is sent back to client

**Returns:** `boolean` - `true` if bound successfully, `false` if topic already bound

**Examples:**

```typescript
// Handle one-way messages
interface LogMessage {
  level: string;
  message: string;
}

messenger.bind<LogMessage>('log', (data) => {
  if (data) {
    console.log(`[${data.level}] ${data.message}`);
  }
});

// Handle requests (synchronous)
interface AddRequest {
  x: number;
  y: number;
}

messenger.bind<AddRequest>('add', (data) => {
  if (!data) {
    return 0;
  }
  return data.x + data.y;
});

// Handle requests (asynchronous)
interface FetchUserRequest {
  id: number;
}

interface User {
  id: number;
  name: string;
}

messenger.bind<FetchUserRequest>('fetch-user', async (data) => {
  if (!data) {
    throw new Error('User ID is required');
  }
  const response = await fetch(`/api/users/${data.id}`);
  return await response.json() as User;
});

// Check binding result
if (!messenger.bind<void>('duplicate-topic', () => {})) {
  console.error('Topic already bound');
}
```

#### `unbind(topic)`

Removes the handler for a topic.

**Parameters:**

- `topic` (**string**): Topic name

```typescript
messenger.unbind('old-topic');
```

#### `publish(topic, data)`

Publishes a message to all subscribed clients on a topic.

**Parameters:**

- `topic` (**string**): Topic name
- `data` (**unknown**, optional): Data to publish

This method does not wait for responses and succeeds even if there are no subscribers.

```typescript
// Notify all subscribers
messenger.publish('status-change', { status: 'ready', timestamp: Date.now() });

// Broadcast to all clients
setInterval(() => {
  messenger.publish('heartbeat', { timestamp: Date.now() });
}, 1000);
```

#### `close()`

Closes all client connections, removes all handlers and subscriptions, and shuts down the server.

```typescript
messenger.close();
```

## Security Considerations

When connecting to iframes from different origins, always specify the exact `targetOrigin` instead of using `'*'`:

```typescript
// ❌ Insecure - allows any origin
await messenger.connect('iframe', iframe!.contentWindow!, { targetOrigin: '*' });

// ✅ Secure - restricts to specific origin
await messenger.connect('iframe', iframe!.contentWindow!, {
  targetOrigin: 'https://trusted-domain.com'
});
```

## TypeScript

This library is written in TypeScript and provides full type safety with generic support.

### Type-safe Requests

```typescript
import { MessengerClient } from '@knowledgecode/messenger';

interface User {
  id: number;
  name: string;
}

const messenger = new MessengerClient();

// Type-safe request - result is typed as User
const user = await messenger.req<User>('get-user', { id: 123 });
console.log(user.name); // TypeScript knows user has a name property
```

### Type-safe Subscriptions

The listener receives `data` as `T | undefined` because messages may be published without data.

```typescript
interface StatusUpdate {
  status: 'online' | 'offline';
  timestamp: number;
}

// Type-safe subscribe - data parameter is StatusUpdate | undefined
messenger.subscribe<StatusUpdate>('status-change', (data) => {
  if (data) {
    console.log(`Status: ${data.status} at ${data.timestamp}`);
  }
});
```

### Type-safe Handlers

Handlers receive `data` as `T | undefined` because clients may send requests or messages without data.

```typescript
interface CalculateRequest {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

interface CalculateResponse {
  result: number;
}

const messenger = new MessengerServer('calculator', self);

// Type-safe handler - data parameter is CalculateRequest | undefined
messenger.bind<CalculateRequest>('calculate', (data) => {
  if (!data) {
    return { result: 0 };
  }

  switch (data.operation) {
    case 'add':
      return { result: data.a + data.b };
    case 'subtract':
      return { result: data.a - data.b };
    case 'multiply':
      return { result: data.a * data.b };
    case 'divide':
      return { result: data.a / data.b };
  }
});

// Client side - response is typed as CalculateResponse
const client = new MessengerClient();
await client.connect('calculator', self);

const response = await client.req<CalculateResponse>('calculate', {
  operation: 'add',
  a: 5,
  b: 3
});

console.log(response.result); // TypeScript knows about result property
```

## License

MIT
