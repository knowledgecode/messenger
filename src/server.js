const promise = p => p instanceof Promise ? p : Promise.resolve(p);

export class Server {
    constructor (name, endpoint = self) {
        this._clients = new Map();
        this._listeners = new Map();
        this._subscribers = new Map();
        this._endpoint = endpoint;
        this._accept = evt => {
            const { name: _name, method } = evt.data || {};
            const [ port ] = evt.ports || [];

            if (name !== _name || method !== 'connect' || !port) {
                return;
            }
            evt.stopImmediatePropagation();

            const client = Math.random().toString(36).slice(2);

            port.onmessage = _evt => this._listener(_evt);
            this._clients.set(client, port);
            port.postMessage({ method: 'ack', payload: { client } });
        };

        this._endpoint.addEventListener('message', this._accept);
    }

    _listener (evt) {
        const { method } = evt.data || {};
        const { client, id, topic, data } = (evt.data || {}).payload || {};

        switch (method) {
        case 'send':
            if (this._listeners.has(topic)) {
                this._listeners.get(topic)(data);
            }
            break;
        case 'request':
            if (this._listeners.has(topic)) {
                promise(this._listeners.get(topic)(data))
                    .then(res => this._postMessage(client, 'reply', id, topic, res))
                    .catch(e => this._postMessage(client, 'reply', id, topic, undefined, e));
            } else {
                this._postMessage(client, 'reply', id, topic, undefined, 'Topic is not bound.');
            }
            break;
        case 'subscribe':
            const subscribers = this._subscribers.get(topic) || new Set();

            subscribers.add(client);
            this._subscribers.set(topic, subscribers);
            break;
        case 'disconnect':
            if (this._clients.has(client)) {
                this._clients.get(client).close();
                this._clients.delete(client);
            }
            break;
        }
    }

    _postMessage (client, method, id, topic, data, error) {
        const port = this._clients.get(client);

        if (port) {
            port.postMessage({ method, payload: { id, topic, data, error } });
        }
    }

    bind (topic, listener) {
        if (this._listeners.has(topic)) {
            return false;
        }
        this._listeners.set(topic, listener);
        return true;
    }

    unbind (topic) {
        this._listeners.delete(topic);
    }

    publish (topic, data) {
        const subscribers = this._subscribers.get(topic);

        if (subscribers) {
            for (const client of subscribers.values()) {
                this._postMessage(client, 'publish', '', topic, data);
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

        this._endpoint.removeEventListener('message', this._accept);
        this._endpoint = undefined;
    }
}
