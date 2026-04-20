import React from "react";
import { socket } from "../services/socket";
import { useCheckboxValue } from "../hooks/useCheckboxValue";
import type { CheckboxStore } from "../hooks/useCheckboxStore";

interface CheckboxItemProps {
  id: number;
  store: CheckboxStore;
  style: React.CSSProperties;
}

const currentUserId = socket.id;

function CheckboxItem({ id, store, style }: CheckboxItemProps) {
  const { value, owner } = useCheckboxValue(id, store);

  const handleChange = () => {
    const newValue = value === 0 ? 1 : 0;

    store.updateOne(id, newValue, currentUserId);

    socket.emit("toggle_checkbox", {
      id,
      checked: newValue === 1,
    });
  };

  let background = "white";

  if (value === 1) {
    if (owner === currentUserId) {
      background = "#b9fbc0";
    } else {
      background = "#a0c4ff";
    }
  }

  return (
    <div style={{ ...style, background }}>
      <input
        type="checkbox"
        checked={value === 1}
        onChange={handleChange}
        title={owner ? `Owner: ${owner}` : "No owner"}
      />
    </div>
  );
}

export default React.memo(CheckboxItem);
