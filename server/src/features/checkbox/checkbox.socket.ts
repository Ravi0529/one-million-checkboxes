import { Server, Socket } from "socket.io";
import { checkboxService } from "./checkbox.service";

export const registerCheckboxHandles = (io: Server, socket: Socket) => {
  const userId = socket.id;

  socket.on("toggle_checkbox", async (data) => {
    try {
      const result = await checkboxService.toggle(data, userId);

      if (!result) return;

      io.emit("checkbox_updated", result);
    } catch (error) {
      console.error("Toggle error: ", error);
    }
  });
};
