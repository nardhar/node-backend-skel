const logger = require('../logger');
const ApiError = require('./api-error');
const NotFoundError = require('./not-found-error');

// loading a not so simple error handler
const errorCodes = {
  ValidationError: 412,
  NotFoundError: 404,
  default: 400,
  internal: 500,
};

// loads the configured error renderer or uses a simple default one
const errorRenderer = (err) => {
  return { message: err.message, errors: err.getBody() };
};

// NOTE: we could check if errorRenderer is a function
module.exports = {
  generic: (err, req, res, next) => { // eslint-disable-line no-unused-vars
    // it always logs the errors
    logger.error(err);

    // if no response has already been sent
    if (!res.headersSent) {
      // checks if it is a controlled error
      if (err instanceof ApiError) {
        // and finds the corresponding status code for the response
        res.status(errorCodes[err.type] || errorCodes.default).json(errorRenderer(err));
      } else {
        // if it is not a controlled error, then send a Server error
        // (some code has thrown an exception)
        res.status(errorCodes.internal).json(errorRenderer({
          message: err.message || 'Internal Server Error',
          getBody() { return []; },
        }));
      }
    }
  },
  notFound: (req, res) => { // eslint-disable-line no-unused-vars
    throw new NotFoundError('path', {
      url: req.originalUrl,
    });
  },
};
