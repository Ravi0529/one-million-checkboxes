import { Server, Socket } from "socket.io";
import { checkboxService } from "./checkbox.service";
import { rateLimiter } from "../utils/rateLimiter";
import { validateRange } from "./checkbox.validator";
import { emitStats, broadcastStats } from "./checkbox.stats";

export const registerCheckboxHandlers = (io: Server, socket: Socket) => {
  const handshakeUserId = socket.handshake.auth?.userId;
  const userId =
    typeof handshakeUserId === "string" && handshakeUserId.trim().length > 0
      ? handshakeUserId
      : socket.id;

  const activeRanges = new Set<string>();

  socket.on("toggle_checkbox", async (data) => {
    try {
      const allowed = await rateLimiter.isAllowed(userId);

      if (!allowed) {
        socket.emit("rate_limited", {
          message: "Too many requests",
        });
        return;
      }

      const result = await checkboxService.toggle(data, userId);

      if (!result) {
        socket.emit("action_rejected", {
          id: data.id,
          message: "Not your checkbox",
        });
        return;
      }

      const chunkSize = 1000;
      const chunkStart = Math.floor(result.id / chunkSize) * chunkSize;
      const chunkEnd = chunkStart + chunkSize;

      const room = `range:${chunkStart}-${chunkEnd}`;

      io.to(room).emit("checkbox_updated", result);
      await broadcastStats(io);
    } catch (error) {
      console.error("Toggle error: ", error);
    }
  });

  socket.on("get_range", async (data) => {
    try {
      const allowed = await rateLimiter.isAllowed(userId);

      if (!allowed) {
        socket.emit("rate_limited", {
          message: "Too many requests",
        });
        return;
      }

      const { start, end } = data;

      if (!validateRange(start, end)) {
        socket.emit("error", { message: "Invalid range" });
        return;
      }

      const rangeData = await checkboxService.getRange(start, end);

      socket.emit("range_data", rangeData);
    } catch (error) {
      socket.emit("error", {
        message: "Failed to fetch range",
      });
    }
  });

  socket.on("get_stats", async () => {
    try {
      await emitStats(socket);
    } catch (error) {
      socket.emit("error", {
        message: "Failed to fetch stats",
      });
    }
  });

  socket.on("subscribe_range", ({ start, end }) => {
    const room = `range:${start}-${end}`;

    if (activeRanges.has(room)) return;

    activeRanges.add(room);
    socket.join(room);

    console.log("JOIN:", socket.id, room);
  });

  socket.on("unsubscribe_range", ({ start, end }) => {
    const room = `range:${start}-${end}`;

    if (!activeRanges.has(room)) return;

    activeRanges.delete(room);
    socket.leave(room);
  });
};
