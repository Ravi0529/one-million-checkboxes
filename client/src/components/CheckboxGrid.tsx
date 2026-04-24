import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Grid } from "react-window";
import type { CellComponentProps } from "react-window";
import { socket } from "../services/socket";
import { useCheckboxStore } from "../hooks/useCheckboxStore";
import { useSocket } from "../hooks/useSocket";
import CheckboxItem from "./CheckboxItem";

const COLUMN_COUNT = 50;
const ROW_COUNT = 20000;
const CHUNK_SIZE = 1000;
const MIN_CELL_SIZE = 20;
const MAX_CELL_SIZE = 34;
const GRID_SIDE_PADDING = 24;
const MIN_GRID_HEIGHT = 320;
const MAX_GRID_HEIGHT = 720;

interface RangeDataPayload {
  start: number;
  end: number;
  data: number[];
  owners: Record<number, string>;
}

export default function CheckboxGrid() {
  const store = useCheckboxStore();

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

    return <CheckboxItem id={id} style={style} store={store} />;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({
    width: 600,
    height: 420,
    cellSize: 24,
  });

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) {
        return;
      }

      const containerWidth = containerRef.current.clientWidth;
      const availableWidth = Math.max(
        containerWidth - GRID_SIDE_PADDING,
        COLUMN_COUNT * MIN_CELL_SIZE,
      );
      const cellSize = Math.max(
        MIN_CELL_SIZE,
        Math.min(MAX_CELL_SIZE, Math.floor(availableWidth / COLUMN_COUNT)),
      );
      const width = cellSize * COLUMN_COUNT;
      const height = Math.max(
        MIN_GRID_HEIGHT,
        Math.min(MAX_GRID_HEIGHT, window.innerHeight - 220),
      );

      setGridSize({ width, height, cellSize });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="checkbox-grid-shell"
      style={
        {
          "--cell-size": `${gridSize.cellSize}px`,
        } as CSSProperties
      }
    >
      <div className="checkbox-grid-frame">
        <Grid
          cellComponent={Cell}
          cellProps={{}}
          columnCount={COLUMN_COUNT}
          columnWidth={gridSize.cellSize}
          defaultHeight={gridSize.height}
          rowCount={ROW_COUNT}
          rowHeight={gridSize.cellSize}
          defaultWidth={gridSize.width}
          style={{ width: gridSize.width, height: gridSize.height }}
          onCellsRendered={(visibleCells) => {
            const start = visibleCells.rowStartIndex * COLUMN_COUNT;
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
    </div>
  );
}
