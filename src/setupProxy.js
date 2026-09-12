const { createProxyMiddleware } = require('http-proxy-middleware');

const target = process.env.REACT_APP_PROXY || 'http://localhost:8082';

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
    })
  );
};
