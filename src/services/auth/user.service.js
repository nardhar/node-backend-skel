const crudService = require('../crud.service');
const { User } = require('../../models');

const userService = crudService(User);

const encode = (data) => {
  return data;
};

userService.create = (params) => {
  return User.build({
    ...params,
    password: encode(params.password),
  });
};

userService.save2 = (params) => {
  return crudService.save(User)(params);
};

userService.saveAll = (params) => {
  return true;
};

module.exports = userService;
