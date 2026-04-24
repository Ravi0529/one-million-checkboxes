import { Server, Socket } from "socket.io";
import { registerCheckboxHandlers } from "../checkbox/checkbox.socket";
import { checkboxRepository } from "../checkbox/checkbox.repository";
import { broadcastStats, emitStats } from "../checkbox/checkbox.stats";

export const registerSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("User connected: ", socket.id);
    const handshakeUserId = socket.handshake.auth?.userId;
    const userId =
      typeof handshakeUserId === "string" && handshakeUserId.trim().length > 0
        ? handshakeUserId
        : socket.id;

    void checkboxRepository.incrementActiveUser(userId).then(async () => {
      await emitStats(socket);
      await broadcastStats(io);
    });

    registerCheckboxHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log("User disconnected: ", socket.id);
      void checkboxRepository.decrementActiveUser(userId).then(() => {
        void broadcastStats(io);
      });
    });
  });
};
