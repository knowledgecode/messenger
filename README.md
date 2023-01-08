# Messenger

Messenger is a `Req/Rep` `Pub/Sub` library for iframes and workers.

## Features

Allows messages to be exchanged between ...

- the main window and one or more iframes / workers.
- multiple iframes.
- multiple components.

## Installation

via npm:

```shell
npm i @knowledgecode/messenger
```

## Usage

```javascript
import { MessengerClient, MessengerServer } from '@knowledgecode/messenger';
```

ES Modules:

```html
<script type="module">
  import { MessengerClient, MessengerServer } from '/path/to/esm/messenger.js';
</script>
```

Traditional:

```html
<script src="/path/to/umd/messenger.js"></script>
<script>
  // It is provided with the global variable name "messenger".
  const { MessengerClient, MessengerServer } = self.messenger;
</script>
```

## Simple Example

main.js
```javascript
import { MessengerClient } from '/path/to/esm/messenger.js';

const messenger = new MessengerClient();
const worker = new Worker('/path/to/worker.js');

(async () => {
    await messenger.connect('example', worker);

    const answer = await messenger.req('add', { x: 2, y: 3 });

    console.log(answer);    // => 5

    messenger.send('close');
    messenger.disconnect();
})();
```

worker.js
```javascript
importScripts('/path/to/umd/messenger.js');

const { MessengerServer } = self.messenger;
const messenger = new MessengerServer('example', self);

messenger.bind('add', data => {
    return data.x + data.y;
});

messenger.bind('close', () => {
    messenger.close();
    // Close this worker.
    self.close();
});
```

## MessengerClient API

### `constructor()`

```javascript
const messenger = new MessengerClient();
```

### `connect(name, [endpoint[, options]])`

- {**string**} name - unique name of the MessengerServer to connect to
- {**Object**} [endpoint] - an object that actually executes the `postMessage()`
- {**Object**} [options] - connection options

The `MessengerClient` must connect to a `MessengerServer` via `endpoint` before communication can begin. To identify the `MessengerServer` to connect to, pass the unique name of the `MessengerServer` as the first argument. The `endpoint` is the object that actually executes the `postMessage()`. If omitted, it is assumed that `self` is set. The `options` are connection options and members of this object are `targetOrigin` and `timeout` (msec). If the `timeout` is omitted, this method will wait forever for a successful connection.

```javascript
// To connect from the main window to a iframe.
const iframe = window.frames[0];

await messenger.connect('iframe', iframe, { targetOrigin: '*', timeout: 1000 })
    .catch(e => console.log(e));
```

```javascript
// To connect from the main window to a worker.
const worker = new Worker('/path/to/worker.js');

await messenger.connect('worker', worker, { timeout: 1000 })
    .catch(e => console.log(e));
```

### `disconnect()`

Disconnects from the server.

```javascript
messenger.disconnect();
```

### `send(topic[, data])`

- {**string**} topic - topic name
- {**Object**} [data] - an object to send

Sends a message (some object) to a topic. This method does not wait for any reply. A `MessengerServer` can receive the message if it is bound to the same topic name in advance.

```javascript
messenger.send('greeting', { hello: 'world' });
```

### `req(topic[, data[, timeout]])`

- {**string**} topic - topic name
- {**Object**} [data] - an object to send
- {**number**} [timeout] - timeout (msec)

Sends a message (some object) to a topic. This method waits for some reply unlike `send()`. If `timeout` (msec) is omitted, this method waits forever for some reply.

```javascript
const answer = await messenger.req('add', { x: 2, y: 3 })

console.log(answer);
```

```javascript
await messenger.req('add', { x: 2, y: 3 }, 5000)
    .catch(e => console.log(e));    // Catch timeout error.
```

### `subscribe(topic, listener)`

- {**string**} topic - topic name
- {**Function**} listener - a listener to receive published messages

Subscribes to messages on a topic.

```javascript
messenger.subscribe('news', data => console.log(data));
```

### `unsubscribe(topic[, listener])`

Unsubscribes to messages on a topic. If listener is omitted, all listeners for the topic are cleared.

- {**string**} topic - topic name
- {**Function**} [listener] - a listener to receive published messages

```javascript
const listener = data => console.log(data);
messenger.subscribe('news', listener);

messenger.unsubscribe('news', listener);
```

## MessengerServer API

### `constructor(name, [endpoint])`

- {**string**} name - unique name of the MessengerServer
- {**Object**} [endpoint] - an object that actually executes the `postMessage()`

```javascript
const messenger = new MessengerServer('server', self);
```

The `name` is a unique name by which clients identify this MessengerServer. The `endpoint` is the object that actually executes the `postMessage()`. If omitted, it is assumed that `self` is set.

### `bind(topic, listener)`

- {**string**} topic - topic name
- {**Function**} listener - a listener to receive messages

Binds a listener to listen for messages on a topic. The topic names must be unique, no other listener than the first can bind on the same topic name. This method returns `true` or `false` as binding result.

```javascript
messenger.bind('greeting', data => console.log(data));

messenger.bind('add', data => {
    // Reply to client.
    return data.x + data.y;
});
```

### `publish(topic, data)`

- {**string**} topic - topic name
- {**Object**} data - an object to publish

Publish a message (some object) to all subscribers on a topic. This method does not wait for reply from the subscribers, and also does not fail even there are no subscribers at all.

```javascript
messenger.publish('notification', 'The process completed successfully.');
```

### `close()`

Closes all connections and shuts down the server.

```javascript
messenger.close();
```

## Browser support

Chrome, Safari, Firefox, Edge

## License

MIT
