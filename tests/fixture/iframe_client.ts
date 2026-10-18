import { MessengerClient } from '@/index.ts';

(async () => {
  const messenger = new MessengerClient();

  await messenger.connect('iframe', self);

  messenger.send('foo', 'bar');

  messenger.subscribe<string>('command', data => {
    if (data === 'stop') {
      messenger.send('stopped');
      messenger.disconnect();
    }
  });

  // Rejects when a test leaves 'add' unbound, or when the 'command' listener disconnects first.
  await messenger.req<number>('add', { x: 3, y: 4 })
    .catch(() => undefined);
  messenger.disconnect();
})();
