module.exports = (router) => {
  router.get('/status', () => {
    return {
      message: 'Online',
      date: new Date(),
    };
  });
};
