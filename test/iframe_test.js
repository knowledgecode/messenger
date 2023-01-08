/*global describe, beforeEach, afterEach, it, expect */
import { MessengerClient, MessengerServer } from '/base/dist/esm/messenger.js';

describe('MessengerClient (iframe)', () => {
    beforeEach(() => {
        return new Promise(resolve => {
            const iframe = document.createElement('iframe');

            iframe.src = '/base/test/fixture/iframe_server.html';
            iframe.onload = resolve;
            document.body.appendChild(iframe);
        });
    });

    afterEach(() => {
        document.body.removeChild(document.querySelector('iframe'));
    });

    it('connect', async () => {
        const messenger = new MessengerClient();
        const iframe = document.querySelector('iframe').contentWindow;

        await messenger.connect('iframe', iframe);
    });

    it('connect failed1', async () => {
        const messenger = new MessengerClient();

        await messenger.connect('iframe', {})
            .catch(e => expect(e.message).to.equal('The endpoint has no postMessage method.'));
    });

    it('connect failed2', async () => {
        const messenger = new MessengerClient();
        const iframe = document.querySelector('iframe').contentWindow;

        await messenger.connect('iframe', iframe, { timeout: 1 })
            .catch(e => expect(e.message).to.equal('Connection timed out.'));
    });

    it('send', async () => {
        const messenger = new MessengerClient();
        const iframe = document.querySelector('iframe').contentWindow;

        await messenger.connect('iframe', iframe);

        messenger.send('foo', 'bar');
    });

    it('send without connection', () => {
        const messenger = new MessengerClient();

        try {
            messenger.send('foo', 'bar');
        } catch (e) {
            expect(e.message).to.equal('No connected.');
        }
    });

    it('req', async () => {
        const messenger = new MessengerClient();
        const iframe = document.querySelector('iframe').contentWindow;

        await messenger.connect('iframe', iframe);

        await messenger.req('add', { x: 3, y: 2 })
            .then(res => expect(res).to.equal(5));
    });

    it('req without connection', async () => {
        const messenger = new MessengerClient();

        await messenger.req('add', { x: 3, y: 2 })
            .catch(e => expect(e.message).to.equal('No connected.'));
    });

    it('subscribe', async () => {
        const messenger = new MessengerClient();
        const iframe = document.querySelector('iframe').contentWindow;

        await messenger.connect('iframe', iframe);

        messenger.subscribe('say', res => expect(res).to.equal('hello'));
    });

    it('subscribe without connection', () => {
        const messenger = new MessengerClient();

        try {
            messenger.subscribe('say', res => console.log(res));
        } catch (e) {
            expect(e.message).to.equal('No connected.');
        }
    });

    it('unsubscribe', async () => {
        const messenger = new MessengerClient();
        const listener = res => console.log(res);
        const iframe = document.querySelector('iframe').contentWindow;

        await messenger.connect('iframe', iframe);

        messenger.subscribe('say', listener);
        messenger.unsubscribe('say', listener);
    });

    it('disconnect', async () => {
        const messenger = new MessengerClient();
        const iframe = document.querySelector('iframe').contentWindow;

        await messenger.connect('iframe', iframe);

        messenger.disconnect();
    });
});

describe('MessengerServer (iframe)', () => {
    beforeEach(() => {
        return new Promise(resolve => {
            const iframe = document.createElement('iframe');

            iframe.src = '/base/test/fixture/iframe_client.html';
            iframe.onload = resolve;
            document.body.appendChild(iframe);

            self.messenger = new MessengerServer('iframe', self.frames[0]);
        });
    });

    afterEach(() => {
        self.messenger.close();
        document.body.removeChild(document.querySelector('iframe'));
    });

    it('send (bind)', done => {
        self.messenger.bind('foo', data => {
            expect(data).to.equal('bar');
            done();
        });
    });

    it('reply (bind)', done => {
        self.messenger.bind('add', data => {
            expect(data).to.deep.equal({ x: 3, y: 4 });
            done();
            return data.x + data.y;
        });
    });

    it('publish', done => {
        setTimeout(() => {
            self.messenger.publish('command', 'stop');
            done();
        }, 500);
    });
});
