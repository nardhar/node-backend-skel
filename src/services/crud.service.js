const { ValidationError, NotFoundError } = require('../errors');

const objectMinusProperty = (object, property) => {
  return Object.keys(object).reduce((acc, val) => {
    return val === property ? acc : { ...acc, [val]: object[val] };
  }, {});
};

const defaultFilter = (params, model) => {
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
          // whether it is required or not then it should remove the "required" property
          objectMinusProperty(params[key], 'required'),
          // sends the associated model for base of the new filter
          model.associations[key].target,
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

const validateWrapper = (service, model) => {
  return (instance) => {
    return instance.validate()
    .then(() => {
      return new ValidationError(model.name, []);
    })
    .catch((sequelizeValidationError) => {
      return new ValidationError(model.name, sequelizeValidationError);
    })
    .then((validationError) => {
      return service.validate(instance, validationError);
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
const filter = (service, model) => {
  return (params) => {
    // builds the final object (it adds pagination here)
    return {
      ...service.offsetLimit(params),
      ...defaultFilter(params, model),
    };
  };
};

const list = (service, model) => {
  return (params) => {
    return model.findAll(service.filter(params));
  };
};

const listAndCount = (service, model) => {
  return (params) => {
    return model.findAndCountAll(service.filter(params));
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
      if (!instance) throw new NotFoundError(model.name, { id });
      return instance;
    });
  };
};

const find = (service, model) => {
  return (params) => {
    return model.findOne(service.filter(params))
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

const save = (service) => {
  return (params) => {
    return service.validateWrapper(service.create(params))
    .then((instance) => {
      return instance.save();
    });
  };
};

const edit = (service) => {
  return (id, params) => {
    return service.read(id)
    .then((instance) => {
      instance.set(params);
      return instance;
    });
  };
};

const update = (service) => {
  return (id, params) => {
    return service.edit(id, params)
    .then(service.validateWrapper)
    .then((instance) => {
      return instance.save();
    });
  };
};

const deleteMethod = (service) => {
  return (id) => {
    return service.read(id)
    .then((instance) => {
      return instance.destroy();
    });
  };
};

// builder for one model and easy overwrite of methods
module.exports = (model) => {
  const service = {
    offsetLimit,
    validate,
  };

  service.validateWrapper = validateWrapper(service, model);
  service.filter = filter(service, model);
  service.list = list(service, model);
  service.listAndCount = listAndCount(service, model);
  service.read = read(model);
  service.find = find(service, model);
  service.create = create(model);
  service.save = save(service);
  service.edit = edit(service);
  service.update = update(service);
  service.delete = deleteMethod(service);

  return service;
};

// enabling easy usage of service methods
module.exports.offsetLimit = offsetLimit;
module.exports.validate = validate;
module.exports.validateWrapper = (model) => {
  return validateWrapper({ validate }, model);
};
module.exports.filter = (model) => {
  return filter({ offsetLimit }, model);
};
module.exports.list = (model) => {
  return list({
    filter: filter({ offsetLimit }, model),
  }, model);
};
module.exports.listAndCount = (model) => {
  return listAndCount({
    filter: filter({ offsetLimit }, model),
  }, model);
};
module.exports.read = read;
module.exports.find = (model) => {
  return find({
    filter: filter({ offsetLimit }, model),
  }, model);
};
module.exports.create = create;
module.exports.save = (model) => {
  return save({
    validateWrapper: validateWrapper({ validate }, model),
    create: create(model),
  });
};
module.exports.edit = (model) => {
  return edit({
    read: read(model),
  });
};
module.exports.update = (model) => {
  return update({
    edit: edit({ read: read(model) }),
    validateWrapper: validateWrapper({ validate }, model),
  });
};
module.exports.delete = (model) => {
  return deleteMethod({
    read: read(model),
  });
};
