import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { MessengerClient, MessengerServer } from '@/index.ts';

describe('MessengerClient (iframe)', () => {
  beforeEach(async () => {
    await new Promise<void>(resolve => {
      const iframe = document.createElement('iframe');

      iframe.src = '/tests/fixture/iframe_server.html';
      iframe.onload = () => resolve();
      document.body.appendChild(iframe);
    });
  });

  afterEach(() => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      document.body.removeChild(iframe);
    }
  });

  it('connect', async () => {
    const messenger = new MessengerClient();
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentWindow) {
      throw new Error('iframe not found');
    }

    await messenger.connect('iframe', iframe.contentWindow);
  });

  it('connect failed', async () => {
    const messenger = new MessengerClient();

    await expect(messenger.connect('iframe', {} as Window))
      .rejects.toThrow('The endpoint has no postMessage method.');
  });

  it('send', async () => {
    const messenger = new MessengerClient();
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentWindow) {
      throw new Error('iframe not found');
    }

    await messenger.connect('iframe', iframe.contentWindow);

    messenger.send('foo', 'bar');
  });

  it('send without connection', () => {
    const messenger = new MessengerClient();

    expect(() => messenger.send('foo', 'bar'))
      .toThrow('Not connected.');
  });

  it('req', async () => {
    const messenger = new MessengerClient();
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentWindow) {
      throw new Error('iframe not found');
    }

    await messenger.connect('iframe', iframe.contentWindow);

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
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentWindow) {
      throw new Error('iframe not found');
    }

    await messenger.connect('iframe', iframe.contentWindow);

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
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentWindow) {
      throw new Error('iframe not found');
    }

    await messenger.connect('iframe', iframe.contentWindow);

    messenger.subscribe('say', listener);
    messenger.unsubscribe('say', listener);
    await messenger.req('greet');

    expect(listener).not.toHaveBeenCalled();
  });

  it('disconnect', async () => {
    const messenger = new MessengerClient();
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentWindow) {
      throw new Error('iframe not found');
    }

    await messenger.connect('iframe', iframe.contentWindow);

    messenger.disconnect();
  });
});

describe('MessengerServer (iframe)', () => {
  let messenger: MessengerServer;

  beforeEach(async () => {
    await new Promise<void>(resolve => {
      const iframe = document.createElement('iframe');

      iframe.src = '/tests/fixture/iframe_client.html';
      iframe.onload = () => resolve();
      document.body.appendChild(iframe);

      messenger = new MessengerServer('iframe', window.frames[0]);
    });
  });

  afterEach(() => {
    messenger.close();
    const iframe = document.querySelector('iframe');
    if (iframe) {
      document.body.removeChild(iframe);
    }
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

describe('MessengerClient (iframe) - connection timeout', () => {
  let iframe: HTMLIFrameElement;

  beforeEach(async () => {
    await new Promise<void>(resolve => {
      iframe = document.createElement('iframe');
      iframe.src = 'about:blank';
      iframe.onload = () => resolve();
      document.body.appendChild(iframe);
    });
  });

  afterEach(() => {
    document.body.removeChild(iframe);
  });

  it('connect timeout', async () => {
    const messenger = new MessengerClient();
    if (!iframe.contentWindow) {
      throw new Error('iframe not found');
    }

    await expect(messenger.connect('nonexistent-server', iframe.contentWindow, { timeout: 1 }))
      .rejects.toThrow('Connection timed out.');
  });
});
