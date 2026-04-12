# Flappy Server

This document explains the current multiplayer server behavior in [apps/server/src/index.ts](apps/server/src/index.ts). It describes the runtime that exists today, not the long-term target design.

## Summary

The server uses a Node.js HTTP server plus Socket.IO. Its current responsibilities are:

- exposing a simple HTTP health endpoint
- managing the global Free For All room
- managing friends rooms for lobby, countdown, and start state
- storing the FFA leaderboard and nearby player snapshots
- serving multiplayer event contracts shared through [packages/shared/src/index.ts](packages/shared/src/index.ts)

The server is not authoritative for gameplay simulation yet. Clients still run local simulation and send snapshots to the server.

## File Locations

- [apps/server/src/index.ts](apps/server/src/index.ts): current server implementation
- [apps/server/package.json](apps/server/package.json): dev, build, and start scripts
- [packages/shared/src/index.ts](packages/shared/src/index.ts): shared event and payload contracts

## Running the Server

Environment variables in use:

- `PORT`: defaults to `3001`
- `MULTIPLAYER_DEBUG`: enabled by default. Set it to `0` to disable debug logging.
- `CORS_ORIGINS`: comma-separated allowlist of accepted origins

Default allowed CORS origins:

- `https://flappy.arifz.com`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:4173`
- `http://127.0.0.1:4173`

Override the allowlist like this when needed:

```env
CORS_ORIGINS=https://flappy.arifz.com,http://localhost:5173
```

Available commands:

```bash
pnpm dev:server
pnpm --filter @flappy/server build
pnpm --filter @flappy/server start
```

The HTTP health check is available at `GET /` and returns a simple JSON status payload.

The HTTP monitor is available at `GET /monitor` and returns a summary of active rooms plus player counts per room.

Important fields in the `GET /monitor` response:

- `rooms.total`: total rooms currently tracked by the server
- `players.total`: total players across all rooms
- `roomDetails[]`: room list with `roomId`, `mode`, `status`, and `playerCount`
- `roomDetails[].createdAtIso`: room creation time in ISO format
- `roomDetails[].uptimeSeconds`: how long the room has been active in seconds

For the global FFA room, the monitor can also return extra fields while the room is empty but still waiting for auto-shutdown:

- `lastPlayerDisconnectedAtIso`: when the latest player disconnected
- `idleShutdownAtIso`: when the idle room will be cleaned up
- `secondsUntilShutdown`: remaining time before the FFA room disappears from the monitor

Monitor behavior notes:

- The FFA room only appears in `roomDetails[]` if it still has players, or if it is in the idle timeout grace period.
- After the idle timeout completes and no new player joins, the FFA room is no longer shown as an active room in the monitor.

## Runtime Architecture

The server currently tracks two session categories:

- one global FFA room with the fixed id `ffa-main`
- multiple friends rooms with random 6-character uppercase room codes

Each socket receives an active session assignment:

- `free-for-all`
- `friends`

That assignment is used during disconnect handling so the server can clean up the correct room.

## Important Constants

Current default runtime values:

- `FFA_ROOM_ID = "ffa-main"`
- `FFA_IDLE_TIMEOUT_MS = 30000`
- `FFA_DURATION_SECONDS = 90`
- `MAX_VISIBLE_PLAYERS = 20`
- default player spawn position: `x = 78`, `y = 220`

Implications:

- the FFA room is always treated as `running` while active
- if FFA stays empty for 30 seconds, its state is fully reset
- nearby player snapshots are capped at 20 players per client

## Server Data Model

### ConnectedPlayer

Per-player state stored by the server:

- identity: `playerId`, `displayName`, `variant`
- lifecycle: `joinedAt`, `updatedAt`, `alive`, `finished`, `finishedAt`
- gameplay snapshot: `x`, `y`, `rotation`, `progress`, `score`

The server preserves the highest observed score and progress with `Math.max(...)`, so later client updates must not reduce already-recorded progress.

### FFA room

The FFA room stores:

- `summary: RoomSummary`
- `players: Map<PlayerId, ConnectedPlayer>`
- `idleTimer`

When the room is reset because of idleness, a new seed is generated through `randomSeed()`.

### Friends room

Each friends room stores:

- `roomId`
- `hostPlayerId`
- `players`
- `summary`
- `countdownTimer`

If the host disconnects while the room still has players, host ownership is transferred to the next available player.

## Free For All Flow

### Join

Clients enter FFA through the `ffa:join` event.

On join:

- the FFA idle timer is cleared
- the player record is created or restored for that socket
- the socket joins the `ffa-main` room
- the server broadcasts the latest FFA state

### Gameplay updates

Clients send `player:update` with a `snapshot` payload.

The server then:

