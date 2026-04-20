import React from "react";
import { socket } from "../services/socket";

interface CheckboxItemProps {
  id: number;
  value: number;
  style: React.CSSProperties;
}

function CheckboxItem({ id, value, style }: CheckboxItemProps) {
  const handleChange = () => {
    socket.emit("toggle_checkbox", {
      id,
      checked: value === 0,
    });
  };

  return (
    <div style={style}>
      <input type="checkbox" checked={value === 1} onChange={handleChange} />
    </div>
  );
}

export default React.memo(CheckboxItem);
