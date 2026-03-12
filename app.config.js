const appJson = require('./app.json');

const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    ...appJson.expo,
    name: IS_DEV ? 'LoA Toolkit (Dev)' : appJson.expo.name,
  },
};
