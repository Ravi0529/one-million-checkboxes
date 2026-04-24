#!/usr/bin/env python3
"""
Simple Socket.IO load test for the One Million Checkboxes app.

Install dependency:
    pip install "python-socketio[client]"

--- (users = total users), (duration = each bot runs for x seconds from when the bot starts), (spawn-rate = x new bots generated per second till they reach the total number of bots/users)

Example:
    python test-scripts/socket_load_test.py --users 50 --duration 60
    python test-scripts/socket_load_test.py --users 200 --duration 120 --spawn-rate 20
    python test-scripts/socket_load_test.py --users 500 --duration 120 --spawn-rate 25
    python test-scripts/socket_load_test.py --users 1500 --duration 120 --spawn-rate 100
    python test-scripts/socket_load_test.py --users 2000 --duration 180 --spawn-rate 100
"""

from __future__ import annotations

import argparse
import asyncio
import random
import statistics
import string
import sys
import time
from dataclasses import dataclass, field

try:
    import socketio
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        'Missing dependency. Run: pip install "python-socketio[client]"'
    ) from exc


DEFAULT_URLS = [
    "http://localhost:8000",
    "http://localhost:8001",
    "http://localhost:8002",
]
COLUMN_COUNT = 50
CHUNK_SIZE = 1000
MAX_CHECKBOXES = 1_000_000


@dataclass
class BotMetrics:
    connect_ms: float | None = None
    connected: bool = False
    connect_failed: bool = False
    disconnects: int = 0
    errors: int = 0
    rate_limited: int = 0
    range_requests: int = 0
    range_responses: int = 0
    toggle_requests: int = 0
    stats_requests: int = 0
    stats_updates: int = 0
    checkbox_updates: int = 0
    range_latencies_ms: list[float] = field(default_factory=list)


