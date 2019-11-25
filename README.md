# messenger

This is a `Req/Rep` `Pub/Sub` library for the browser.

## Features

Messaging between ...

- components in one window
- a main window and iframes
- iframes in one window

## Caveats

The following messaging is not supported:

- cross-origin
- multiple main windows

## Installation

via npm:

```shell
npm install knowledgecode@messenger --save
```

This library assumes `Promise` is available. Running it on unsupported browsers, install a polyfill beforehand.

## Usage

ES Modules:

```javascript
import { messenger } from './dist/messenger.es.min.js';

messenger.send('topic', { msg: 'hello' });
```

Traditional:

```html
<script src="./dist/messenger.min.js"></script>
<script>
  messenger.send('topic', { msg: 'hello' });
</script>
```

## API

### send(topic, data[, timeout])

- {**string**} topic - topic name
- {**Object**} data - an object to send
- {**number**} [timeout] - reply timeout [ms]

Send a message (some object) to a topic. This method will return `Promise`. The 3rd parameter, `timeout`, is optional. If omit it or set to `0`, the `Promise` will forever wait for reply from the other.

### bind(topic, listener)

- {**string**} topic - topic name
- {**Function**} listener - a listener to receive messages, or null

Register a listener to wait for message on a topic. The topic name needs to be unique, listeners other than the first cannot bind on the same topic name. To unbind, call the function that this method will return.

### publish(topic, data)

- {**string**} topic - topic name
- {**Object**} data - an object to publish

Publish a message (some object) to all the subscribers on a topic. This method won't wait for reply from the subscribers, and won't be failed even there is no subscriber there.

### subscribe(topic, listener)

- {**string**} topic - topic name
- {**Function**} listener - a listener to receive delivered messages

Subscribe message on a topic. To unsubscribe, call the function that this method will return.

## Req / Rep

In Req / Rep model, we use `send()` and `bind()`.

At first, using the `bind()`, `server-side` waits for messages from `clients`, with a topic, *"addition"*:

```javascript
messenger.bind('addition', data => {
  return new Promise(resolve => {
    resolve(data.x + data.y);
  });
});
```

The `Promise` may be omitted:

```javascript
messenger.bind('addition', data => {
  return data.x + data.y;
});
```

`Client-side` sends a message to the topic. If no one is waiting for messages with the topic, the `send()` will be failed (`Promise` will be rejected).

```javascript
messenger.send('addition', {
  x: 2, y: 3
}).then(rep => {
  console.log(rep); // 5
});
```

Use a returned function to unbind the topic.

```javascript
const unbind = messenger.bind('addition', data => {
  return data.x + data.y;
});

// Unbind the "addition" topic.
unbind();
```

## Pub / Sub

In Pub / Sub model, we use `publish()` and `subscribe()`.

Use `subscribe()` to subscribe to a topic.

```javascript
messenger.subscribe('input', data => {
  console.log(`The ${data.key} is input!`); // The h key is input!
});
```

Use `publish()` to publish a message to a topic (one or more subscribers). Even there is no subscriber, this method won't be failed. Also this method won't receive any replies from subscribers.

```javascript
messenger.publish('input', {
  key: 'h', shift: false, ctrl: true
});
```

Use a returned function to unsubscribe from the topic.

```javascript
const unsubscribe = messenger.subscribe('input', data => {
  console.log(`The ${data.key} is input!`); // The h key is input!
});

// Unsubscribe the "input" topic.
unsubscribe();
```

## Browser support

Chrome, Firefox, Safari, Edge, IE9+

## License

MIT
