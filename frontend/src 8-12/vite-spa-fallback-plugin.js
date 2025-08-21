// Custom Vite plugin to handle SPA history fallback
export default function spaSFallbackPlugin() {
  return {
    name: 'spa-history-fallback',
    configureServer(server) {
      // Add middleware to handle SPA routes
      return () => {
        server.middlewares.use((req, res, next) => {
          // If accessing the root path without trailing slash, add it
          if (req.url === '/online-enrollment') {
            req.url = '/online-enrollment/';
          }
          
          // Debug log
          console.log(`Handling request: ${req.url}`);
          
          // Handle SPA routes - if it's a route without a file extension, serve index.html
          if (req.url.startsWith('/online-enrollment/') && 
              !req.url.includes('.') && 
              req.url !== '/online-enrollment/') {
            console.log(`-> SPA route detected, serving index.html`);
            req.url = '/online-enrollment/index.html';
          }
          
          next();
        });
      };
    }
  };
}
