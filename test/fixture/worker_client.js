importScripts('/base/dist/umd/messenger.js');

const { MessengerClient } = self.messenger;

(async () => {
    const messenger = new MessengerClient();

    await messenger.connect(self);

    messenger.send('foo', 'bar');

    messenger.subscribe('command', data => {
        if (data === 'stop') {
            messenger.disconnect();
            self.stop();
        }
    });

    await messenger.req('add', { x: 3, y: 4 })
        .then(() => {
            messenger.disconnect();
            self.stop();
        });
})();
