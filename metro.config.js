const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable modern ESM resolution for packages like zustand and reanimated
config.resolver.sourceExts.push('mjs');
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
