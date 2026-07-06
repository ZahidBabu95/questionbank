const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const customExclusions = [
  /node_modules[\/\\]expo-modules-autolinking[\/\\]android[\/\\]/,
  /[\/\\]android[\/\\]build[\/\\]/,
  /[\/\\]\.expo[\/\\]/,
  /[\/\\]\.git[\/\\]/
];

if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList = config.resolver.blockList.concat(customExclusions);
} else if (config.resolver.blockList instanceof RegExp) {
  config.resolver.blockList = [config.resolver.blockList, ...customExclusions];
} else {
  config.resolver.blockList = customExclusions;
}

module.exports = config;
