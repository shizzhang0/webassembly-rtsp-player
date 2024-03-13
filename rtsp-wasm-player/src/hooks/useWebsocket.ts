import {useState} from 'react';
import {CompatClient, messageCallbackType, Stomp} from '@stomp/stompjs';
import {StompHeaders} from '@stomp/stompjs/src/stomp-headers';
import {StompSubscription} from '@stomp/stompjs/src/stomp-subscription';
import SockJS from 'sockjs-client';

export interface UseWebSocketProps {
    url: string;
}


export type UseWebSocketType = {
    connected?: boolean;
    connect: () => void;
    resetConnect: () => void;
    subscribe: (
        destination: string,
        callback: messageCallbackType,
        headers: StompHeaders
    ) => StompSubscription | null;
    unsubscribe: (id: string, headers: StompHeaders) => void;
    send: (destination: string, headers: StompHeaders, data: any) => void;
};


export const useWebsocket = (props: UseWebSocketProps): UseWebSocketType => {

    const [stompClient, setStompClient] = useState<CompatClient | undefined>();
    const [connected, setConnected] = useState<boolean>(false);

    let retryConnectCount = 0;

    const handleConnect = () => {
        if (!stompClient || !stompClient.connected) {
            const sock = new SockJS(props.url, null, {
                timeout: 50000,
            });
            const stomp = Stomp.over(sock);

            setStompClient(stomp);

            stomp.debug = () => {
            };
            let headers = {};
            stomp.connect(
                headers,
                (frame: any) => {
                    console.log('websocket connect success', frame);
                    setConnected(true);
                    retryConnectCount = 0;
                },
                handleConnectError,
                handleConnectClose
            );
        }
    };

    const handleConnectError = () => {
        console.log('websocket connect fail');
        setConnected(false);
        retryConnect();
    };

    const handleConnectClose = () => {
        console.log('websocket connect close');
        setConnected(false);
        retryConnect();
    };


    const retryConnect = () => {
        console.log('[' + (retryConnectCount + 1) + '] reconnect websocket');
        if (retryConnectCount <= 20) {
            handleConnect();
            retryConnectCount += 1;
        } else {
            console.warn(
                'has reconnect [' +
                (retryConnectCount + 1) +
                '] times and will not reconnect automatically'
            );
        }
    };


    const resetConnect = (): boolean => {
        if (connected) {
            return true;
        }

        retryConnectCount = 0;
        retryConnect();
        return !!stompClient;
    };


    const subscribe = (
        destination: string,
        callback: messageCallbackType,
        headers: StompHeaders = {}
    ): StompSubscription | null => {
        let subscription: StompSubscription | null = null;
        if (stompClient) {
            subscription = stompClient.subscribe(
                destination,
                callback,
                headers
            );
        }
        return subscription;
    };


    const unsubscribe = (id: string, headers: StompHeaders = {}): void => {
        if (stompClient) {
            stompClient.unsubscribe(id);
        }
    };

    const send = (
        destination: string,
        headers: StompHeaders = {},
        data: any
    ) => {
        console.log('send', data);
        if (stompClient && connected && data) {
            stompClient?.send?.(destination, {}, data);
        }
    };

    return {
        connected,
        connect: handleConnect,
        resetConnect,
        subscribe,
        unsubscribe,
        send
    }

}