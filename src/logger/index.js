const { createLogger, format, transports } = require('winston');

const ApiError = require('../errors/api-error');

const {
  combine,
  timestamp,
  printf,
  // errors,
  splat,
} = format;

const objectPrint = (object) => {
  return JSON.stringify(object, null, 2);
};

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    splat(),
    // errors({ stack: true }),
    printf((loggedObject) => {
      const {
        level,
        message,
        timestamp: ts,
        stack,
      } = loggedObject;
      const title = `${ts} [${level}]:`;
      // if it is an Error
      if (stack) {
        // if it is a controlled Error
        if (loggedObject instanceof ApiError) {
          return `${title} ${message}, errors: ${objectPrint(loggedObject.getBody())}\n  ${stack}`;
        }
        return `${title} ${message}\n  ${stack}`;
      }
      if (typeof message === 'object') {
        return `${title} ${objectPrint(loggedObject)}`;
      }
      return `${title} ${message}`;
    }),
  ),
  transports: [
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console());
}

module.exports = logger;
