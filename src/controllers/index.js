/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */

const path = require('path');
const http = require('http');
// const ev = require('express-validation');
const { loaddirSync } = require('../util/file');
// const { ValidationError } = require('../errors');

// getting all methods for a express.Router
const httpMethods = http.METHODS ? http.METHODS.map((method) => {
  // converting to lowercase since router.METHOD expects lowercase methods
  return method.toLowerCase();
}) : [];

// status codes
const defaultStatusCode = {
  get: 200,
  post: 201,
  put: 200,
  patch: 200,
  delete: 204,
  default: 200,
};

// templater function that does nothing
const defaultTemplater = (req, res, body) => {
  return body;
};

const createFakeRouter = (router, options) => {
  const templater = options.templater || defaultTemplater;
  const statusCode = {
    ...defaultStatusCode,
    ...options.statusCode,
  };
  // returning an object that has the same methods as a express.Router
  return {
    // returning the express router in case we would want to avoid all the templater stack
    expressRouter: router,
    // simple wrappers that just run the router
    ...['all', 'param', 'route', 'use'].reduce((otherMethods, method) => {
      return { ...otherMethods, [method]: (...args) => { return router[method](...args); } };
    }, {}),
    // actual METHOD wrappers that are expected to be formatted with the templater
    ...httpMethods.reduce((httpMethodsObject, method) => {
      return {
        ...httpMethodsObject,
        [method]: (pathParam, ...args) => {
          const callbackList = args.slice(0, args.length - 1)
          .map((callback) => {
            // for express-validation usage
            // if (typeof callback === 'object') {
            //   // wrapping express-validation next(error) call for using a custom error handler
            //   return (req, res, next) => {
            //     ev(callback)(req, res, (error) => {
            //       if (error) {
            //         next(new ValidationError(
            //           callback.resourceName,
            //           error.errors.map((err) => {
            //             // TODO: map all the JOI errors or fork them for using custom codes
            //             return { field: err.field[0], code: err.types[0] };
            //           }),
            //         ));
            //       } else {
            //         next();
            //       }
            //     });
            //   };
            // }
            return callback;
          })
          .concat((req, res, next) => {
            // wrapping last callback with a Promise in case its result is not a Promise
            return Promise.resolve(args[args.length - 1](req, res, next))
            .then((body) => {
              // will send data if no response was already sent
              if (!res.headersSent) {
                // we use the configured status code by the request method
                res.status(statusCode[req.method.toLowerCase()] || statusCode.default)
                .json(templater(req, res, body));
              }
            })
            .catch(next);
          });
          router[method](pathParam, ...callbackList);
        },
      };
    }, {}),
  };
};

const load = (router, options = {}) => {
  const fakeRouter = createFakeRouter(router, options);

  loaddirSync(
    path.resolve(__dirname),
    '.controller.js',
    ['index.js'].concat(options.excludeFolder || []),
    options.onlyFolder || [],
  )
  .forEach((file) => {
    require(file.path.substr(0, file.path.lastIndexOf('.')))(fakeRouter);
  });
};

module.exports = {
  load,
};
