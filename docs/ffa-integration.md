# FFA Integration Notes

This document exists as a fast-path reference for the current Free For All multiplayer work.

It is intentionally practical and narrow in scope.

## Goal

Finish the first usable FFA loop before expanding the friends-room flow.

The first usable FFA loop means:

- player can join the global FFA room
- local run remains client-simulated
- client sends periodic snapshots to the server
- server maintains authoritative leaderboard state
- client receives nearby player snapshots and renders remote birds without local physics
- finish state is reported explicitly so the leaderboard can lock in final ordering

## Current State

### Server

The server already supports:

- `ffa:join`
- `player:update`
- `player:finish`
- `ffa:state`
- `leaderboard:update`

The server currently does not yet broadcast `players:nearby` snapshots.

The FFA leaderboard is already sorted by:

1. higher score
2. higher progress
3. earlier join time

### Web client

The web client already supports:

- opening FFA mode from the main menu
- joining the socket room
- showing the FFA session panel
- running the local game loop

The web client currently does not yet:

- publish gameplay snapshots during FFA
- report finish state from the game runtime into the network layer
- render nearby remote birds from server snapshots

## FFA Design Rules

### 1. Local simulation stays local

For this first FFA version, the local player still runs the normal local offline simulation.

That means:

- flap timing stays local
- pipe generation stays local
- collisions stay local
- score progression stays local

The server is not responsible for simulating bird physics in this phase.

### 2. Server owns room state and leaderboard state

The server should be treated as the source of truth for:

- who is currently in the FFA room
- each player display name
- each player latest published progress
- each player latest published score
- alive/finished state
- final leaderboard ordering

### 3. Remote birds are presentation-only

Remote birds must not create local dynamic physics bodies.

They should be rendered from snapshots only.

This keeps the first multiplayer pass simple and aligns with the existing architecture direction.

### 4. Snapshot rate is fixed at 20 FPS

The FFA client snapshot send rate is **20 FPS**.

That means one outbound snapshot every `50 ms`.

This is the current working rule unless the networking model changes.

Reasons:

- smoother than low-frequency score-only updates
- much cheaper than pushing every render tick
- simple enough to implement without interpolation complexity explosion

### 5. Finish must be explicit

Regular snapshots are not enough for final placement.

The client must send `player:finish` once when the run is over, carrying at least:

- room id
- latest progress
- latest score

After a finish message:

- the server marks the player as finished
- the server stores `finishedAt`
- later snapshots must not be allowed to regress the final state

## Recommended Event Flow

### Join flow

1. client selects `free-for-all`
2. client connects socket and emits `ffa:join`
3. server adds or restores player entry in `ffaRoom.players`
4. server emits `ffa:state`
5. server emits `leaderboard:update`
6. server should also start sending `players:nearby`

### Runtime flow

1. local game starts as normal
2. every `50 ms`, client sends `player:update`
3. server stores latest state for that player
4. server broadcasts `players:nearby`
5. client updates or creates remote birds from nearby snapshots

### Finish flow

1. local game reaches game over or terminal finish state
2. client emits `player:finish` once
3. server marks player finished and stamps `finishedAt`
4. server re-emits leaderboard and nearby player state

## Snapshot Payload Expectations

The existing shared `PlayerSnapshot` type already includes:

- `playerId`
- `displayName`
- `variant`
- `x`
- `y`
- `rotation`
- `progress`
- `score`
- `alive`
- `finished`
- `updatedAt`

For the first FFA version:

- `x`, `y`, and `rotation` are used only for remote rendering
- `progress` and `score` drive leaderboard ordering
- `alive` and `finished` drive remote bird visibility and end-state presentation
- `updatedAt` is useful for pruning stale remote data later

## Server Broadcast Expectations

The server should broadcast `players:nearby` to the FFA room.

For the first pass, “nearby” can simply mean all visible remote players in the room, capped by `maxVisiblePlayers`.

That is good enough before introducing spatial filtering.

Payload shape:

- `selfPlayerId`
- `players`

The `players` array should not include the receiving player’s own snapshot.

## Client Rendering Expectations

The FFA renderer should maintain a small remote-player registry.

Each remote player entry should contain at least:

- `playerId`
- remote bird entity id
- remote sprite reference
- latest snapshot timestamp

When a new snapshot arrives:

- create missing remote birds
- update existing remote birds in place
- remove stale remote birds that disappear from server payloads

For the first pass, direct snap-to-position updates are acceptable.

Interpolation can be added later if needed.

## Guardrails

### Do not block offline mode

FFA integration must not break:

- offline gameplay
- offline restart flow
- share image capture
- score guard behavior

### Do not mix remote birds into local scoring logic

Remote bird entities are visual only.

They must not affect:

- local collision logic
- local score progression
- local pipe pass detection

### Do not trust client snapshots for anti-cheat

This first FFA pass is not authoritative simulation.

So snapshots are accepted as gameplay telemetry, not strong anti-cheat proof.

If stronger integrity is needed later, that requires a different design.

## Suggested Implementation Order

1. extend the client networking adapter with `players:nearby` handling
2. add a 20 FPS snapshot publisher from the web runtime
3. add one-shot finish reporting
4. make the server broadcast FFA nearby snapshots
5. render remote birds from server snapshots
6. prune stale remote birds and validate cleanup on disconnect

## Definition Of Done For First FFA Pass

The first FFA pass is good enough when:

- two browser tabs can join the same FFA room
- each tab sees the other bird moving
- leaderboard updates as score changes
- disconnect removes the remote bird cleanly
- finish updates leaderboard state cleanly
- offline mode still works unchanged