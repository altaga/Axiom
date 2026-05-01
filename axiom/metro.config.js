const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'uuid' || moduleName.startsWith('uuid/')) {
    return {
      filePath: path.resolve(__dirname, './scripts/uuid-fix.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName.includes('\0') || moduleName.startsWith('node:')) {
    const cleanName = moduleName.replace(/\0/g, '').replace(/^node:/, '');
    return context.resolveRequest(context, cleanName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.unstable_enablePackageExports = true;

module.exports = config;