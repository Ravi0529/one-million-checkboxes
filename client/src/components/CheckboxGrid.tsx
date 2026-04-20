import { useRef } from "react";
import { Grid } from "react-window";
import type { CellComponentProps } from "react-window";
import { socket } from "../services/socket";
import { useCheckboxStore } from "../hooks/useCheckboxStore";
import { useSocket } from "../hooks/useSocket";
import CheckboxItem from "./CheckboxItem";

const COLUMN_COUNT = 50;
const ROW_COUNT = 20000;

interface RangeDataPayload {
  start: number;
  data: number[];
}

interface CheckboxUpdatedPayload {
  id: number;
  checked: boolean;
}

export default function CheckboxGrid() {
  const store = useCheckboxStore();

  useSocket({
    range_data: (...args: unknown[]) => {
      const payload = args[0] as RangeDataPayload;
      store.setRange(payload.start, payload.data);
    },
    checkbox_updated: (...args: unknown[]) => {
      const payload = args[0] as CheckboxUpdatedPayload;
      store.updateOne(payload.id, payload.checked ? 1 : 0);
    },
  });

  const lastRangeRef = useRef<{ start: number; end: number } | null>(null);
  const prevRangeRef = useRef<{ start: number; end: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRange = (start: number, end: number) => {
    if (prevRangeRef.current) {
      socket.emit("unsubscribe_range", prevRangeRef.current);
    }

    socket.emit("subscribe_range", { start, end });
    socket.emit("get_range", { start, end });

    prevRangeRef.current = { start, end };
  };

  const Cell = ({ columnIndex, rowIndex, style }: CellComponentProps) => {
    const id = rowIndex * COLUMN_COUNT + columnIndex;

    return <CheckboxItem id={id} style={style} value={store.get(id)} />;
  };

  return (
    <Grid
      cellComponent={Cell}
      cellProps={{}}
      columnCount={COLUMN_COUNT}
      columnWidth={30}
      defaultHeight={600}
      rowCount={ROW_COUNT}
      rowHeight={30}
      defaultWidth={600}
      style={{ height: 600, width: 600 }}
      onCellsRendered={(visibleCells) => {
        const start = visibleCells.rowStartIndex * COLUMN_COUNT;
        const end = (visibleCells.rowStopIndex + 1) * COLUMN_COUNT;

        if (
          lastRangeRef.current &&
          lastRangeRef.current.start === start &&
          lastRangeRef.current.end === end
        ) {
          return;
        }

        lastRangeRef.current = { start, end };

        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          loadRange(start, end);
        }, 100);
      }}
    />
  );
}
