import React from "react";
import { socket } from "../services/socket";
import {
  useCheckboxValue,
  type CheckboxStore,
} from "../hooks/useCheckboxValue";

interface CheckboxItemProps {
  id: number;
  store: CheckboxStore;
  style: React.CSSProperties;
}

function CheckboxItem({ id, store, style }: CheckboxItemProps) {
  const value = useCheckboxValue(id, store);

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
