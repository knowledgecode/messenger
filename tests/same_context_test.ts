import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { MessengerClient, MessengerServer } from '@/index.ts';

describe('MessengerClient and MessengerServer (same context)', () => {
  let server: MessengerServer;
  let client: MessengerClient;

  beforeEach(() => {
    server = new MessengerServer('same-context', self);
    client = new MessengerClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    client.disconnect();
    server.close();
  });

  it('send without data', async () => {
    await client.connect('same-context', self);

    const received = new Promise<unknown>(resolve => {
      server.bind('ping', (data) => {
        resolve(data);
      });
    });

    client.send('ping');
    await expect(received).resolves.toBeUndefined();
  });

  it('req to an unbound topic', async () => {
    await client.connect('same-context', self);

    await expect(client.req('missing'))
      .rejects.toThrow('Topic is not bound.');
  });

  it('req to a handler that throws synchronously', async () => {
    server.bind('fail', () => {
      throw new Error('Handler failed.');
    });
    await client.connect('same-context', self);

    await expect(client.req('fail'))
      .rejects.toThrow('Handler failed.');
  });

  it('disconnect rejects pending requests', async () => {
    server.bind('pending', () => new Promise(() => {}));
    await client.connect('same-context', self);

    const pending = client.req('pending');

    client.disconnect();
    await expect(pending).rejects.toThrow('Disconnected.');
  });

  it('disconnect before the connection is acknowledged', async () => {
    const connecting = client.connect('same-context', self);

    client.disconnect();
    expect(() => client.send('ping'))
      .toThrow('Not connected.');
    await expect(connecting).rejects.toThrow('Disconnected.');
  });

  it('unsubscribe stops publishing to the client', async () => {
    const postMessage = vi.spyOn(MessagePort.prototype, 'postMessage');

    server.bind('echo', data => data);
    await client.connect('same-context', self);

    // Each req('echo') round trip guarantees the server has processed the preceding subscribe / unsubscribe.
    client.subscribe('say', () => {});
    await client.req('echo');
    postMessage.mockClear();
    server.publish('say', 'hello');
    expect(postMessage).toHaveBeenCalledOnce();

    client.unsubscribe('say');
    await client.req('echo');
    postMessage.mockClear();
    server.publish('say', 'hello');
    expect(postMessage).not.toHaveBeenCalled();
  });
});