- verifies that the target room is `ffa-main`
- updates position, rotation, variant, and timestamp
- only increases `score` and `progress` when the new values are higher
- stamps `finishedAt` the first time a snapshot reports completion
- re-broadcasts FFA state, leaderboard, and nearby players

### Finish

Clients send `player:finish` when a run ends.

The server then:

- verifies that the player has joined FFA
- stores the highest `progress` and `score`
- marks the player as `alive = false`, `finished = true`, and sets `finishedAt`
- re-broadcasts FFA state

### Leaderboard

The leaderboard is built from all FFA players using this sort order:

1. highest `score`
2. highest `progress`
3. earliest `joinedAt`

The server only sends the top 10 entries through `leaderboard:update`.

The payload also includes `maxScore`, which is the current score of the top player.

### Nearby players

For each FFA player, the server also sends `players:nearby` containing:

- all other players except the receiving player
- sorted with living players first, then by progress, then by most recent update
- truncated to `maxVisiblePlayers`

This fits the current client approach: remote players are presentation-only and are not part of authoritative simulation.

### Idle shutdown

When all players leave FFA:

- the server schedules a 30 second timer
- if the room is still empty when the timer expires, the FFA room is recreated from scratch

That reset clears players, leaderboard state, and the previous seed.

## Friends Room Flow

### Create room

The `room:create` event creates a new room with:

- a random 6-character uppercase room code
- the creating socket as host
- initial status `waiting`
- `countdownSeconds = 5`
- `durationSeconds` from the host request

The server then sends:

- `room:created` to the creator
- `room:lobby` to all room members

### Join room

The `room:join` event only succeeds when:

- the room exists
- the room status is still `waiting`

If valid, the player is inserted into the room map, the socket joins the room, and the server emits `room:joined` and `room:lobby`.

### Update config

The `room:update-config` event can only be called by the host, and only while the room status is `waiting`.

On success:

- `durationSeconds` is updated
- the server emits `room:state`
- the server emits `room:lobby` to refresh per-player lobby state

### Start room

The `room:start` event can only be called by the host, and only while the room status is `waiting`.

When started:

- the room status changes to `countdown`
- `startsAt` and `endsAt` are populated
- the server emits `room:countdown`
- the server emits `room:lobby`

After countdown completes:

- the room status changes to `running`
- the server emits `room:state`
- the server emits `room:lobby`

### Disconnect handling

When a player leaves a friends room:

- the player is removed from the room
- if the host leaves, the next remaining player becomes host
- lobby state is broadcast again
- the room is deleted completely if it becomes empty

If the room still has a `countdownTimer`, it is also cleared when the room is deleted.

## Event Contract

Type definitions live in [packages/shared/src/index.ts](packages/shared/src/index.ts).

### Client to server

- `system:ping`
- `ffa:join`
- `room:create`
- `room:join`
- `room:start`
- `room:update-config`
- `player:update`
- `player:finish`

### Server to client

- `system:pong`
- `ffa:state`
- `leaderboard:update`
- `players:nearby`
- `room:created`
- `room:joined`
- `room:lobby`
- `room:state`
- `room:countdown`
- `room:finished`
- `server:error`

Important note: `room:finished` already exists in the shared contract, but the current server implementation does not emit it yet.

## Error Handling

The server emits `server:error` for common validation failures such as:

- friends room not found
- friends room already in progress
- non-host trying to update config or start a room
- client sending snapshots before joining FFA
- client trying to use `player:update` or `player:finish` for friends mode

Errors are only sent back to the originating socket through `io.to(playerId)`.

## Current Limitations

Some pieces are still intentionally incomplete:

- friends mode does not yet accept or broadcast `player:update`
- friends mode does not yet produce a final leaderboard and does not emit `room:finished`
- there is no persistence; all state is lost when the process restarts
- there is no authentication, rate limiting, or strict payload validation yet
- CORS is limited to an allowlist, but there is no broader transport hardening yet
- room membership is entirely based on currently connected sockets

That means the server is currently best treated as a session coordinator and lightweight broadcaster, not an authoritative multiplayer simulation server.

## Debugging and Operations

When `MULTIPLAYER_DEBUG` is enabled, the server logs important events such as:

- socket connect and disconnect
- FFA joins
- friends room create, join, update, and start actions

All logs use the `[multiplayer]` prefix so they are easy to filter.

## Recommended Next Steps

The most sensible follow-up order from the current implementation is:

1. Add snapshot handling for friends mode.
2. Add friends round completion and emit `room:finished`.
3. Decide whether the server remains relay-only or becomes authoritative for progress and score.
4. Add payload validation and anti-spam guards for realtime events.
5. Add persistence if leaderboard or room state needs to survive process restarts.
