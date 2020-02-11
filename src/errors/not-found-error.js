const ApiError = require('./api-error');

class NotFoundError extends ApiError {
  constructor(objectName, filters, message = '') {
    super('NotFoundError', message || `${objectName} not found`);
    this.objectName = objectName;
    this.data = filters;
  }

  getBody() {
    return Object.keys(this.data).map((key) => {
      const dataValue = this.data[key];

      const code = typeof dataValue === 'object' && dataValue !== null && 'code' in dataValue
        ? dataValue.code : 'notFound';
      const value = typeof dataValue === 'object' && dataValue !== null && 'value' in dataValue
        ? dataValue.value : dataValue;

      return {
        // se envia para posterior uso opcional de i18n en el cliente
        code: `${this.objectName}.${key}.${code}.error`,
        field: key,
        value,
      };
    });
  }

  static handle(callback) {
    return (err) => {
      if (err instanceof NotFoundError) {
        if (typeof callback === 'function') {
          return callback(err);
        }
        return callback;
      }
      throw err;
    };
  }
}

module.exports = NotFoundError;
