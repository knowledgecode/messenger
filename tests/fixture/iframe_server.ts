import { MessengerServer } from '@/index.ts';

const messenger = new MessengerServer('iframe', self);

messenger.bind<{ x: number; y: number }>('add', data => {
  return data && data.x + data.y;
});

// Delay publishing slightly to wait for connections from subscribers.
setTimeout(() => messenger.publish('say', 'hello'), 500);
