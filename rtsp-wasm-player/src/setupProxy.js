const {createProxyMiddleware} = require("http-proxy-middleware");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        next();
    });
    app.use(stompProxy);
}

const stompProxy = createProxyMiddleware("/stomp", {
    target: "ws://localhost:8080/",
    ws: true,
    changeOrigin: true,
});