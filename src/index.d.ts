export class MessengerClient {
    constructor();
    connect(endpoint?: any, options?: { targetOrigin?: string, timeout?: number }): Promise<void>;
    disconnect(): void;
    send(topic: string, data?: any): void;
    req(topic: string, data?: any, timeout?: number): Promise<unknown>;
    subscribe(topic: string, listener: (data: unknown) => void): void;
    unsubscribe(topic?: string, listener?: (data: unknown) => void): void;
}

export class MessengerServer {
    constructor(endpoint?: any);
    bind(topic: string, listener: (data: unknown) => void): boolean;
    unbind(topic: string): void;
    publish(topic: string, data?: any): void;
    close(): void;
}
