module.exports = {
  devServer: {
    // Fix for webpack-dev-server deprecation warnings
    setupMiddlewares: (middlewares, devServer) => {
      // Your custom middleware setup can go here if needed
      return middlewares;
    },
  },
}; 