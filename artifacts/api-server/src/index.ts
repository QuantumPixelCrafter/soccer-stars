import { createServer } from "node:http";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { initSocket } from "./lib/socket.js";
import { seedDatabase } from "./db/seed.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Seed the database on startup (idempotent — skips if already seeded)
seedDatabase();

// Wrap Express in an HTTP server so Socket.io can share the same port
const httpServer = createServer(app);

// Attach Socket.io (real-time events)
initSocket(httpServer);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Game server listening");
});
