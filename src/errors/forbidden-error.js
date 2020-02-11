const ApiError = require('./api-error');

class ForbiddenError extends ApiError {
  constructor(message, args = []) {
    super('ForbiddenError', message || 'Error de Permisos');
    this.data = args;
  }

  getBody() {
    return [{
      code: 'authorization.token.invalid.error',
      field: 'token',
      value: this.data,
    }];
  }
}

module.exports = ForbiddenError;
