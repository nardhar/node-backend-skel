const config = require('./src/config');
const app = require('./src/app');

module.exports = app.start(config);
