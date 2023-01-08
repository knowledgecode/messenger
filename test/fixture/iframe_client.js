import { MessengerClient } from '/base/dist/esm/messenger.js';

(async () => {
    const messenger = new MessengerClient();

    await messenger.connect('iframe', self);

    messenger.send('foo', 'bar');

    messenger.subscribe('command', data => {
        if (data === 'stop') {
            messenger.disconnect();
        }
    });

    await messenger.req('add', { x: 3, y: 4 })
        .then(messenger.disconnect);
})();
