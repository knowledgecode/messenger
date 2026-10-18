import { MessengerServer } from '@/index.ts';

const messenger = new MessengerServer('iframe', self);

messenger.bind<{ x: number; y: number }>('add', data => {
  return data && data.x + data.y;
});

// The publish is posted ahead of the reply on the same port, so subscribers receive it before req('greet') resolves.
messenger.bind('greet', () => {
  messenger.publish('say', 'hello');
});
