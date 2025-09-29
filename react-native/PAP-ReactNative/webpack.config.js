const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // 1.1: force o webpack a resolver também arquivos .ts/.tsx e .mjs
  config.resolve.extensions.push(
    '.web.ts', '.web.tsx',
    '.ts', '.tsx',
    '.web.mjs', '.mjs'
  );

  // 1.2: trate .mjs e .js sem exigir extensão “fully specified”
  config.module.rules.push({
    test: /\.m?js$/,
    resolve: {
      fullySpecified: false,
    },
  });

  // 1.3: garanta que imports de “react-native” usem “react-native-web”
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'react-native$': 'react-native-web',
  };

  return config;
};