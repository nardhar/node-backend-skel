const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const logger = require('./logger');
const { handler } = require('./errors');
const middlewareLoader = require('./middlewares');
const controllerLoader = require('./controllers');

const start = (config) => {
  const server = express();

  server.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: true,
    headers: 'Cache-Control, Pragma, Content-Type, Authorization, Content-Length, X-Requested-With',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    // 'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    // 'Expires': '-1',
    // 'Pragma': 'no-cache',
  }));

  server.use(bodyParser.json());

  // load middlewares and controllers
  const routerApp = express.Router();
  middlewareLoader.load('*', routerApp);
  controllerLoader.load(routerApp);
  server.use('/api/v1', routerApp);

  // at last load the error handlers
  server.use(handler.notFound);
  server.use(handler.generic);

  const port = config.port || 4000;

  return new Promise((resolve) => {
    server.listen(port, () => {
      logger.info(`App running at port ${port}`);
      resolve({ server });
    });
  });
};

module.exports = { start };
