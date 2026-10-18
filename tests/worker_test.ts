import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { MessengerClient, MessengerServer } from '@/index.ts';

describe('MessengerClient (worker)', () => {
  let worker: Worker;

  beforeEach(() => {
    worker = new Worker('/tests/fixture/worker_server.ts', { type: 'module' });
  });

  afterEach(() => {
    worker.terminate();
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

    const received = new Promise<string | undefined>(resolve => {
      messenger.subscribe<string>('say', (res) => {
        resolve(res);
      });
    });

    await messenger.req('greet');
    await expect(received).resolves.toBe('hello');
  });

  it('subscribe without connection', () => {
    const messenger = new MessengerClient();

    expect(() => messenger.subscribe('say', () => {}))
      .toThrow('Not connected.');
  });

  it('unsubscribe', async () => {
    const messenger = new MessengerClient();
    const listener = vi.fn();

    await messenger.connect('worker', worker);

    messenger.subscribe('say', listener);
    messenger.unsubscribe('say', listener);
    await messenger.req('greet');

    expect(listener).not.toHaveBeenCalled();
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

  afterEach(() => {
    messenger.close();
    worker.terminate();
  });

  it('send (bind)', async () => {
    const data = await new Promise<string | undefined>(resolve => {
      messenger.bind<string>('foo', (req) => {
        resolve(req);
      });
    });

    expect(data).toBe('bar');
  });

  it('reply (bind)', async () => {
    const data = await new Promise<{ x: number; y: number } | undefined>(resolve => {
      messenger.bind<{ x: number; y: number }>('add', (req) => {
        resolve(req);
        return req ? req.x + req.y : 0;
      });
    });

    expect(data).toEqual({ x: 3, y: 4 });
  });

  it('publish', async () => {
    await new Promise<void>(resolve => {
      messenger.bind('stopped', () => {
        resolve();
      });
      // The client subscribes to 'command' before requesting 'add', so a publish from this handler reaches it.
      messenger.bind('add', () => {
        messenger.publish('command', 'stop');
        return 0;
      });
    });
  });
});

describe('MessengerClient (worker) - connection timeout', () => {
  let worker: Worker;

  beforeEach(() => {
    worker = new Worker('/tests/fixture/worker_server.ts', { type: 'module' });
  });

  afterEach(() => {
    worker.terminate();
  });

  it('connect timeout', async () => {
    const messenger = new MessengerClient();

    await expect(messenger.connect('nonexistent-server', worker, { timeout: 1 }))
      .rejects.toThrow('Connection timed out.');
  });
});
