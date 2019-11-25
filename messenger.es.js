/**
 * @preserve messenger (c) KNOWLEDGECODE | MIT
 */
export let messenger = parent.messenger;

if (window === parent && !window.messenger) {
    const UUID = () => Math.random().toString(36).slice(2);
    const channel = UUID();
    const listeners = {};
    const subscribers = {};
    const reps = {};
    const promise = data => {
        if (data instanceof Promise) {
            return data;
        }
        return Promise.resolve(data);
    };
    const nowait = queueMicrotask || (fn => Promise.resolve().then(fn));

    window.addEventListener('message', evt => {
        if (evt.origin !== location.origin || !evt.data || evt.data.channel !== channel) {
            return;
        }
        evt.stopImmediatePropagation();

        const payload = evt.data.payload;
        const id = payload.id || '';
        const topic = payload.topic;
        const data = payload.data;
        const timeout = payload.timeout || 0;

        switch (evt.data.method) {
        case 'send':
            const rep = reps[id];

            if (listeners[topic]) {
                (() => {
                    if (timeout > 0) {
                        return Promise.race([
                            promise(listeners[topic](data)),
                            new Promise((_, reject) => setTimeout(reject, timeout))
                        ]);
                    }
                    return promise(listeners[topic](data));
                })().then(res => rep.resolve(res)).catch(err => rep.reject(err));
            } else {
                rep.reject();
            }
            delete reps[id];
            break;
        case 'publish':
            for (const subsc of subscribers[topic] || []) {
                nowait(() => subsc(data));
            }
            break;
        }
    }, { capture: true, passive: true });

    messenger = new (class {
        send (topic, data, timeout = 0) {
            return new Promise((resolve, reject) => {
                const id = UUID();
                const payload = { id, topic, data, timeout };

                reps[id] = { resolve, reject };
                parent.postMessage({ channel, method: 'send', payload }, location.origin);
            });
        }

        bind (topic, listener) {
            if (listeners[topic]) {
                return undefined;
            }
            listeners[topic] = listener;
            return () => delete listeners[topic];
        }

        publish (topic, data) {
            parent.postMessage({ channel, method: 'publish', payload: { topic, data } }, location.origin);
        }

        subscribe (topic, listener) {
            const subsc = subscribers[topic] = subscribers[topic] || [];

            subsc[subsc.length] = listener;
            return () => {
                const index = subsc.indexOf(listener);

                if (~index) {
                    subsc.splice(index, 1);
                    if (!subsc.length) {
                        delete subscribers[topic];
                    }
                }
            };
        }
    })();

    window.messenger = messenger;
}