class LoadBot:
    def __init__(
        self,
        bot_id: int,
        url: str,
        duration_seconds: float,
        action_interval_min: float,
        action_interval_max: float,
        toggle_ratio: float,
        start_chunk: int | None,
    ) -> None:
        self.bot_id = bot_id
        self.url = url
        self.duration_seconds = duration_seconds
        self.action_interval_min = action_interval_min
        self.action_interval_max = action_interval_max
        self.toggle_ratio = toggle_ratio
        self.current_chunk_start = (
            start_chunk if start_chunk is not None else self._random_chunk_start()
        )
        self.current_chunk_end = self.current_chunk_start + CHUNK_SIZE
        self.metrics = BotMetrics()
        self._range_requested_at: float | None = None
        self._stop = asyncio.Event()
        suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
        self.user_id = f"load-bot-{bot_id}-{suffix}"
        self.client = socketio.AsyncClient(
            reconnection=False,
            logger=False,
            engineio_logger=False,
        )
        self._register_handlers()

    async def _cleanup_client(self) -> None:
        try:
            if self.client.connected:
                try:
                    await self.client.emit(
                        "unsubscribe_range",
                        {
                            "start": self.current_chunk_start,
                            "end": self.current_chunk_end,
                        },
                    )
                except Exception:
                    pass

                try:
                    await self.client.disconnect()
                except Exception:
                    pass
        finally:
            try:
                await self.client.shutdown()
            except Exception:
                pass

            http_session = getattr(self.client.eio, "http", None)

            if http_session is not None and hasattr(http_session, "close"):
                try:
                    await http_session.close()
                except Exception:
                    pass

    def _register_handlers(self) -> None:
        @self.client.event
        async def connect() -> None:
            self.metrics.connected = True

        @self.client.event
        async def disconnect() -> None:
            self.metrics.disconnects += 1

        @self.client.on("range_data")
        async def on_range_data(_payload: dict) -> None:
            self.metrics.range_responses += 1

            if self._range_requested_at is not None:
                latency_ms = (time.perf_counter() - self._range_requested_at) * 1000
                self.metrics.range_latencies_ms.append(latency_ms)
                self._range_requested_at = None

        @self.client.on("checkbox_updated")
        async def on_checkbox_updated(_payload: dict) -> None:
            self.metrics.checkbox_updates += 1

        @self.client.on("stats_update")
        async def on_stats_update(_payload: dict) -> None:
            self.metrics.stats_updates += 1

        @self.client.on("rate_limited")
        async def on_rate_limited(_payload: dict) -> None:
            self.metrics.rate_limited += 1

        @self.client.on("error")
        async def on_error(_payload: dict) -> None:
            self.metrics.errors += 1

    def _random_chunk_start(self) -> int:
        max_chunk_index = (MAX_CHECKBOXES // CHUNK_SIZE) - 1
        chunk_index = random.randint(0, max_chunk_index)
        return chunk_index * CHUNK_SIZE

    def _random_checkbox_id(self) -> int:
        return random.randint(self.current_chunk_start, self.current_chunk_end - 1)

    async def _subscribe_to_chunk(self, chunk_start: int) -> None:
        if chunk_start == self.current_chunk_start:
            return

        await self.client.emit(
            "unsubscribe_range",
            {"start": self.current_chunk_start, "end": self.current_chunk_end},
        )

        self.current_chunk_start = chunk_start
        self.current_chunk_end = chunk_start + CHUNK_SIZE

        await self.client.emit(
            "subscribe_range",
            {"start": self.current_chunk_start, "end": self.current_chunk_end},
        )

    async def _request_range(self) -> None:
        self.metrics.range_requests += 1
        self._range_requested_at = time.perf_counter()
        await self.client.emit(
            "get_range",
            {"start": self.current_chunk_start, "end": self.current_chunk_end},
        )

    async def _request_stats(self) -> None:
        self.metrics.stats_requests += 1
        await self.client.emit("get_stats")

    async def _toggle_checkbox(self) -> None:
        self.metrics.toggle_requests += 1
        await self.client.emit("toggle_checkbox", {"id": self._random_checkbox_id()})

    async def run(self) -> BotMetrics:
        started_at = time.perf_counter()

        try:
            await self.client.connect(
                self.url,
                auth={"userId": self.user_id},
                transports=["websocket"],
                wait_timeout=10,
            )
            self.metrics.connect_ms = (time.perf_counter() - started_at) * 1000
            await self.client.emit(
                "subscribe_range",
                {"start": self.current_chunk_start, "end": self.current_chunk_end},
            )
            await self._request_stats()
            await self._request_range()

            deadline = time.perf_counter() + self.duration_seconds

            while time.perf_counter() < deadline and not self._stop.is_set():
                await asyncio.sleep(
                    random.uniform(self.action_interval_min, self.action_interval_max)
                )

                if random.random() < 0.25:
                    await self._subscribe_to_chunk(self._random_chunk_start())
                    await self._request_range()
                    continue

                if random.random() < self.toggle_ratio:
                    await self._toggle_checkbox()
                else:
                    await self._request_range()
        except asyncio.CancelledError:
            self._stop.set()
            await self._cleanup_client()
            raise
        except Exception:
            self.metrics.connect_failed = True
            self._stop.set()
            await self._cleanup_client()
            return self.metrics

        await self._cleanup_client()

        return self.metrics


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0

    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int(round((pct / 100) * (len(ordered) - 1)))))
    return ordered[index]


