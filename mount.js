const path = require('path');
const serveView = require('./src/view');

module.exports = (_, { server }) => {
  server.use(serveView({}));
};
