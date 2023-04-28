module.exports = (api) => {
  api.cache(true);

  const presets = [
    [
      '@babel/preset-env',
      {
        "targets": {
          "esmodules": true
        }
      }
    ]
  ];
  const plugins = [
    [
      'add-module-exports',
      { 'addDefaultProperty': true },
    ]
  ];

  return {
    presets,
    plugins,
    comments: false, // Remove comments during minification
  };
};
