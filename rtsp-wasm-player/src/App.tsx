import React, {useEffect, useState} from 'react';
import './App.css';
import {useWebsocket} from "./hooks/useWebsocket";
import {useWasm} from "./hooks/useWasm";

export const WS_SUBSCRIBE_STREAM_DATA = '/user/topic/stream-data/real-time';
export const WS_SEND_RTSP_URL = '/app/rtsp-url';
export const STOMP_URL = '/stomp/endpoint';
export const WASM_URL = '/wasm/ffmpeg.wasm';

const App = () => {
    const [rtspUrl, setRtspUrl] = useState<string>('rtsp://192.168.10.174:8554/rtsp/live1');
    const {connected, connect, subscribe, send} = useWebsocket({url: STOMP_URL});
    const {loading, error, instance} = useWasm({url: WASM_URL});
    const [wasmInstance, setWasmInstance] = useState<WebAssembly.Instance>();

    useEffect(() => {
        if (!connected) {
            connect();
        }
    }, []);

    useEffect(() => {
        if (!loading) {
            if (error) {
                console.log(error);
            } else {
                console.log(instance?.exports)
                setWasmInstance(instance)
            }
        }
    }, [loading]);


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