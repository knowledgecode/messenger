export class Client {
    constructor () {
        this._id = undefined;
        this._port = undefined;
        this._reps = new Map();
        this._subscribers = new Map();
    }

    _listener (evt) {
        const { method } = evt.data || {};
        const { id, topic, data, error } = (evt.data || {}).payload || {};

        switch (method) {
        case 'reply':
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
        case 'publish':
            const subscribers = this._subscribers.get(topic);

            if (subscribers) {
                for (const listener of subscribers.values()) {
                    listener(data);
                }
            }
            break;
        }
    }

    _postMessage (method, id, topic, data) {
        this._port.postMessage({ method, payload: { client: this._id, id, topic, data } });
    }

    connect (name, endpoint = self, options = {}) {
        if (this._port) {
            return Promise.resolve();
        }
        if (!('postMessage' in endpoint)) {
            return Promise.reject(new Error('The endpoint has no postMessage method.'));
        }
        return new Promise((resolve, reject) => {
            const { port1, port2 } = new MessageChannel();
            const { targetOrigin, timeout } = options;
            const timerId = timeout > 0 ? setTimeout(() => {
                this._port.close();
                this._port = undefined;
                reject(new Error('Connection timed out.'));
            }, timeout) : 0;

            this._port = port1;
            this._port.onmessage = evt => {
                const { method } = evt.data || {};
                const { client } = (evt.data || {}).payload || {};

                if (method === 'ack') {
                    this._id = client;
                    this._port.onmessage = _evt => this._listener(_evt);
                    if (timerId) {
                        clearTimeout(timerId);
                    }
                    resolve();
                }
            };
            endpoint.postMessage({ name, method: 'connect' }, { targetOrigin: targetOrigin || '/', transfer: [port2] });
        });
    }

    disconnect () {
        if (this._port) {
            this._postMessage('disconnect');
            this._port.close();
            this._port = undefined;
        }
        this._reps.clear();
        this.unsubscribe();
    }

    send (topic, data) {
        if (!this._port) {
            throw new Error('No connected.');
        }
        this._postMessage('send', '', topic, data);
    }

    req (topic, data, timeout = 0) {
        return new Promise((resolve, reject) => {
            if (!this._port) {
                reject(new Error('No connected.'));
                return;
            }

            const id = Math.random().toString(36).slice(2);
            const timerId = timeout > 0 ? setTimeout(() => {
                const rep = this._reps.get(id);

                if (rep) {
                    rep.reject(new Error('Request timed out.'));
                    this._reps.delete(id);
                }
            }, timeout) : 0;

            this._reps.set(id, { resolve, reject, timerId });
            this._postMessage('request', id, topic, data);
        });
    }

    subscribe (topic, listener) {
        if (!this._port) {
            throw new Error('No connected.');
        }

        const subscribers = this._subscribers.get(topic) || new Set();

        subscribers.add(listener);
        this._subscribers.set(topic, subscribers);

        this._postMessage('subscribe', '', topic);
    }

    unsubscribe (topic, listener) {
        if (listener) {
            const subscribers = this._subscribers.get(topic);

            if (subscribers) {
                subscribers.delete(listener);
            }
        } else if (topic) {
            this._subscribers.delete(topic);
        } else {
            this._subscribers.clear();
        }
    }
}
