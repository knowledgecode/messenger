import type { Endpoint, Packet, TopicListener } from './server.ts';

interface Receiver<T = unknown> {
  resolve: (data?: T) => void;
  reject: (reason: Error) => void;
  timerId: number;
}

interface ClientOptions {
  targetOrigin?: string;
  timeout?: number;
}

export class Client {
  private _id: string | undefined;

  private _port: MessagePort | undefined;

  private _connected: Promise<void> | undefined;

  private readonly _reps: Map<string, Receiver>;

  private readonly _subscribers: Map<string, Set<TopicListener>>;

  constructor () {
    this._id = undefined;
    this._port = undefined;
    this._connected = undefined;
    this._reps = new Map<string, Receiver>();
    this._subscribers = new Map<string, Set<TopicListener>>();
  }

  _listener (evt: MessageEvent<Packet>) {
    switch (evt.data.method) {
    case 'reply': {
      const { id, data, error } = evt.data.payload;
      const rep = this._reps.get(id);

      if (rep) {
        if (rep.timerId) {
          clearTimeout(rep.timerId);
        }
        if (error) {
          rep.reject(error);
        } else {
          rep.resolve(data);
        }
        this._reps.delete(id);
      }
      break;
    }
    case 'publish': {
      const { topic, data } = evt.data.payload;
      const subscribers = this._subscribers.get(topic);

      if (subscribers) {
        for (const listener of subscribers.values()) {
          listener(data);
        }
      }
      break;
    }
    }
  }

  _postMessage (message: Packet) {
    this._port?.postMessage(message);
  }

  connect (name: string, endpoint: Endpoint = self, options: ClientOptions = {}) {
    if (this._connected) {
      return this._connected;
    }
    if (!('postMessage' in endpoint)) {
      return Promise.reject(new Error('The endpoint has no postMessage method.'));
    }
    this._connected = new Promise<void>((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      const { targetOrigin, timeout } = options;
      const timerId = (timeout ?? 0) > 0 ? setTimeout(() => {
        this._port?.close();
        this._port = undefined;
        this._connected = undefined;
        reject(new Error('Connection timed out.'));
      }, timeout) : 0;
      const message: Packet = {
        method: 'connect',
        name
      };

      this._port = port1;
      this._port.onmessage = (evt: MessageEvent<Packet>) => {
        const { method } = evt.data;

        if (this._port && method === 'ack') {
          this._id = evt.data.payload.client;
          this._port.onmessage = (_evt: MessageEvent<Packet>) => this._listener(_evt);
          if (timerId) {
            clearTimeout(timerId);
          }
          resolve();
        }
      };
      endpoint.postMessage(message, { targetOrigin: targetOrigin ?? '*', transfer: [port2] });
    });

    return this._connected;
  }

  disconnect () {
    this.unsubscribe();
    for (const rep of this._reps.values()) {
      clearTimeout(rep.timerId);
    }
    this._reps.clear();
    if (this._id && this._port) {
      this._postMessage({
        method: 'disconnect',
        payload: { client: this._id }
      });
      this._port.close();
      this._port = undefined;
      this._id = undefined;
    }
    this._connected = undefined;
  }

  send (topic: string, data: unknown) {
    if (!this._port) {
      throw new Error('Not connected.');
    }
    this._postMessage({
      method: 'send',
      payload: { topic, data }
    });
  }

  req<T = unknown>(topic: string, data?: unknown, timeout = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this._id || !this._port) {
        reject(new Error('Not connected.'));
        return;
      }

      const id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const timerId = timeout > 0 ? self.setTimeout(() => {
        const rep = this._reps.get(id);

        if (rep) {
          rep.reject(new Error('Request timed out.'));
          this._reps.delete(id);
        }
      }, timeout) : 0;

      this._reps.set(id, { resolve, reject, timerId } as Receiver);
      this._postMessage({
        method: 'request',
        payload: { client: this._id, id, topic, data }
      });
    });
  }

  subscribe<T = unknown>(topic: string, listener: TopicListener<T>) {
    if (!this._id || !this._port) {
      throw new Error('Not connected.');
    }

    const subscribers = this._subscribers.get(topic) ?? new Set<TopicListener>();

    subscribers.add(listener as TopicListener);
    this._subscribers.set(topic, subscribers);

    this._postMessage({
      method: 'subscribe',
      payload: { client: this._id, topic }
    });
  }

  unsubscribe (topic?: string, listener?: TopicListener) {
    if (topic) {
      if (listener) {
        const subscribers = this._subscribers.get(topic);

        if (subscribers) {
          subscribers.delete(listener);
        }
      } else {
        this._subscribers.delete(topic);
      }
    } else {
      this._subscribers.clear();
    }
  }
}
