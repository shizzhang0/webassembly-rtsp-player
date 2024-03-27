# webassembly-rtsp-player

## 基于Webassembly实现页面播放rtsp流

### 方案设计
后端拉取rtsp流，获取原始数据包，通过websocket将数据包传给前端，在前端通过webassembly技术来进行解码，最后通过webgl来播放。其实就是把解码的工作放在前端来做，目前方案是能走通的，就是效果还在优化中。。。


### wasm编译指令
```
emcc web_decoder.cpp ./lib/libavformat.a \
    ./lib/libavcodec.a  \
    ./lib/libswresample.a \
    ./lib/libswscale.a  \
    ./lib/libavutil.a \
    -I "./include" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT=web \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s USE_ES6_IMPORT_META=0 \
    -s EXPORT_NAME='loadWebDecoder' \
    --no-entry \
    -o ./web_decoder.js
```

### 前端引入wasm
将web_decoder.wasm放到public目录下面，同时修改web_decoder.js

在第一行加上/* eslint-disable */

然后修改_scriptDir = './web_decoder.wasm'

