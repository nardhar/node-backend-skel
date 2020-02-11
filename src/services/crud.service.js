const { ValidationError, NotFoundError } = require('../errors');

const objectMinusProperty = (object, property) => {
  return Object.keys(object).reduce((acc, val) => {
    return val === property ? acc : { ...acc, [val]: object[val] };
  }, {});
};

const defaultFilter = (model, params) => {
  // if there are associations on the query
  if (!params) return {};

  const include = [];
  const where = Object.keys(params).concat(Object.getOwnPropertySymbols(params))
  .reduce((whereResult, key) => {
    // it doesn't add pagination properties
    if (['limit', 'offset', 'page', 'order', 'attributes'].indexOf(key) >= 0) return whereResult;
    // if it is an association
    if (key in model.associations) {
      include.push({
        model: model.associations[key].target,
        as: model.associations[key].as,
        // associations are "required" on demand
        ...('required' in params[key] ? { required: params[key].required } : {}),
        // using the default filter again over the associated model
        ...defaultFilter(
          // sends the associated model for base of the new filter
          model.associations[key].target,
          // whether it is required or not then it should remove the "required" property
          objectMinusProperty(params[key], 'required'),
        ),
      });
      return whereResult;
    }
    // TODO: maybe it should add only if it is either a Sequelize.Op or a model property
    return { ...whereResult, [key]: params[key] };
  }, {});

  // builds the final object
  return {
    ...(
      Object.keys(where).concat(Object.getOwnPropertySymbols(params)).length > 0
        ? { where }
        : {}
    ),
    ...(include.length > 0 ? { include } : {}),
    // we manage the order globally
    ...('order' in params ? { order: params.order } : {}),
    // adding the attributes
    ...('attributes' in params ? { attributes: params.attributes } : {}),
  };
};

const offsetLimit = (params) => {
  if (params && 'limit' in params && ('page' in params || 'offset' in params)) {
    return {
      // using Math.max so the offset can not be less than zero
      offset: Math.max('offset' in params ? params.offset : (params.page - 1) * params.limit, 0),
      // using Math.max so the limit is at least one
      limit: Math.max(params.limit, 1),
    };
  }
  return {};
};

const validate = (instance, validationError) => {
  // default validation
  return validationError;
};

const validateWrapper = (model) => {
  return (instance) => {
    return instance.validate()
    .then(() => {
      return new ValidationError(model.name, []);
    })
    .catch((sequelizeValidationError) => {
      return new ValidationError(model.name, sequelizeValidationError);
    })
    .then((validationError) => {
      return validate()(instance, validationError);
    })
    .then((validationError) => {
      if (validationError.hasErrors()) throw validationError;
      return instance;
    });
  };
};

/**
 * Method for making simple and easy sequelize queries
 * @param {Object} params Object parameters
 * @param {Integer} params.limit Amount of records to be returned
 * @param {Integer} params.offset Amount of offset records
 * @param {Integer} params.page Amount of offset pages(offset = limit * (page - 1))
 * @return {Object} Sequelize query param formatted
 */
const filter = (model) => {
  return (params) => {
    // builds the final object (it adds pagination here)
    return {
      ...offsetLimit(params),
      ...defaultFilter(model, params),
    };
  };
};

const list = (model) => {
  return (params) => {
    return model.findAll(filter(model)(params));
  };
};

const listAndCount = (model) => {
  return (params) => {
    return model.findAndCountAll(filter(model)(params));
  };
};

/**
 * Reads a record by its primaryKey value
 * If the model's primary key is composite, then *id* should be an object with the
 * fields and values of the composite primaryKey
 * @param {String|Integer|Object} id The value for the primaryKey
 * @return {Object} instance found
 * @throw {NotFoundError} if the instance is not found
 */
const read = (model) => {
  return (id) => {
    return model.findOne({
      // finding out the primaryKey(s) of the table
      where: Object.keys(model.primaryKeys).reduce((condition, field) => {
        return {
          ...condition,
          // if id is an object then it returns its field property vale
          [field]: typeof id === 'object' ? id[field] : id,
        };
      }, {}),
    })
    .then((instance) => {
      if (!instance) throw new NotFoundError(model.name, id);
      return instance;
    });
  };
};

const find = (model) => {
  return (params) => {
    return model.findOne(filter(model)(params))
    .then((instance) => {
      if (!instance) throw new NotFoundError(model.name, params);
      return instance;
    });
  };
};

const create = (model) => {
  return (params) => {
    return model.build(params);
  };
};

const save = (model) => {
  return (params) => {
    return validateWrapper(model)(create(model)(params))
    .then((instance) => {
      return instance.save();
    });
  };
};

const edit = (model) => {
  return (id, params) => {
    return read(model)(id)
    .then((instance) => {
      instance.set(params);
      return instance;
    });
  };
};

const update = (model) => {
  return (id, params) => {
    return edit(model)(id, params)
    .then(validateWrapper(model))
    .then((instance) => {
      return instance.save();
    });
  };
};

// since delete is a reserved keyword, then we use another name for function definition
const deleteMethod = (model) => {
  return (id) => {
    return read(model)(id)
    .then((instance) => {
      return instance.destroy();
    });
  };
};

// service builder for further simple reuse (methods could be ovewritten)
const crudService = (model) => {
  return {
    offsetLimit,
    validate,
    validateWrapper: validateWrapper(model),
    filter: filter(model),
    list: list(model),
    listAndCount: listAndCount(model),
    read: read(model),
    find: find(model),
    create: create(model),
    save: save(model),
    edit: edit(model),
    update: update(model),
    delete: deleteMethod(model),
    // aliases
    obtener: read(model),
    listar: list(model),
  };
};

// enabling methods for simple use without needing to build a complete service object
crudService.offsetLimit = offsetLimit;
crudService.validate = validate;
crudService.validateWrapper = validateWrapper;
crudService.filter = filter;
crudService.list = list;
crudService.listAndCount = listAndCount;
crudService.read = read;
crudService.find = find;
crudService.create = create;
crudService.save = save;
crudService.edit = edit;
crudService.update = update;
crudService.delete = deleteMethod;

module.exports = crudService;
