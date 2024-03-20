import React, {useEffect, useRef, useState} from 'react';
import './App.css';
import {useWebsocket} from "./hooks/useWebsocket";
import {useWasm} from "./hooks/useWasm";
import loadWebDecoder from "./lib/web_decoder";
import WebglScreen from "./lib/webgl_screen";

export const WS_SUBSCRIBE_STREAM_DATA = '/user/topic/stream-data/real-time';
export const WS_SEND_RTSP_URL = '/app/rtsp-url';
export const STOMP_URL = '/stomp/endpoint';
// export const WASM_URL = '/wasm/ffmpeg.wasm';

const App = () => {
    const [rtspUrl, setRtspUrl] = useState<string>('rtsp://192.168.10.174:8554/rtsp/live1');
    const {connected, connect, subscribe, send} = useWebsocket({url: STOMP_URL});
    // const {loading, error, instance} = useWasm({url: WASM_URL});
    const [module, setModule] = useState<any>();
    const canvasRef = useRef<any>();

    let ptr: any;
    let webglScreen: any;

    useEffect(() => {
        if (!connected) {
            connect();
        }

        loadWebDecoder().then((mod: any) => {
            setModule(mod);
        })

    }, []);

    // useEffect(() => {
    //     if (!loading) {
    //         if (error) {
    //             console.log(error);
    //         } else {
    //             console.log(instance?.exports)
    //         }
    //     }
    // }, [loading]);

    const onRtspUrlChange = (event: any) => {
        setRtspUrl(event.target.value);
    }

    const onOpen = () => {
        if (connected) {
            send(WS_SEND_RTSP_URL, {}, rtspUrl);
            subscribe(WS_SUBSCRIBE_STREAM_DATA, onReceiveData, {});

            ptr = module._initDecoder();
            const canvas = canvasRef.current;
            canvas!.width = 960;
            canvas!.height = 480;
            webglScreen = new WebglScreen(canvas);
        }
    }

    const onReceiveData = (message: any) => {
        const data = JSON.parse(message.body);
        const buffer = new Uint8Array(data);
        const length = buffer.length;
        console.log("receive pkt length :", length);
        const dst = module._GetBuffer(ptr, length);    // 通知C/C++分配好一块内存用来接收JS收到的H264流.
        module.HEAPU8.set(buffer, dst);    // 将JS层的数据传递给C/C++层.
        if (module._Decode(ptr, length) >= 0) {
            var width = module._GetWidth(ptr);
            var height = module._GetHeight(ptr);
            var size = width * height * 3 / 2;
            console.log("decode success, width:%d height:%d", width, height);

            const yuvData = module._GetRenderData(ptr); // 得到C/C++生成的YUV数据.
            // 将数据从C/C++层拷贝到JS层
            const renderBuffer = new Uint8Array(module.HEAPU8.subarray(yuvData, yuvData + size + 1));
            webglScreen.renderImg(width, height, renderBuffer)
        } else {
            console.log("decode fail");
        }
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
            <div className="context">
                <canvas ref={canvasRef}/>
            </div>
        </div>
    );
}

export default App;