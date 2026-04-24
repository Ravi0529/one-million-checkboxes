import React from "react";
import { socket } from "../services/socket";
import { useCheckboxValue } from "../hooks/useCheckboxValue";
import type { CheckboxStore } from "../hooks/useCheckboxStore";
import { userId } from "../services/userId";

interface CheckboxItemProps {
  id: number;
  store: CheckboxStore;
  style: React.CSSProperties;
}

function CheckboxItem({ id, store, style }: CheckboxItemProps) {
  const { value, owner } = useCheckboxValue(id, store);
  const currentUserId = userId;

  const handleChange = () => {
    const newValue = value === 0 ? 1 : 0;

    store.updateOne(id, newValue, currentUserId ?? undefined);

    socket.emit("toggle_checkbox", {
      id,
    });
  };

  let className = "checkbox-item unchecked";

  if (value === 1) {
    if (owner === currentUserId) {
      className = "checkbox-item checked-self";
    } else {
      className = "checkbox-item checked-other";
    }
  }

  return (
    <div className={className} style={style}>
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
