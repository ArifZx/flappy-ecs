# Flappy Server

Dokumen ini menjelaskan perilaku server multiplayer yang ada di [apps/server/src/index.ts](apps/server/src/index.ts). Fokusnya adalah runtime yang berjalan sekarang, bukan desain target jangka panjang.

## Ringkasan

Server memakai Node.js HTTP server + Socket.IO. Tanggung jawab utamanya saat ini:

- menyediakan health endpoint HTTP sederhana
- mengelola room Free For All global
- mengelola friends room untuk lobby, countdown, dan start state
- menyimpan leaderboard FFA dan snapshot pemain terdekat
- mengirim event multiplayer yang tipenya dibagi lewat [packages/shared/src/index.ts](packages/shared/src/index.ts)

Server ini belum authoritative untuk simulasi gameplay. Klien masih menjalankan simulasi lokal lalu mengirim snapshot ke server.

## Lokasi File

- [apps/server/src/index.ts](apps/server/src/index.ts): implementasi server saat ini
- [apps/server/package.json](apps/server/package.json): script dev, build, dan start
- [packages/shared/src/index.ts](packages/shared/src/index.ts): kontrak event dan payload client-server

## Menjalankan Server

Environment variable yang dipakai:

- `PORT`: default `3001`
- `MULTIPLAYER_DEBUG`: default aktif. Set `0` untuk mematikan debug log.
- `CORS_ORIGINS`: daftar origin yang diizinkan, dipisahkan koma

Default CORS origin yang diizinkan:

- `https://flappy.arifz.com`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:4173`
- `http://127.0.0.1:4173`

Kalau perlu override, isi `CORS_ORIGINS` dengan format seperti ini:

```env
CORS_ORIGINS=https://flappy.arifz.com,http://localhost:5173
```

Perintah yang tersedia:

```bash
pnpm dev:server
pnpm --filter @flappy/server build
pnpm --filter @flappy/server start
```

Health check HTTP tersedia di `GET /` dan mengembalikan JSON status sederhana.

Monitor HTTP tersedia di `GET /monitor` dan mengembalikan ringkasan room aktif beserta jumlah player per room.

Contoh field penting dari `GET /monitor`:

- `rooms.total`: total room yang sedang dilacak server, termasuk FFA global
- `players.total`: total player di semua room
- `roomDetails[]`: daftar room dengan `roomId`, `mode`, `status`, dan `playerCount`
- `roomDetails[].createdAtIso`: waktu room dibuat dalam format ISO
- `roomDetails[].uptimeSeconds`: sudah berapa lama room aktif dalam detik

Untuk room FFA global, monitor juga bisa mengembalikan field tambahan saat room sedang kosong tetapi masih menunggu auto-shutdown:

- `lastPlayerDisconnectedAtIso`: waktu player terakhir disconnect
- `idleShutdownAtIso`: deadline room idle akan dibersihkan
- `secondsUntilShutdown`: sisa waktu sebelum room FFA dihapus dari monitor

Catatan perilaku monitor:

- FFA hanya muncul di `roomDetails[]` jika masih ada player, atau jika sedang dalam masa tunggu idle timeout.
- Setelah timeout idle selesai dan tidak ada player baru yang join, room FFA tidak lagi ditampilkan sebagai room aktif di monitor.

## Arsitektur Runtime

Server menyimpan dua kategori session:

- satu room FFA global dengan id tetap `ffa-main`
- banyak friends room dengan kode acak 6 karakter uppercase

Setiap socket diberi assignment session aktif:

- `free-for-all`
- `friends`

Assignment ini dipakai saat disconnect untuk membersihkan room yang benar.

## Konstanta Penting

Nilai default runtime saat ini:

- `FFA_ROOM_ID = "ffa-main"`
- `FFA_IDLE_TIMEOUT_MS = 30000`
- `FFA_DURATION_SECONDS = 90`
- `MAX_VISIBLE_PLAYERS = 20`
- posisi spawn default pemain: `x = 78`, `y = 220`

Implikasinya:

- room FFA selalu dianggap `running`
- kalau FFA kosong selama 30 detik, state room di-reset penuh
- daftar pemain terdekat dikirim maksimum 20 pemain per klien

## Data Model Server

### ConnectedPlayer

State per pemain yang disimpan server:

- identitas: `playerId`, `displayName`, `variant`
- lifecycle: `joinedAt`, `updatedAt`, `alive`, `finished`, `finishedAt`
- gameplay snapshot: `x`, `y`, `rotation`, `progress`, `score`

Server mempertahankan nilai skor dan progress tertinggi dengan `Math.max(...)`, jadi update klien tidak boleh menurunkan progress yang sudah tercatat.

### FFA room

FFA menyimpan:

- `summary: RoomSummary`
- `players: Map<PlayerId, ConnectedPlayer>`
- `idleTimer`

Saat room di-reset karena idle, seed baru dibuat lagi lewat `randomSeed()`.

### Friends room

Friends room menyimpan:

- `roomId`
- `hostPlayerId`
- `players`
- `summary`
- `countdownTimer`

Host akan dipindah ke pemain berikutnya saat host disconnect selama room masih punya anggota.

## Free For All Flow

### Join

Klien masuk FFA dengan event `ffa:join`.

Saat join:

- idle timer FFA dibatalkan
- pemain dibuat atau dipulihkan dari record yang ada untuk socket itu
- socket join ke room `ffa-main`
- server broadcast state FFA terbaru

### Update gameplay

Klien mengirim `player:update` berisi `snapshot`.

Server lalu:

