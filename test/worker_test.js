/*global describe, beforeEach, afterEach, it, expect */
import { MessengerClient, MessengerServer } from '/base/dist/esm/messenger.js';

describe('MessengerClient (worker)', () => {
    beforeEach(() => {
        self.worker = new Worker('/base/test/fixture/worker_server.js');
    });

    afterEach(done => {
        setTimeout(() => {
            self.worker.terminate();
            done();
        }, 500);
    });

    it('connect', async () => {
        const messenger = new MessengerClient();

        await messenger.connect('worker', self.worker);
    });

    it('connect failed1', async () => {
        const messenger = new MessengerClient();

        await messenger.connect('worker', {})
            .catch(e => expect(e.message).to.equal('The endpoint has no postMessage method.'));
    });

    it('connect failed2', async () => {
        const messenger = new MessengerClient();

        await messenger.connect('worker', self.worker, { timeout: 1 })
            .catch(e => expect(e.message).to.equal('Connection timed out.'));
    });

    it('send', async () => {
        const messenger = new MessengerClient();

        await messenger.connect('worker', self.worker);

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

        await messenger.connect('worker', self.worker);

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

        await messenger.connect('worker', self.worker);

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

        await messenger.connect('worker', self.worker);

        messenger.subscribe('say', listener);
        messenger.unsubscribe('say', listener);
    });

    it('disconnect', async () => {
        const messenger = new MessengerClient();

        await messenger.connect('worker', self.worker);

        messenger.disconnect();
    });
});

describe('MessengerServer (worker)', () => {
    beforeEach(() => {
        self.worker = new Worker('/base/test/fixture/worker_client.js');
        self.messenger = new MessengerServer('worker', self.worker);
    });

    afterEach(() => self.messenger.close());

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
