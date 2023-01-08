import { MessengerServer } from '/base/dist/esm/messenger.js';

const messenger = new MessengerServer('iframe', self);

messenger.bind('add', data => data.x + data.y);

// Delay publishing slightly to wait for connections from subscribers.
setTimeout(() => messenger.publish('say', 'hello'), 500);
