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
npm i knowledgecode@messenger
```

## Usage

```javascript
import { MessengerClient, MessengerServer } from 'knowledgecode@messenger';
```

ES Modules:

```html
<script type="module">
  import { MessengerClient, MessengerServer } from '/path/to/messenger.js';
</script>
```

Traditional:

```html
<script src="/path/to/messenger.js"></script>
<script>
  // It is provided with the global variable name "messenger".
  const { MessengerClient, MessengerServer } = self.messenger;
</script>
```

## Simple Example

main.js
```javascript
import { MessengerClient } from '/path/to/messenger.js';

const messenger = new MessengerClient();
const worker = new Worker('/path/to/worker.js');

(async () => {
    await messenger.connect(worker);

    const answer = await messenger.req('add', { x: 2, y: 3 });

    console.log(answer);    // => 5

    messenger.send('close');
    messenger.disconnect();
})();
```

worker.js
```javascript
importScripts('/path/to/messenger.js');

const { MessengerServer } = self.messenger;
const messenger = new MessengerServer(self);

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

### `connect([endpoint[, options]])`

- {**Object**} [endpoint] - an object that actually executes the `postMessage()`
- {**Object**} [options] - connection options

The `MessengerClient` must connect to a `MessengerServer` via `endpoint` before communication can begin. The `endpoint` is the object that actually executes the `postMessage()`. If omitted, it is assumed that `self` is set. The `options` are connection options and members of this object are `targetOrigin` and `timeout` (msec). If the `timeout` is omitted, this method waits forever for a successful connection.

```javascript
// To connect from the main window to a iframe.
const iframe = window.frames[0];

await messenger.connect(iframe, { targetOrigin: '*', timeout: 1000 })
    .catch(e => console.log(e));
```

```javascript
// To connect from the main window to a worker.
const worker = new Worker('/path/to/worker.js');

await messenger.connect(worker, { timeout: 1000 })
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

### `constructor([endpoint])`

- {**Object**} [endpoint] - an object that actually executes the `postMessage()`

```javascript
const messenger = new MessengerServer(self);
```

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
