const ApiError = require('./api-error');
const FieldError = require('./field-error');

class ValidationError extends ApiError {
  constructor(objectName, errors = []) {
    super('ValidationError', `Validation error with "${objectName}"`);
    this.objectName = objectName;
    // in case errors was null, then always use an array
    if (errors === null || Array.isArray(errors)) {
      this.data = (errors || []).map((error) => {
        return error instanceof FieldError
          ? error
          : new FieldError(error.field || null, error.code || '', error.args || []);
      });
    } else {
      this.data = [];
    }
  }

  addFieldError(fieldError) {
    this.data.push(fieldError);
  }

  addError(field, code, args = []) {
    this.data.push(new FieldError(field, code, args));
  }

  hasErrors() {
    return this.data.length > 0;
  }

  getErrors() {
    return this.data;
  }

  merge(validationError) {
    validationError.data.forEach((error) => {
      this.addFieldError(error);
    });
  }

  getBody() {
    return this.data.map((fieldError) => {
      return {
        field: fieldError.field,
        code: `${this.objectName}.${fieldError.field}.${fieldError.code}.error`,
        ...(
          Array.isArray(fieldError.args) && fieldError.args.length > 0
            ? { value: fieldError.args[0] } : {}
        ),
        ...(!Array.isArray(fieldError.args) ? { value: fieldError.args } : {}),
      };
    });
  }


  static asyncBuild(objectName, errors) {
    return Promise.resolve()
    .then(() => {
      return new ValidationError(objectName, errors);
    });
  }

  static handle(params) {
    return (validationError) => {
      if (validationError.hasErrors()) {
        throw validationError;
      }
      return params;
    };
  }
}

module.exports = ValidationError;
