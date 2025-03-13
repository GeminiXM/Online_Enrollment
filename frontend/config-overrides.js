module.exports = function override(config, env) {
  // Add any webpack config overrides here
  return config;
};

// Fix for webpack-dev-server deprecation warnings
module.exports.devServer = function(configFunction) {
  return function(proxy, allowedHost) {
    const config = configFunction(proxy, allowedHost);
    
    // Replace deprecated options with the new setupMiddlewares option
    config.setupMiddlewares = (middlewares, devServer) => {
      if (config.onBeforeSetupMiddleware) {
        config.onBeforeSetupMiddleware(devServer);
      }
      middlewares.forEach(middleware => {
        devServer.app.use(middleware);
      });
      if (config.onAfterSetupMiddleware) {
        config.onAfterSetupMiddleware(devServer);
      }
      return middlewares;
    };
    
    // Remove deprecated options
    delete config.onBeforeSetupMiddleware;
    delete config.onAfterSetupMiddleware;
    
    return config;
  };
}; 