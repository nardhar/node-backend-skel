// const Joi = require('joi');

const userService = require('../../services/auth/user.service');
const logger = require('../../logger');

module.exports = (router) => {
  router.get('/user', (req) => {
    return userService.listAndCount(req.query);
  });

  router.get(
    '/user/:id',
    // JOI validation
    // {
    //   resourceName: 'User',
    //   params: {
    //     id: Joi.number().required(),
    //   },
    // },
    (req) => {
      logger.info(req.params);
      return userService.read(req.params.id);
    },
  );

  router.post('/user', (req) => {
    return userService.save(req.body);
  });

  router.post('/user2', (req) => {
    return userService.save2(req.body);
  });
};