- memastikan room yang dituju adalah `ffa-main`
- memperbarui posisi, rotasi, variant, dan timestamp pemain
- menaikkan `score` dan `progress` hanya jika nilai baru lebih tinggi
- menandai `finishedAt` saat snapshot pertama kali menyatakan finish
- mem-broadcast ulang state FFA, leaderboard, dan nearby players

### Finish

Klien mengirim `player:finish` saat run selesai.

Server lalu:

- memastikan pemain memang sudah join FFA
- menyimpan `progress` dan `score` tertinggi
- menandai pemain `alive = false`, `finished = true`, dan memberi `finishedAt`
- mem-broadcast ulang state FFA

### Leaderboard

Leaderboard dibangun dari seluruh pemain FFA dengan urutan:

1. `score` tertinggi
2. `progress` tertinggi
3. `joinedAt` paling awal

Server hanya mengirim 10 entri teratas lewat event `leaderboard:update`.

Payload juga menyertakan `maxScore`, yaitu skor pemain teratas saat itu.

### Nearby players

Untuk setiap pemain FFA, server juga mengirim `players:nearby` yang isinya:

- semua pemain selain dirinya sendiri
- diurutkan dengan prioritas pemain hidup dulu, lalu progress, lalu update terbaru
- dipotong maksimal `maxVisiblePlayers`

Model ini cocok dengan pendekatan client saat ini: remote player hanya dipakai untuk presentasi, bukan simulasi otoritatif.

### Idle shutdown

Kalau semua pemain keluar dari FFA:

- server menjadwalkan timer 30 detik
- jika tetap kosong sampai timer selesai, room FFA dibuat ulang dari nol

Reset ini membersihkan leaderboard, pemain, dan seed sebelumnya.

## Friends Room Flow

### Create room

Event `room:create` membuat room baru dengan:

- kode room acak uppercase 6 karakter
- host = socket pembuat room
- status awal `waiting`
- `countdownSeconds = 5`
- `durationSeconds` dari request host

Setelah itu server mengirim:

- `room:created` ke pembuat room
- `room:lobby` ke semua anggota room

### Join room

Event `room:join` hanya berhasil jika:

- room ada
- status room masih `waiting`

Jika valid, pemain dimasukkan ke map room, socket join ke room tersebut, lalu server mengirim `room:joined` dan `room:lobby`.

### Update config

Event `room:update-config` hanya bisa dilakukan oleh host dan hanya saat status `waiting`.

Saat berhasil:

- `durationSeconds` room diperbarui
- server emit `room:state`
- server emit `room:lobby` untuk refresh lobby state per pemain

### Start room

Event `room:start` hanya bisa dilakukan oleh host dan hanya dari status `waiting`.

Saat start:

- status room berubah ke `countdown`
- `startsAt` dan `endsAt` diisi
- server emit `room:countdown`
- server emit `room:lobby`

Setelah countdown selesai:

- status berubah ke `running`
- server emit `room:state`
- server emit `room:lobby`

### Disconnect handling

Saat pemain keluar dari friends room:

- pemain dihapus dari room
- bila host keluar, host baru dipilih dari pemain pertama yang tersisa
- lobby state dikirim ulang
- room dihapus penuh bila sudah kosong

Kalau room sedang punya `countdownTimer`, timer juga dibersihkan saat room dihapus.

## Event Contract

Definisi tipenya ada di [packages/shared/src/index.ts](packages/shared/src/index.ts).

### Client ke server

- `system:ping`
- `ffa:join`
- `room:create`
- `room:join`
- `room:start`
- `room:update-config`
- `player:update`
- `player:finish`

### Server ke client

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

Catatan penting: `room:finished` sudah ada di shared contract, tetapi belum pernah di-emit oleh implementasi server saat ini.

## Error Handling

Server mengirim `server:error` untuk kasus validasi umum seperti:

- room friends tidak ditemukan
- room friends sudah berjalan
- non-host mencoba update config atau start room
- klien mengirim snapshot sebelum join FFA
- klien mencoba memakai `player:update` atau `player:finish` untuk mode friends

Error dikirim hanya ke socket pengirim lewat `io.to(playerId)`.

## Batasan Implementasi Saat Ini

Beberapa hal yang belum diimplementasikan penuh:

- friends mode belum menerima atau mendistribusikan `player:update`
- friends mode belum punya leaderboard akhir dan belum emit `room:finished`
- tidak ada persistence; semua state hilang saat proses restart
- tidak ada autentikasi, rate limiting, atau validasi payload yang ketat
- CORS saat ini terbuka ke semua origin
- room membership sepenuhnya berbasis socket yang sedang terkoneksi

Ini berarti server sekarang paling cocok dipakai sebagai session coordinator dan broadcaster ringan, bukan authoritative multiplayer simulation.

## Debugging dan Operasional

Jika `MULTIPLAYER_DEBUG` aktif, server akan log event penting seperti:

- koneksi dan disconnect socket
- join FFA
- create/join/update/start friends room

Log memakai prefix `[multiplayer]` supaya mudah difilter.

## Saran Pengembangan Berikutnya

Urutan pengembangan yang paling masuk akal dari implementasi sekarang:

1. Tambahkan snapshot handling untuk friends mode.
2. Tambahkan penyelesaian round friends dan emit `room:finished`.
3. Putuskan apakah server akan tetap relay-only atau jadi authoritative untuk progress/score.
4. Tambahkan validasi payload dan guard anti-spam untuk event realtime.
5. Tambahkan persistence bila leaderboard atau room state perlu bertahan lintas restart.