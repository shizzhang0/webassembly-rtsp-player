const {createProxyMiddleware} = require("http-proxy-middleware");

module.exports = function (app) {
    app.use(stompProxy);
    // app.use(wasmProxy);
}

const stompProxy = createProxyMiddleware("/stomp", {
    target: "ws://localhost:8080/",
    ws: true,
    changeOrigin: true,
});

const wasmProxy = createProxyMiddleware("/wasm/", {
        target: "http://localhost:8080/",
        changeOrigin: true,
        secure: false,
        pathRewrite: {
            '^/wasm/': '',
        },
    }
);