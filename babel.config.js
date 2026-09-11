// NativeWind v5 does not use nativewind/babel (that was v4).
// The Metro plugin applies the transform automatically.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
