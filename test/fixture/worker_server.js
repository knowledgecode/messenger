importScripts('/base/dist/umd/messenger.js');

const { MessengerServer } = self.messenger;

const messenger = new MessengerServer(self);

messenger.bind('add', data => data.x + data.y);

// Delay publishing slightly to wait for connections from subscribers.
setTimeout(() => messenger.publish('say', 'hello'), 500);
