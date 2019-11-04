module.exports = (sequelize, DataType) => {
  const user = sequelize.define('User', {
    id: {
      type: DataType.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataType.STRING(100),
      allowNull: false,
      unique: true,
    },
    username: {
      type: DataType.STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataType.STRING(100),
      allowNull: true,
    },
  }, {
    tableName: 'user',
  });

  return user;
};
