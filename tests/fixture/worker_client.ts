import { MessengerClient } from '@/index.ts';

(async () => {
  const messenger = new MessengerClient();

  await messenger.connect('worker', self);

  messenger.send('foo', 'bar');

  messenger.subscribe<string>('command', data => {
    if (data === 'stop') {
      messenger.disconnect();
    }
  });

  await messenger.req<number>('add', { x: 3, y: 4 })
    .then(() => messenger.disconnect());
})();
