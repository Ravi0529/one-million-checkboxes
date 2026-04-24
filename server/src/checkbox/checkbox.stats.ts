import { Server, Socket } from "socket.io";
import { checkboxService } from "./checkbox.service";

export const emitStats = async (socket: Socket) => {
  const stats = await checkboxService.getStats();
  socket.emit("stats_update", stats);
};

export const broadcastStats = async (io: Server) => {
  const stats = await checkboxService.getStats();
  io.emit("stats_update", stats);
};
