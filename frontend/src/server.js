// This is a simple Express server to serve the frontend application
// and handle client-side routing properly in a more controlled way

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createServer() {
  const app = express();
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  
  // Use vite's connect instance as middleware
  app.use(vite.middlewares);
  
  // Serve static files from the public directory
  app.use('/online-enrollment', express.static(resolve(__dirname, '../public')));
  
  // Handle all routes for SPA client-side routing
  app.get('/online-enrollment/*', (req, res) => {
    res.sendFile(resolve(__dirname, '../public/index.html'));
  });
  
  // Default route should redirect to /online-enrollment/
  app.get('/', (req, res) => {
    res.redirect('/online-enrollment/');
  });

  // Create a network interfaces message
  const getNetworkInterfaces = () => {
    try {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      const results = [];
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          if (net.family === 'IPv4' && !net.internal) {
            results.push(net.address);
          }
        }
      }
      return results;
    } catch (e) {
      return ['<your-local-ip>'];
    }
  };
  
  // Start the server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    const interfaces = getNetworkInterfaces();
    console.log(`\n-----------------------------------`);
    console.log(`Server is running on http://localhost:${PORT}/online-enrollment/`);
    console.log(`\nAccessible from these addresses:`);
    interfaces.forEach(ip => {
      console.log(`- http://${ip}:${PORT}/online-enrollment/`);
    });
    console.log(`-----------------------------------\n`);
  });
}

createServer();
