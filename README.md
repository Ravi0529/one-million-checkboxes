# One Million Checkboxes

A real-time multiplayer checkbox wall built to explore how far a simple UI can scale when many users interact with it at the same time.

The project renders a very large checkbox space, syncs updates across multiple backend instances, stores checkbox state in Redis, and uses Socket.IO to keep connected clients in sync with low-latency updates.

## What This Project Does

- Renders a universe of `1,000,000` possible checkboxes.
- Shows only the currently visible portion of the grid on screen.
- Lets multiple users toggle checkboxes in real time.
- Tracks ownership so a user can only untoggle the boxes they originally checked.
- Distributes live updates across multiple backend nodes using Redis pub/sub.
- Includes a custom Python load-testing script to simulate many concurrent users.

This project is not just a UI demo. It is also a practical experiment in real-time systems, state synchronization, and concurrency handling.

## Performance Notes

Based on the current implementation and the load-testing done with the included bot script:

- Around `500` active users can be handled smoothly.
- Around `1500-2000` active users still keep the app alive and functional, but the UX becomes noticeably laggier.
- Under heavier spike-style ramps, connection success and latency depend a lot on how quickly users are introduced.

Important note:

- "Did not crash" does not always mean "good UX".
- At higher concurrency, the system may still stay online while connection times and range fetch latency increase.

So the current state of the project is:

- Good steady behavior at moderate concurrency.
- Stable but slower behavior at much higher concurrency.
- A strong foundation for future tuning and production-style scaling improvements.

## Why This Project Is Interesting

This app looks simple on the surface, but it uses several important techniques to stay responsive under traffic:

- Chunk-based checkbox loading instead of loading all `1,000,000` items at once.
- Virtualized rendering with `react-window`.
- Redis bitmap storage for compact checkbox state.
- Atomic toggle logic using Lua scripts.
- Redis adapter for Socket.IO so multiple backend instances stay in sync.
- Rate limiting to protect the backend from spam and burst abuse.
- Fine-grained room subscriptions so users only receive updates for relevant checkbox chunks.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- `socket.io-client`
- `react-window`
- Plain CSS

### Backend

- Node.js
- TypeScript
- Express
- Socket.IO
- Redis
- `ioredis`
- `@socket.io/redis-adapter`

### Infra / Dev Tools

- Docker
- Docker Compose
- Python for load testing

## Core Features

- Real-time checkbox toggling.
- Ownership-aware toggle rules.
- Live synchronization across connected users.
- Responsive virtualized grid UI.
- Active user count and checked checkbox count.
- Load-testing support with configurable bot count, duration, and ramp-up speed.

## Project Structure

```text
.
|- client/                 # React frontend
|  |- src/
|  |  |- components/       # Checkbox grid and checkbox item components
|  |  |- hooks/            # Socket/store/value hooks
|  |  |- services/         # Socket client and user id helpers
|  |  `- index.css         # App styling
|- server/                 # Express + Socket.IO backend
|  |- src/
|  |  |- checkbox/         # Checkbox handlers, repository, service, Lua logic
|  |  |- config/           # Redis and Socket.IO config
|  |  |- sockets/          # Connection bootstrap
|  |  `- utils/            # Rate limiter
|  `- docker/              # Dockerfile and docker-compose
|- test-scripts/           # Python load-test scripts
`- README.md
```

## Architecture Overview

At a high level, the app works like this:

1. The frontend connects to one of several backend servers using Socket.IO.
2. The visible part of the checkbox grid is mapped to a chunk range.
3. The client subscribes to that chunk room.
4. The server reads that chunk from Redis and sends it back.
5. When a user toggles a checkbox, the server validates the action and updates Redis atomically.
6. The server emits the update to all users subscribed to the affected chunk.
7. Because the backends use the Redis Socket.IO adapter, the update propagates correctly even when different users are connected to different backend instances.

## Data Flow

### Read Flow

1. User scrolls the grid.
2. Frontend computes the visible row range.
3. The range is aligned to a chunk boundary.
4. Client emits `subscribe_range` and `get_range`.
5. Server fetches the chunk from Redis bitmap.
6. Server also fetches owners for checked boxes in that chunk.
7. Frontend store updates only the relevant checkboxes.

### Write Flow

1. User clicks a checkbox.
2. Frontend performs an optimistic update.
3. Client emits `toggle_checkbox`.
4. Server checks the rate limit.
5. Server runs the Redis Lua toggle operation atomically.
6. If allowed, the server broadcasts `checkbox_updated` to the chunk room.
7. If rejected, the client re-fetches the affected chunk.

## Important Techniques Used

### 1. Virtualized Rendering

Rendering thousands of checkbox DOM nodes at once would become expensive quickly. The app avoids that by using `react-window`, which only renders the cells currently visible inside the viewport.

Why it matters:

- lower DOM cost
- smoother scrolling
- better memory behavior on the client

### 2. Chunk-Based Fetching

The UI does not request all checkbox state. It fetches data in chunk windows.

Why it matters:

- smaller payloads
- less server work per client
- easier room-based live subscriptions

### 3. Redis Bitmap Storage

Checkbox checked state is stored in Redis as a bitmap. That makes the state compact and fast to read and update.

Why it matters:

- memory efficient for very large boolean state
- fast bit-level operations
- well suited for `1,000,000` checkbox positions

### 4. Lua-Based Atomic Toggle Logic

The toggle behavior is handled with a Redis Lua script so ownership checks and state updates happen atomically.

Why it matters:

- avoids race conditions
- preserves ownership rules
- keeps updates safe under concurrency

