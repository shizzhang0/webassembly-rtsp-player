import React, {useEffect, useState} from 'react';
import './App.css';
import {useWebsocket} from "./hooks/useWebsocket";
import {StompSubscription} from "@stomp/stompjs/src/stomp-subscription";

export const WS_SUBSCRIBE_STREAM_DATA = '/user/topic/steam-data/real-time';
export const WS_SEND_RTSP_URL = '/app/rtsp-url';
export const STOMP_URL = '/stomp/endpoint';

const App = () => {
    const [rtspUrl, setRtspUrl] = useState<string>('');
    const [logInfo, setLogInfo] = useState<string>('');
    const {connected, connect, subscribe, send} = useWebsocket({url: STOMP_URL});
    const [subscription, setSubscription] = useState<StompSubscription | null>();

    useEffect(() => {
        if (!connected) {
            connect();
        }
    }, []);


    const onRtspUrlChange = (event: any) => {
        setRtspUrl(event.target.value);
    }

    const onOpen = () => {
        if (connected) {
            send(WS_SEND_RTSP_URL, {}, rtspUrl);
            let stompSubscription = subscribe(WS_SUBSCRIBE_STREAM_DATA, onMessage, {});
            setSubscription(stompSubscription);
        }
    }

    const onMessage = (message: any) => {
        const data = JSON.parse(message.body);
        setLogInfo(data);
        console.log(data);
    }

    return (
        <div className="root">
            <div className="header">
                <h1>rtsp wasm player</h1>
                <div className="form">
                    <label>rtspUrl:</label>
                    <input className="form-input" onChange={onRtspUrlChange}/>
                    <button className="form-btn" onClick={onOpen}>Open</button>
                </div>
            </div>
            <div className="video">
            </div>
            <div className="log">
                <p>{logInfo}</p>
            </div>
        </div>
    );
}

export default App;