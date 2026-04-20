import { Server } from "socket.io";
import { createServer } from "http";

let io: Server;

export const initSocket = (server: ReturnType<typeof createServer>) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
    },
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};
