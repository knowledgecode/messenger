export type Endpoint = Window | Worker;

export type TopicListener<T = unknown> = (data?: T) => unknown;

export type Packet<T = unknown> = {
  method: 'ack';
  payload: {
    client: string;
  };
} | {
  method: 'reply';
  payload: {
    id: string;
    topic: string;
    data?: T;
    error?: Error;
  };
} | {
  method: 'publish';
  payload: {
    topic: string;
    data?: T;
  };
} | {
  method: 'connect';
  name: string;
} | {
  method: 'disconnect';
  payload: {
    client: string;
  };
} | {
  method: 'send';
  payload: {
    topic: string;
    data?: T;
  };
} | {
  method: 'request';
  payload: {
    client: string;
    id: string;
    topic: string;
    data?: T;
  };
} | {
  method: 'subscribe';
  payload: {
    client: string;
    topic: string;
  };
} | {
  method: 'unsubscribe';
  payload: {
    client: string;
    topic: string;
  };
};

const promise = (p: unknown): Promise<unknown> => p instanceof Promise ? p : Promise.resolve(p);

export class Server {
  private readonly _clients: Map<string, MessagePort>;

  private readonly _listeners: Map<string, TopicListener>;

  private readonly _subscribers: Map<string, Set<string>>;

  private _endpoint: Endpoint | undefined;

  private readonly _accept: (evt: MessageEvent<Packet>) => void;

  constructor (name: string, endpoint: Endpoint = self) {
    this._clients = new Map<string, MessagePort>();
    this._listeners = new Map<string, TopicListener>();
    this._subscribers = new Map<string, Set<string>>();
    this._endpoint = endpoint;
    this._accept = (evt: MessageEvent<Packet>) => {
      if (evt.data.method !== 'connect' || evt.data.name !== name) {
        return;
      }
      evt.stopImmediatePropagation();

      const [port] = evt.ports;
      const client = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      port.onmessage = (_evt: MessageEvent<Packet>) => this._listener(_evt);
      this._clients.set(client, port);
      port.postMessage({ method: 'ack', payload: { client } });
    };

    this._endpoint.addEventListener('message', this._accept as EventListener);
  }

  _listener (evt: MessageEvent<Packet>) {
    switch (evt.data.method) {
    case 'send': {
      const { topic, data } = evt.data.payload;
      this._listeners.get(topic)?.(data);
      break;
    }
    case 'request': {
      const { client, id, topic, data } = evt.data.payload;
      const listener = this._listeners.get(topic);

      if (listener) {
        promise(listener(data))
          .then(res => this._postMessage(client, {
            method: 'reply',
            payload: { id, topic, data: res }
          }))
          .catch((e: unknown) => this._postMessage(client, {
            method: 'reply',
            payload: { id, topic, error: e instanceof Error ? e : new Error(String(e)) }
          }));
      } else {
        this._postMessage(client, {
          method: 'reply',
          payload: { id, topic, error: new Error('Topic is not bound.') }
        });
      }
      break;
    }
    case 'subscribe': {
      const { client, topic } = evt.data.payload;
      const subscribers = this._subscribers.get(topic) ?? new Set<string>();

      subscribers.add(client);
      this._subscribers.set(topic, subscribers);
      break;
    }
    case 'unsubscribe': {
      const { client, topic } = evt.data.payload;
      const subscribers = this._subscribers.get(topic);

      subscribers?.delete(client);
      break;
    }
    case 'disconnect': {
      const { client } = evt.data.payload;

      this._clients.get(client)?.close();
      this._clients.delete(client);

      for (const subscriber of this._subscribers.values()) {
        subscriber.delete(client);
      }
      break;
    }
    }
  }

  _postMessage(client: string, message: Packet) {
    const port = this._clients.get(client);
    port?.postMessage(message);
  }

  bind<T = unknown>(topic: string, listener: TopicListener<T>) {
    if (this._listeners.has(topic)) {
      return false;
    }
    this._listeners.set(topic, listener as TopicListener);
    return true;
  }

  unbind (topic: string) {
    this._listeners.delete(topic);
  }

  publish(topic: string, data?: unknown) {
    const subscribers = this._subscribers.get(topic);

    if (subscribers) {
      const message = {
        method: 'publish' as const,
        payload: { topic, data }
      };

      for (const client of subscribers.values()) {
        this._postMessage(client, message);
      }
    }
  }

  close () {
    for (const client of this._clients.values()) {
      client.close();
    }
    this._clients.clear();
    this._listeners.clear();
    this._subscribers.clear();

    if (this._endpoint) {
      this._endpoint.removeEventListener('message', this._accept as EventListener);
      this._endpoint = undefined;
    }
  }
}
