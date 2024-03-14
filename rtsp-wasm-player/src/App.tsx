import React, {useEffect, useState} from 'react';
import './App.css';
import {useWebsocket} from "./hooks/useWebsocket";
import {StompSubscription} from "@stomp/stompjs/src/stomp-subscription";

export const WS_SUBSCRIBE_STREAM_DATA = '/user/topic/stream-data/real-time';
export const WS_SEND_RTSP_URL = '/app/rtsp-url';
export const STOMP_URL = '/stomp/endpoint';

const App = () => {
    const [rtspUrl, setRtspUrl] = useState<string>('rtsp://192.168.10.174:8554/rtsp/live1');
    const {connected, connect, subscribe, send} = useWebsocket({url: STOMP_URL});

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
            subscribe(WS_SUBSCRIBE_STREAM_DATA, onReceiveData, {});
        }
    }

    const onReceiveData = (message: any) => {
        const data = JSON.parse(message.body);
        console.log(data);
    }

    return (
        <div className="root">
            <div className="header">
                <h1>rtsp wasm player</h1>
                <div className="form">
                    <label>rtspUrl:</label>
                    <input className="form-input" onChange={onRtspUrlChange} defaultValue={rtspUrl}/>
                    <button className="form-btn" onClick={onOpen}>Open</button>
                </div>
            </div>
            <div className="video">
            </div>
        </div>
    );
}

export default App;