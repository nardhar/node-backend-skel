const ApiError = require('./api-error');

class AuthorizationError extends ApiError {
  constructor(message, args = []) {
    super('AuthorizationError', message || 'Error de Autorización');
    this.data = args;
  }

  getBody() {
    return [{
      code: 'authorization.token.missing.error',
      field: 'token',
      value: this.data,
    }];
  }
}

module.exports = AuthorizationError;
