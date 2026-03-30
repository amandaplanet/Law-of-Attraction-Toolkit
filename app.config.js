const appJson = require('./app.json');

const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [...(appJson.expo.plugins ?? []), 'expo-localization'],
    name: IS_DEV ? 'LoA Toolkit (Dev)' : appJson.expo.name,
    ios: {
      ...appJson.expo.ios,
      bundleIdentifier: IS_DEV
        ? 'com.amandaplanet.AbrahamHicksToolkit.dev'
        : appJson.expo.ios.bundleIdentifier,
    },
  },
};
