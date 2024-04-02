import React, {useEffect, useRef, useState} from 'react';
import './App.css';
import {useWebsocket} from "./hooks/useWebsocket";
import {useWasm} from "./hooks/useWasm";
import loadWebDecoder from "./lib/web_decoder";
import WebglScreen from "./lib/webgl_screen";
import axios from "axios";

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
    let initializing: boolean = false;
    let hasInitialized: boolean = false;

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

            const canvas = canvasRef.current;
            canvas!.width = 1920;
            canvas!.height = 1080;
            webglScreen = new WebglScreen(canvas);
        }
    }

    const onReceiveData = (message: any) => {
        if (!initializing) {
            initializing = true;
            axios.get('/api/av-codec-parameters/?rtspUrl=' + rtspUrl, {
                headers: {
                    "Content-Type": "application/json",
                }
            })
                .then((res) => {
                    const data = JSON.stringify(res.data);
                    const dst = module._malloc(data.length);
                    data.split('').forEach((char: string, index: number) => {
                        module.HEAP8[(dst + index) >> 0] = char.charCodeAt(0);
                    });
                    ptr = module._initDecoder(dst);
                    hasInitialized = true;
                })
                .catch((ex) => {
                    console.log(ex);
                    initializing = false;
                });
        }

        if (!hasInitialized) {
            console.log('web decoder has not initialized');
            return;
        }
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