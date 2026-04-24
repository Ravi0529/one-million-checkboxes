import { useEffect, useState } from "react";
import CheckboxGrid from "./components/CheckboxGrid";
import { useSocket } from "./hooks/useSocket";
import { socket } from "./services/socket";

interface CheckboxStats {
  activeUsers: number;
  checkedCount: number;
}

const App = () => {
  const [stats, setStats] = useState<CheckboxStats>({
    activeUsers: 0,
    checkedCount: 0,
  });

  useSocket({
    stats_update: (...args: unknown[]) => {
      const payload = args[0] as Partial<CheckboxStats>;

      setStats({
        activeUsers: Number(payload.activeUsers ?? 0),
        checkedCount: Number(payload.checkedCount ?? 0),
      });
    },
  });

  useEffect(() => {
    socket.emit("get_stats");
  }, []);

  return (
    <div className="app">
      <h1>One Million Checkboxes</h1>
      <div className="app-toolbar">
        <div className="stats-panel">
          <div className="stat-card">
            <span className="stat-label">Active users:</span>
            <strong className="stat-value">
              {stats.activeUsers.toLocaleString()}
            </strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Checked boxes</span>
            <strong className="stat-value">
              {stats.checkedCount.toLocaleString()}
            </strong>
          </div>
        </div>
        <a
          className="github-link"
          href="https://github.com/Ravi0529/one-million-checkboxes"
          target="_blank"
          rel="noreferrer"
          aria-label="View source code on GitHub"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.52v-1.82c-2.95.64-3.57-1.25-3.57-1.25-.48-1.22-1.18-1.54-1.18-1.54-.96-.66.07-.65.07-.65 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.46 1.15 3.07.88.1-.68.37-1.15.67-1.42-2.36-.27-4.84-1.18-4.84-5.24 0-1.16.42-2.11 1.09-2.86-.11-.27-.47-1.38.11-2.88 0 0 .89-.29 2.92 1.09a10.18 10.18 0 0 1 5.32 0c2.03-1.38 2.92-1.09 2.92-1.09.58 1.5.22 2.61.11 2.88.68.75 1.09 1.7 1.09 2.86 0 4.07-2.49 4.96-4.86 5.23.38.33.72.97.72 1.95v2.89c0 .29.19.63.73.52A10.5 10.5 0 0 0 12 1.5Z" />
          </svg>
        </a>
      </div>
      <div className="grid-container">
        <CheckboxGrid />
      </div>
    </div>
  );
};

export default App;
