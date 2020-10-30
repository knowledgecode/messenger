(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.messenger = factory());
}(this, (function () { 'use strict';

    /**
     * @preserve messenger (c) KNOWLEDGECODE | MIT
     */
    var messenger = parent.messenger;

    if (window === parent && !messenger) {
        var UUID = function () {
            return Math.random().toString(36).slice(2);
        };
        var channel = UUID();
        var target = location.origin === 'file://' || location.origin === 'null' ? '*' : location.origin;
        var origin = target === '*' ? 'null' : target;
        var listeners = {};
        var subscribers = {};
        var reps = {};
        var promise = function (data) {
            if (data instanceof Promise) {
                return data;
            }
            return Promise.resolve(data);
        };
        var forEach = function (arr, fn) {
            for (var i = 0, len = arr.length; i < len; i++) {
                fn(arr[i]);
            }
        };
        var nowait = window.queueMicrotask || window.setImmediate || function (fn) { Promise.resolve().then(fn); };

        window.addEventListener('message', function (evt) {
            if ((target !== '*' && evt.origin !== origin) || !evt.data || evt.data.channel !== channel) {
                return;
            }
            evt.stopImmediatePropagation();

            var payload = evt.data.payload;
            var id = payload.id || '';
            var topic = payload.topic;
            var data = payload.data;
            var timeout = payload.timeout || 0;

            switch (evt.data.method) {
            case 'send':
                var rep = reps[id];

                if (listeners[topic]) {
                    (function () {
                        if (timeout > 0) {
                            return Promise.race([
                                promise(listeners[topic](data)),
                                new Promise(function (_, reject) { setTimeout(reject, timeout); })
                            ]);
                        }
                        return promise(listeners[topic](data));
                    }())
                        .then(function (res) { rep.resolve(res); })
                        .catch(function (err) { rep.reject(err); });
                } else {
                    rep.reject();
                }
                delete reps[id];
                break;
            case 'publish':
                forEach(subscribers[topic] || [], function (subsc) {
                    nowait(function () { subsc(data); });
                });
                break;
            }
        }, { capture: true, passive: true });

        var Messenger = function () {
        };

        Messenger.prototype.send = function (topic, data, timeout) {
            return new Promise(function (resolve, reject) {
                var id = UUID();
                var payload = { id: id, topic: topic, data: data, timeout: timeout || 0 };

                reps[id] = { resolve: resolve, reject: reject };
                parent.postMessage({ channel: channel, method: 'send', payload: payload }, target);
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
            parent.postMessage({
                channel: channel, method: 'publish', payload: { topic: topic, data: data }
            }, target);
        };

        Messenger.prototype.subscribe = function (topic, listener) {
            var subsc = subscribers[topic] = subscribers[topic] || [];

            subsc[subsc.length] = listener;
            return function () {
                var index = subsc.indexOf(listener);

                if (~index) {
                    subsc.splice(index, 1);
                    if (!subsc.length) {
                        delete subscribers[topic];
                    }
                }
            };
        };

        messenger = window.messenger = new Messenger();
    }

    var messenger$1 = messenger;

    return messenger$1;

})));
