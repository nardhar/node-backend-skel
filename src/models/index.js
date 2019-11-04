const path = require('path');
const Sequelize = require('sequelize');
const { database: config } = require('../config');
const { loaddirSync } = require('../util/file');

const connect = () => {
  const models = {
    sequelize: new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        ...config.params,
        operatorsAliases: Sequelize.Op,
        logging: false,
      },
    ),
  };

  const db = {};
  const fakeDb = {};

  // the order to execute associations
  const associationList = {
    belongsTo: [],
    hasOne: [],
    belongsToMany: [],
    hasMany: [],
  };

  loaddirSync(
    path.resolve(__dirname, '..', 'models'),
    '.js',
    ['index.js'],
  )
  .forEach((modelFile) => {
    const model = models.sequelize.import(modelFile.path);
    db[model.name] = model;
    // building the fake associator
    fakeDb[model.name] = Object.keys(associationList).reduce((acc, associationType) => {
      return {
        ...acc,
        [associationType]: (model2, options) => {
          associationList[associationType].push({
            model1: model.name,
            model2: model2.name,
            options,
          });
        },
      };
    }, { name: model.name });
  });

  Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
      // sending fakeDb so it only adds the association's definition to associationList key array
      db[modelName].associate(fakeDb);
    }
  });

  // and now we associate the models
  // by associating in order we make sure no additional keys are created when a hasMany
  // association is called before a belongsTo one
  Object.keys(associationList).forEach((associationType) => {
    associationList[associationType].forEach((association) => {
      db[association.model1][associationType](db[association.model2], association.options);
    });
  });

  Object.keys(db).forEach((model) => {
    models[model] = db[model];
  });

  return models;
};

const dbInstance = connect();

dbInstance.withTransaction = (callback, isTransactional = true) => {
  return isTransactional
    ? dbInstance.sequelize.transaction(callback)
    : Promise.resolve(callback());
};

// exports the instance
module.exports = dbInstance;
