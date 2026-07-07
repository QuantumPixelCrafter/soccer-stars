import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { logger } from "./logger.js";

let io: SocketIOServer | null = null;

/**
 * Validate a session token against the DB.
 * Imported lazily to avoid circular dependency at module init time.
 */
function resolveUserIdFromToken(token: string): number | null {
  // Import inline so we don't create a circular dep at module level
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require("../db/database.js").default as import("better-sqlite3").Database;
  const row = db
    .prepare(
      `SELECT user_id FROM sessions
       WHERE token = ? AND expires_at > datetime('now')`,
    )
    .get(token) as { user_id: number } | undefined;
  return row?.user_id ?? null;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  /**
   * Socket.io auth middleware.
   * Client must send a valid Bearer token in socket.handshake.auth.token.
   * The userId is derived server-side and stored on socket.data — clients
   * cannot spoof their identity.
   */
  io.use((socket, next) => {
    const rawToken: unknown = socket.handshake.auth["token"];
    const token = typeof rawToken === "string" ? rawToken.trim() : null;

    if (!token) {
      next(new Error("AUTH_MISSING: provide auth.token in socket handshake"));
      return;
    }

    const userId = resolveUserIdFromToken(token);
    if (userId === null) {
      next(new Error("AUTH_INVALID: token is invalid or expired"));
      return;
    }

    // Attach verified identity to socket.data — never trust client-supplied userId
    socket.data["userId"] = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId: number = socket.data["userId"] as number;
    const room = `user:${userId}`;
    socket.join(room);
    logger.info({ socketId: socket.id, userId, room }, "Socket.io client connected and joined room");

    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, userId, reason }, "Socket.io client disconnected");
    });
  });

  logger.info("Socket.io server initialized at /api/socket.io");
  return io;
}

/** Retrieve the Socket.io server instance (throws if not initialized). */
export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io has not been initialized — call initSocket() first");
  return io;
}

/** Emit a real-time event to a specific user's room. */
export function emitToUser(userId: number, event: string, payload: unknown): void {
  try {
    getIO().to(`user:${userId}`).emit(event, payload);
  } catch {
    // Non-fatal: socket may not be initialized in some test environments
  }
}
