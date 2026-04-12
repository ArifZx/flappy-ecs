# FFA Integration Notes

This document exists as a fast-path reference for the current Free For All multiplayer work.

It is intentionally practical and narrow in scope.

## Goal

Finish the first usable FFA loop before expanding the friends-room flow.

The current usable FFA loop means:

- player can join the global FFA room
- local run remains client-simulated
- client sends periodic snapshots to the server
- server maintains authoritative leaderboard state
- client receives nearby player snapshots and renders remote birds without local physics
- finish state is reported explicitly so the leaderboard can lock in final ordering
- online pipe layout comes from the server-provided seed
- online score increments are accepted only after server-side validation

## Current State

### Server

The server already supports:

- `ffa:join`
- `player:update`
- `player:finish`
- `ffa:state`
- `leaderboard:update`

The server already broadcasts `players:nearby` snapshots.

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

The web client already:

- publishes gameplay snapshots during FFA
- reports finish state from the game runtime into the network layer
- renders nearby remote birds from server snapshots
- applies the room seed from the server before online play starts

## FFA Design Rules

### 1. Bird simulation stays local, online pipe seed does not

For this first FFA version, the local player still runs the normal local offline simulation.

That means:

- flap timing stays local
- bird movement stays local
- collisions stay local
- offline pipe generation stays local

For online FFA specifically:

- the server chooses `config.seed`
- the client uses that seed for deterministic pipe generation
- the server reconstructs the same sequence to validate score triggers

The server is not responsible for simulating bird physics in this phase.

### 2. Server owns room state, room seed, and accepted score state

The server should be treated as the source of truth for:

- who is currently in the FFA room
- each player display name
- the room seed used for online pipe generation
- each player accepted progress
- each player accepted score
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

### 5. Finish must be explicit and may carry the last score trigger

Regular snapshots are not enough for final placement.

The client must send `player:finish` once when the run is over, carrying at least:

- room id
- latest progress
- latest score

It may also carry the last pending `scoreTrigger` when the final point happened right before game over.

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
- `progress` and `score` are telemetry, not authoritative proof on their own
- `alive` and `finished` drive remote bird visibility and end-state presentation
- `updatedAt` is useful for pruning stale remote data later
- `scoreTrigger` is used for server-side point acceptance

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

### Do not trust raw client score fields for anti-cheat

This first FFA pass is not authoritative simulation.

So movement snapshots are still accepted as gameplay telemetry, not strong anti-cheat proof.

However, score is no longer accepted from the raw `score` field alone. The server validates score increments against the shared deterministic map rules, the room seed, the next expected pipe pair, and the claimed bird position inside the gap.

If stronger integrity is needed later, that requires a different design.

## Suggested Implementation Order

1. add movement sanity checks on the server
2. add rate limiting for `player:update`
3. derive leaderboard progress from validated state instead of trusting raw client numbers
4. expand runtime diagnostics for the last accepted point on finish

## Definition Of Done For First FFA Pass

The first FFA pass is good enough when:

- two browser tabs can join the same FFA room
- each tab sees the other bird moving
- leaderboard updates as accepted score changes
- disconnect removes the remote bird cleanly
- finish updates leaderboard state cleanly
- offline mode still works unchanged
- online FFA uses the server room seed instead of a fixed local online seed