### 5. Multi-Backend Synchronization

The backend uses the Socket.IO Redis adapter so multiple Node servers can participate in the same real-time system.

Why it matters:

- users can connect to different backend instances
- events still reach the correct subscribed clients
- horizontal scaling becomes possible

### 6. Rate Limiting

Each user is currently limited to `20` requests per `5` seconds on the backend.

Why it matters:

- reduces spam
- protects Redis and Socket.IO from bursts
- makes the system more stable under aggressive traffic

### 7. Range Subscriptions

Clients subscribe only to the checkbox chunk they are currently viewing.

Why it matters:

- reduces unnecessary event fan-out
- keeps real-time updates focused
- makes scaling more realistic than global broadcasts

## Stats Support

The app currently includes top-level stats for:

- active users
- checked checkboxes

These are emitted through Socket.IO and backed by Redis-side counters.

This feature is useful for observability and UX, but it also has a scaling cost if broadcast too aggressively. During testing, this became one of the important lessons from the project: even a small "nice-to-have" live feature can become expensive at scale if not throttled carefully.

## Load Testing

This repository includes a Python bot script in [test-scripts/socket_load_test.py](test-scripts/socket_load_test.py).

Its role is to simulate many users connecting to the app at the same time and performing realistic socket actions such as:

- connecting to one of the backend nodes
- subscribing to checkbox ranges
- fetching chunk data
- toggling random checkboxes
- requesting stats

### Why the test script matters

It helps answer questions like:

- How many users can connect successfully?
- How much latency appears under load?
- Does the app stay up under traffic spikes?
- Does Redis pub/sub keep nodes in sync properly?
- Do rate limits behave as expected?

### Install the Python dependency

```bash
pip install "python-socketio[client]"
```

### Example load-test commands

```bash
python test-scripts/socket_load_test.py --users 50 --duration 60
python test-scripts/socket_load_test.py --users 200 --duration 120 --spawn-rate 20
python test-scripts/socket_load_test.py --users 500 --duration 120 --spawn-rate 25
python test-scripts/socket_load_test.py --users 1500 --duration 120 --spawn-rate 100
python test-scripts/socket_load_test.py --users 2000 --duration 180 --spawn-rate 100
```

### Meaning of the important flags

- `--users`: total number of simulated bot users
- `--duration`: how long each bot stays active after it starts
- `--spawn-rate`: how many new bots are introduced per second
- `--toggle-ratio`: how often a bot toggles instead of fetching a range

### Interpreting results

Look at:

- `Connected users`
- `Failed connections`
- `Connection success`
- `Avg connect time`
- `P95 / P99 range latency`
- `Rate-limited events`
- `Socket error events`

This gives a better picture than just asking whether the app crashed.

## Prerequisites

- Node.js
- npm
- Docker and Docker Compose
- Python (only if you want to run the load tests)

## How To Run The Project

### 1. Clone the repo

```bash
git clone https://github.com/Ravi0529/one-million-checkboxes.git
cd one-million-checkboxes
```

### 2. Install frontend dependencies

```bash
cd client
npm install
cd ..
```

### 3. Install backend dependencies

```bash
cd server
npm install
cd ..
```

### 4. Create environment file

The Docker Compose file expects a root `.env` file.

A simple local example:

```env
REDIS_HOST=redis
REDIS_PORT=6379
PORT=8000
```

Note:

- inside Docker, `REDIS_HOST=redis` is correct because the Redis container is named `redis`
- if you run the backend locally outside Docker, `REDIS_HOST=localhost` may be more appropriate

### 5. Start Redis and backend replicas with Docker

From the `server` folder:

```bash
cd server
docker compose -f docker/docker-compose.yaml up --build
```

This starts:

- Redis
- 3 backend replicas exposed on `8000`, `8001`, and `8002`

### 6. Start the frontend

In a separate terminal:

```bash
cd client
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Running Without Docker

You can also run Redis separately and start the backend manually.

### Backend

```bash
cd server
npm run build
npm run start
```

or during development:

```bash
cd server
npm run dev
```

### Frontend

```bash
cd client
npm run dev
```

If you do this, make sure your backend ports and Redis host/port match your environment.

## Current Backend Ports

The frontend randomly connects to one of:

- `http://localhost:8000`
- `http://localhost:8001`
- `http://localhost:8002`

This is defined in `client/src/services/socket.ts`.

## Smoothness and Scaling Notes

The app stays usable because it avoids the common traps of real-time UIs:

- it does not render too many cells at once
- it does not subscribe users to the full world state
- it uses compact storage for checkbox data
- it uses atomic backend logic for concurrent writes
- it distributes events across multiple backend processes

That said, the project is still a learning and performance-focused system, not a finished production platform. There is still room to improve:

- connection spike handling
- stats fan-out strategy
- batching and payload tuning
- better observability and metrics dashboards
- more production-style deployment and autoscaling

## Future Improvement Ideas

- Add a reverse proxy or load balancer in front of backend instances.
- Add structured logs and monitoring.
- Add Redis persistence and backup strategy.
- Add connection metrics and request tracing.
- Throttle or batch non-critical real-time events more aggressively.
- Add CI checks and automated performance benchmarks.

## Key Learning From The Project

One of the biggest lessons from this app is that scaling a "simple" product is rarely about just adding more servers. Smoothness comes from many small design choices working together:

- careful frontend rendering
- reducing unnecessary network chatter
- efficient storage
- atomic state transitions
- controlling who receives which updates

That is the real value of this project.

## Author

Built by Ravi.

GitHub:

- https://github.com/Ravi0529/one-million-checkboxes