async def run_load_test(args: argparse.Namespace) -> None:
    bots: list[LoadBot] = []
    tasks: list[asyncio.Task[BotMetrics]] = []
    started = time.perf_counter()

    try:
        for bot_id in range(args.users):
            bot = LoadBot(
                bot_id=bot_id + 1,
                url=random.choice(args.urls),
                duration_seconds=args.duration,
                action_interval_min=args.min_interval,
                action_interval_max=args.max_interval,
                toggle_ratio=args.toggle_ratio,
                start_chunk=args.chunk_start,
            )
            bots.append(bot)
            tasks.append(asyncio.create_task(bot.run()))

            if args.spawn_rate > 0:
                await asyncio.sleep(1 / args.spawn_rate)

        results = await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        for task in tasks:
            task.cancel()

        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    elapsed = time.perf_counter() - started

    connected = sum(1 for item in results if item.connected)
    failed = sum(1 for item in results if item.connect_failed)
    disconnects = sum(item.disconnects for item in results)
    errors = sum(item.errors for item in results)
    rate_limited = sum(item.rate_limited for item in results)
    range_requests = sum(item.range_requests for item in results)
    range_responses = sum(item.range_responses for item in results)
    toggle_requests = sum(item.toggle_requests for item in results)
    stats_requests = sum(item.stats_requests for item in results)
    stats_updates = sum(item.stats_updates for item in results)
    checkbox_updates = sum(item.checkbox_updates for item in results)
    connect_times = [item.connect_ms for item in results if item.connect_ms is not None]
    range_latencies = [
        latency for item in results for latency in item.range_latencies_ms
    ]

    print("\n=== Load Test Summary ===")
    print(f"Target URLs          : {', '.join(args.urls)}")
    print(f"Requested users      : {args.users}")
    print(f"Connected users      : {connected}")
    print(f"Failed connections   : {failed}")
    print(f"Duration             : {elapsed:.1f}s")
    print(f"Disconnect events    : {disconnects}")
    print(f"Range requests       : {range_requests}")
    print(f"Range responses      : {range_responses}")
    print(f"Toggle requests      : {toggle_requests}")
    print(f"Stats requests       : {stats_requests}")
    print(f"Stats updates        : {stats_updates}")
    print(f"Checkbox updates     : {checkbox_updates}")
    print(f"Rate-limited events  : {rate_limited}")
    print(f"Socket error events  : {errors}")

    if connect_times:
        print(f"Avg connect time     : {statistics.mean(connect_times):.1f} ms")
        print(f"P95 connect time     : {percentile(connect_times, 95):.1f} ms")

    if range_latencies:
        print(f"Avg range latency    : {statistics.mean(range_latencies):.1f} ms")
        print(f"P95 range latency    : {percentile(range_latencies, 95):.1f} ms")
        print(f"P99 range latency    : {percentile(range_latencies, 99):.1f} ms")

    success_rate = (connected / args.users) * 100 if args.users else 0
    print(f"Connection success   : {success_rate:.1f}%")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Load test the One Million Checkboxes Socket.IO backend.",
    )
    parser.add_argument(
        "--users",
        type=int,
        default=50,
        help="Number of concurrent bots to simulate.",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=60,
        help="How long each bot should stay active in seconds.",
    )
    parser.add_argument(
        "--spawn-rate",
        type=float,
        default=10,
        help="How many bots to start per second.",
    )
    parser.add_argument(
        "--min-interval",
        type=float,
        default=1.0,
        help="Minimum delay between actions for each bot in seconds.",
    )
    parser.add_argument(
        "--max-interval",
        type=float,
        default=2.5,
        help="Maximum delay between actions for each bot in seconds.",
    )
    parser.add_argument(
        "--toggle-ratio",
        type=float,
        default=0.35,
        help="Chance that a bot toggles a checkbox instead of requesting a range.",
    )
    parser.add_argument(
        "--chunk-start",
        type=int,
        default=None,
        help="Optional fixed chunk start for all bots, e.g. 0 or 1000.",
    )
    parser.add_argument(
        "--urls",
        nargs="+",
        default=DEFAULT_URLS,
        help="Socket server URLs. Bots are distributed randomly across them.",
    )
    return parser


def main() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    parser = build_parser()
    args = parser.parse_args()

    if args.users <= 0:
        raise SystemExit("--users must be greater than 0")

    if args.duration <= 0:
        raise SystemExit("--duration must be greater than 0")

    if args.min_interval <= 0 or args.max_interval <= 0:
        raise SystemExit("Intervals must be greater than 0")

    if args.min_interval > args.max_interval:
        raise SystemExit("--min-interval cannot be greater than --max-interval")

    if not 0 <= args.toggle_ratio <= 1:
        raise SystemExit("--toggle-ratio must be between 0 and 1")

    if args.chunk_start is not None and (
        args.chunk_start < 0
        or args.chunk_start >= MAX_CHECKBOXES
        or args.chunk_start % CHUNK_SIZE != 0
    ):
        raise SystemExit("--chunk-start must be a valid multiple of 1000")

    try:
        asyncio.run(run_load_test(args))
    except KeyboardInterrupt:
        raise SystemExit("Load test interrupted. Bot sessions were asked to close.")


if __name__ == "__main__":
    main()
