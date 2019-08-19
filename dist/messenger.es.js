export let Messenger = parent.Messenger;

if (window === parent && !window.Messenger) {
    const UUID = () => Math.random().toString(36).slice(2);
    const channel = UUID();
    const listeners = {};
    const subscribers = {};
    const reps = {};

    window.addEventListener('message', evt => {
        if (evt.origin !== location.origin || !evt.data || evt.data.channel !== channel) {
            return;
        }

        const payload = evt.data.payload;
        const id = payload.id;
        const topic = payload.topic;
        const data = payload.data;

        switch (evt.data.method) {
        case 'send':
            if (listeners[topic]) {
                reps[id].resolve(listeners[topic](data));
            } else {
                reps[id].reject();
            }
            break;
        case 'publish':
            for (const sub of subscribers[topic] || []) {
                sub(data);
            }
            reps[id].resolve();
            break;
        }
        delete reps[id];
        evt.stopImmediatePropagation();
    }, { capture: true, passive: true });

    Messenger = class {
        send (topic, data) {
            return new Promise((resolve, reject) => {
                const id = UUID();
                const payload = { id, topic, data };

                reps[id] = { resolve, reject };
                parent.postMessage({ channel, method: 'send', payload }, location.href);
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
            return new Promise((resolve, reject) => {
                const id = UUID();
                const payload = { id, topic, data };

                reps[id] = { resolve, reject };
                parent.postMessage({ channel, method: 'publish', payload }, location.href);
            });
        }

        subscribe (topic, listener) {
            const subs = subscribers[topic] = subscribers[topic] || [];

            subs[subs.length] = listener;
            return () => {
                const index = subs.indexOf(listener);

                if (~index) {
                    subs.splice(index, 1);
                    if (!subs.length) {
                        delete subscribers[topic];
                    }
                }
            };
        }
    };

    window.Messenger = Messenger;
}
