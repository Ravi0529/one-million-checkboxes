import { useRef, useState, useEffect } from "react";
import { Grid } from "react-window";
import type { CellComponentProps } from "react-window";
import { socket } from "../services/socket";
import { useCheckboxStore } from "../hooks/useCheckboxStore";
import { useSocket } from "../hooks/useSocket";
import CheckboxItem from "./CheckboxItem";

const COLUMN_COUNT = 50;
const ROW_COUNT = 20000;
const CHUNK_SIZE = 1000;

interface RangeDataPayload {
  start: number;
  end: number;
  data: number[];
  owners: Record<number, string>;
}

export default function CheckboxGrid() {
  const store = useCheckboxStore();

  // 🔥 SOCKET HANDLERS
  useSocket({
    range_data: (...args: unknown[]) => {
      const payload = args[0] as RangeDataPayload;
      store.setRange(payload.start, payload.data, payload.owners);
    },
    checkbox_updated: (...args: unknown[]) => {
      const payload = args[0] as {
        id: number;
        checked: boolean;
        userId: string;
      };

      store.updateOne(payload.id, payload.checked ? 1 : 0, payload.userId);
    },
    action_rejected: (...args: unknown[]) => {
      const payload = args[0] as { id: number };
      const chunkStart = Math.floor(payload.id / CHUNK_SIZE) * CHUNK_SIZE;
      const chunkEnd = chunkStart + CHUNK_SIZE;

      socket.emit("get_range", {
        start: chunkStart,
        end: chunkEnd,
      });
    },
  });

  // 🔥 REFS
  const lastRangeRef = useRef<{ start: number; end: number } | null>(null);
  const prevRangeRef = useRef<{ start: number; end: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔥 LOAD RANGE (with unsubscribe)
  const loadRange = (start: number, end: number) => {
    if (prevRangeRef.current) {
      socket.emit("unsubscribe_range", prevRangeRef.current);
    }

    socket.emit("subscribe_range", { start, end });
    socket.emit("get_range", { start, end });

    prevRangeRef.current = { start, end };
  };

  // 🔥 CELL RENDER
  const Cell = ({ columnIndex, rowIndex, style }: CellComponentProps) => {
    const id = rowIndex * COLUMN_COUNT + columnIndex;

    return <CheckboxItem id={id} style={style} store={store} />;
  };

  // 🔥 RESPONSIVE GRID SIZE
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setGridSize({
          width: containerRef.current.offsetWidth,
          height: Math.min(400, window.innerHeight - 150),
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <Grid
        cellComponent={Cell}
        cellProps={{}}
        columnCount={COLUMN_COUNT}
        columnWidth={30}
        defaultHeight={gridSize.height}
        rowCount={ROW_COUNT}
        rowHeight={30}
        defaultWidth={gridSize.width}
        style={{ width: gridSize.width, height: gridSize.height }}
        onCellsRendered={(visibleCells) => {
          const start = visibleCells.rowStartIndex * COLUMN_COUNT;
          // const end = (visibleCells.rowStopIndex + 1) * COLUMN_COUNT;

          const alignedStart = Math.floor(start / CHUNK_SIZE) * CHUNK_SIZE;
          const alignedEnd = alignedStart + CHUNK_SIZE;

          if (
            lastRangeRef.current &&
            lastRangeRef.current.start === alignedStart &&
            lastRangeRef.current.end === alignedEnd
          ) {
            return;
          }

          lastRangeRef.current = {
            start: alignedStart,
            end: alignedEnd,
          };

          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }

          debounceRef.current = setTimeout(() => {
            loadRange(alignedStart, alignedEnd);
          }, 100);
        }}
      />
    </div>
  );
}
