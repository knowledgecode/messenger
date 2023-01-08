import { expectType } from 'tsd';
import { MessengerClient, MessengerServer } from '../../src/index';

const client = new MessengerClient();

expectType<Promise<void>>(client.connect('server'));
expectType<Promise<void>>(client.connect('server', self));
expectType<Promise<void>>(client.connect('server', self, { targetOrigin: '*', timeout: 1 }));

expectType<void>(client.disconnect());

expectType<void>(client.send('topic'));
expectType<void>(client.send('topic', {}));

expectType<Promise<unknown>>(client.req('topic'));
expectType<Promise<unknown>>(client.req('topic', {}));

expectType<void>(client.subscribe('topic', data => console.log(data)));

expectType<void>(client.unsubscribe('topic', data => console.log(data)));
expectType<void>(client.unsubscribe('topic'));
expectType<void>(client.unsubscribe());

const server = new MessengerServer('server', self);

expectType<boolean>(server.bind('topic', data => console.log(data)));

expectType<void>(server.unbind('topic'));

expectType<void>(server.publish('topic'));
expectType<void>(server.publish('topic', {}));

expectType<void>(server.close());
