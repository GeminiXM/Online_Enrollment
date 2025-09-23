const net = require("net");

function createForwarder(listenPort, targetPort, label) {
  const server = net.createServer((clientSocket) => {
    console.log(`Client connected to port ${listenPort}`);

    const targetSocket = net.createConnection(targetPort, "localhost", () => {
      console.log(`Connected to ${label} on port ${targetPort}`);
      clientSocket.pipe(targetSocket);
      targetSocket.pipe(clientSocket);
    });

    targetSocket.on("error", (err) => {
      console.error(`${label} connection error:`, err);
      clientSocket.destroy();
    });

    clientSocket.on("error", (err) => {
      console.error("Client connection error:", err);
      targetSocket.destroy();
    });

    clientSocket.on("close", () => {
      console.log("Client disconnected");
      targetSocket.destroy();
    });
  });

  server.listen(listenPort, "localhost", () => {
    console.log(
      `Port forwarder running: ${listenPort} -> ${targetPort} (${label})`
    );
    console.log("Keep this running while using your tunnel");
  });

  server.on("error", (err) => {
    console.error(
      `Server error on ${listenPort} -> ${targetPort} (${label}):`,
      err
    );
  });

  return server;
}

// Backend tunnel: Cloudflare hits 3173, forward to backend on 5001
createForwarder(3173, 5001, "backend");

// Frontend tunnel: Cloudflare hits 5173, forward to Vite dev server on 5000
createForwarder(5173, 5000, "frontend");
