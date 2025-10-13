// Use the package version injected by Vite at build time
export const APP_VERSION = import.meta.env.PACKAGE_VERSION || "dev";
// Optional: update manually when deploying if you want to track build time
export const BUILD_INFO = {
  timestamp: new Date().toISOString(),
};
