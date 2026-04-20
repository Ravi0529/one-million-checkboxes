import { Server } from "socket.io";
import { createServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "./redis";

let io: Server;

export const initSocket = async (server: ReturnType<typeof createServer>) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
    },
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  console.log("Socket.io redis adapter connected");

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};
