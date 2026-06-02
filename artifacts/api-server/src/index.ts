import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { registerSocketHandlers } from "./socket-handler.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/api/socket.io",
  cors: { origin: "*" },
});

registerSocketHandlers(io);

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});

httpServer.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
