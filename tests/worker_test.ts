import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { MessengerClient, MessengerServer } from '@/index.ts';

describe('MessengerClient (worker)', () => {
  let worker: Worker;

  beforeEach(() => {
    worker = new Worker('/tests/fixture/worker_server.ts', { type: 'module' });
  });

  afterEach(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => {
        worker.terminate();
        resolve();
      }, 500);
    });
  });

  it('connect', async () => {
    const messenger = new MessengerClient();

    await messenger.connect('worker', worker);
  });

  it('connect failed', async () => {
    const messenger = new MessengerClient();

    await expect(messenger.connect('worker', {} as Worker))
      .rejects.toThrow('The endpoint has no postMessage method.');
  });

  it('send', async () => {
    const messenger = new MessengerClient();

    await messenger.connect('worker', worker);

    messenger.send('foo', 'bar');
  });

  it('send without connection', () => {
    const messenger = new MessengerClient();

    expect(() => messenger.send('foo', 'bar'))
      .toThrow('Not connected.');
  });

  it('req', async () => {
    const messenger = new MessengerClient();

    await messenger.connect('worker', worker);

    await messenger.req<number>('add', { x: 3, y: 2 })
      .then(res => expect(res).toBe(5));
  });

  it('req without connection', async () => {
    const messenger = new MessengerClient();

    await expect(messenger.req('add', { x: 3, y: 2 }))
      .rejects.toThrow('Not connected.');
  });

  it('subscribe', async () => {
    const messenger = new MessengerClient();

    await messenger.connect('worker', worker);

    messenger.subscribe<string>('say', (res) => {
      if (res) {
        expect(res).toBe('hello');
      }
    });
  });

  it('subscribe without connection', () => {
    const messenger = new MessengerClient();

    expect(() => messenger.subscribe('say', () => {}))
      .toThrow('Not connected.');
  });

  it('unsubscribe', async () => {
    const messenger = new MessengerClient();
    const listener = () => {};

    await messenger.connect('worker', worker);

    messenger.subscribe('say', listener);
    messenger.unsubscribe('say', listener);
  });

  it('disconnect', async () => {
    const messenger = new MessengerClient();

    await messenger.connect('worker', worker);

    messenger.disconnect();
  });
});

describe('MessengerServer (worker)', () => {
  let worker: Worker;
  let messenger: MessengerServer;

  beforeEach(() => {
    worker = new Worker('/tests/fixture/worker_client.ts', { type: 'module' });
    messenger = new MessengerServer('worker', worker);
  });

  afterEach(() => messenger.close());

  it('send (bind)', async () => {
    await new Promise<void>(resolve => {
      messenger.bind<string>('foo', (data) => {
        if (data) {
          expect(data).toBe('bar');
        }
        resolve();
      });
    });
  });

  it('reply (bind)', async () => {
    await new Promise<void>(resolve => {
      messenger.bind<{ x: number; y: number }>('add', (data) => {
        if (!data) {
          return 0;
        }
        expect(data).toEqual({ x: 3, y: 4 });
        resolve();
        return data.x + data.y;
      });
    });
  });

  it('publish', async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => {
        messenger.publish('command', 'stop');
        resolve();
      }, 500);
    });
  });
});

describe('MessengerClient (worker) - connection timeout', () => {
  let worker: Worker;

  beforeEach(() => {
    worker = new Worker('/tests/fixture/worker_server.ts', { type: 'module' });
  });

  afterEach(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => {
        worker.terminate();
        resolve();
      }, 500);
    });
  });

  it('connect timeout', async () => {
    const messenger = new MessengerClient();

    await expect(messenger.connect('nonexistent-server', worker, { timeout: 1 }))
      .rejects.toThrow('Connection timed out.');
  });
});
