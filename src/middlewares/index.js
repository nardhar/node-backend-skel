/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */

const path = require('path');
const { loaddirSync } = require('../util/file');

// loads the middlewares from the configured folder
const load = (routerPath, router, options) => {
  const optionsValue = options || {};
  return [(req, res, next) => {
    // it will jump all the middlewares in the same path if method === 'OPTIONS'
    if (req.method === 'OPTIONS') {
      next('route');
    } else {
      next();
    }
  }]
  .concat(
    loaddirSync(
      path.resolve(__dirname),
      '.middleware.js',
      ['index.js'].concat(optionsValue.excludeFolder || []),
      optionsValue.onlyFolder || [],
    )
    .sort()
    // requires each middleware
    .map((middlewareFile) => {
      return require(middlewareFile.path.substr(0, middlewareFile.path.lastIndexOf('.')));
    }),
  )
  .forEach((middleware) => {
    router.use(routerPath, middleware);
  });
};

module.exports = {
  load,
};
