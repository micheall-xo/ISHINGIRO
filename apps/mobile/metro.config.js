// const { getDefaultConfig } = require('@expo/metro-config');
// const config = getDefaultConfig(__dirname);
// config.projectRoot = __dirname;
// config.watchFolders = [];
// config.maxWorkers = 1;
// config.resolver = config.resolver || {};
// config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];
// config.resolver.platforms = ['ios', 'android', 'native', 'web'];
// config.resolver.blockList = [
//   /.*[\\\/]test[\\\/].*/,
//   /.*[\\\/]__tests__[\\\/].*/,
//   /.*[\\\/]tests[\\\/].*/,
//   /.*[\\\/]requireg[\\\/].*/,
//   /.*[\\\/]react-native[\\\/]ReactAndroid[\\\/].*/,
//   /.*[\\\/]bbb[\\\/].*/,
//   /.*[\\\/]third-party[\\\/].*/,
//   /.*[\\\/]debugger-frontend[\\\/].*/,
//   /.*[\\\/]node_modules[\\\/].*[\\\/]test[\\\/].*/,
//   /.*[\\\/]node_modules[\\\/].*[\\\/]__tests__[\\\/].*/,
//   /.*[\\\/]node_modules[\\\/].*[\\\/]third-party[\\\/].*/,
//   /.*[\\\/]apps[\\\/]mobile[\\\/]node_modules[\\\/].*/
// ];

// config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// config.transformer = config.transformer || {};
// config.transformer.minifierConfig = {
//   keep_fnames: true,
//   mangle: {
//     keep_fnames: true,
//   },
// };

// module.exports = config;

// apps/mobile/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..'); 
const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
