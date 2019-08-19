(function () {
    'use strict';

    if (window !== parent) {
        window.Messenger = parent.Messenger;
        return;
    }

    var UUID = function () {
        return Math.random().toString(36).slice(2);
    };
    var channel = UUID();
    var listeners = {};
    var subscribers = {};
    var reps = {};

    window.addEventListener('message', function (evt) {
        if (evt.origin !== location.origin || !evt.data || evt.data.channel !== channel) {
            return;
        }

        var payload = evt.data.payload;
        var id = payload.id;
        var topic = payload.topic;
        var data = payload.data;

        switch (evt.data.method) {
        case 'send':
            if (listeners[topic]) {
                reps[id].resolve(listeners[topic](data));
            } else {
                reps[id].reject();
            }
            break;
        case 'publish':
            for (var i = 0, len = (subscribers[topic] || []).length; i < len; i++) {
                subscribers[topic][i](data);
            }
            reps[id].resolve();
            break;
        }
        delete reps[id];
        evt.stopImmediatePropagation();
    }, { capture: true, passive: true });

    var Messenger = function () {
    };

    Messenger.prototype.send = function (topic, data) {
        return new Promise(function (resolve, reject) {
            var id = UUID();
            var payload = { id: id, topic: topic, data: data };

            reps[id] = { resolve: resolve, reject: reject };
            parent.postMessage({ channel: channel, method: 'send', payload: payload }, location.href);
        });
    };

    Messenger.prototype.bind = function (topic, listener) {
        if (listeners[topic]) {
            return undefined;
        }
        listeners[topic] = listener;
        return function () {
            delete listeners[topic];
        };
    };

    Messenger.prototype.publish = function (topic, data) {
        return new Promise(function (resolve, reject) {
            var id = UUID();
            var payload = { id: id, topic: topic, data: data };

            reps[id] = { resolve: resolve, reject: reject };
            parent.postMessage({ channel: channel, method: 'publish', payload: payload }, location.href);
        });
    };

    Messenger.prototype.subscribe = function (topic, listener) {
        var subs = subscribers[topic] = subscribers[topic] || [];

        subs[subs.length] = listener;
        return function () {
            var index = subs.indexOf(listener);

            if (~index) {
                subs.splice(index, 1);
                if (!subs.length) {
                    delete subscribers[topic];
                }
            }
        };
    };

    window.Messenger = Messenger;

}());
