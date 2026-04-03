import type { BirdVariant, NearbyPlayersSnapshot, PlayerSnapshot } from '@flappy/shared';
import { Container, Sprite } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';

type CreateFfaPresenceParams = {
  layer: Container;
  sheet: Spritesheet;
};

type RemoteBirdRecord = {
  sprite: Sprite;
  frames: Sprite['texture'][];
  variant: BirdVariant;
  snapshot: PlayerSnapshot;
};

export type FfaPresenceController = {
  sync: (payload: NearbyPlayersSnapshot) => void;
  update: (dt: number, localWorldOffset: number) => void;
  clear: () => void;
};

const getBirdFrames = (sheet: Spritesheet, variant: BirdVariant): Sprite['texture'][] =>
  variant === 'red'
    ? [
        sheet.textures['redbird-upflap'],
        sheet.textures['redbird-midflap'],
        sheet.textures['redbird-downflap'],
      ]
    : [
        sheet.textures['yellowbird-upflap'],
        sheet.textures['yellowbird-midflap'],
        sheet.textures['yellowbird-downflap'],
      ];

const resolveBirdTexture = (
  frames: Sprite['texture'][],
  snapshot: PlayerSnapshot,
): Sprite['texture'] => {
  if (!snapshot.alive || snapshot.finished) {
    return frames[2];
  }

  const frameIndex = Math.floor(snapshot.updatedAt / 120) % frames.length;
  return frames[frameIndex];
};

export const createFfaPresence = ({
  layer,
  sheet,
}: CreateFfaPresenceParams): FfaPresenceController => {
  const remoteBirds = new Map<string, RemoteBirdRecord>();

  const destroyBird = (playerId: string): void => {
    const record = remoteBirds.get(playerId);
    if (!record) {
      return;
    }

    record.sprite.destroy();
    remoteBirds.delete(playerId);
  };

  const ensureBird = (snapshot: PlayerSnapshot): RemoteBirdRecord => {
    const existing = remoteBirds.get(snapshot.playerId);
    if (existing && existing.variant === snapshot.variant) {
      return existing;
    }

    if (existing) {
      destroyBird(snapshot.playerId);
    }

    const sprite = new Sprite();
    sprite.anchor.set(0.5);
    sprite.alpha = 0.88;
    layer.addChild(sprite);

    const record: RemoteBirdRecord = {
      sprite,
      frames: getBirdFrames(sheet, snapshot.variant),
      variant: snapshot.variant,
      snapshot,
    };
    remoteBirds.set(snapshot.playerId, record);
    return record;
  };

  return {
    sync: (payload) => {
      const nextIds = new Set(payload.players.map((player) => player.playerId));

      for (const playerId of remoteBirds.keys()) {
        if (!nextIds.has(playerId)) {
          destroyBird(playerId);
        }
      }

      for (const snapshot of payload.players) {
        const record = ensureBird(snapshot);
        record.snapshot = snapshot;
        record.sprite.texture = resolveBirdTexture(record.frames, snapshot);
        record.sprite.position.set(record.snapshot.x, record.snapshot.y);
        record.sprite.rotation = snapshot.rotation;
        record.sprite.alpha = snapshot.alive ? 0.88 : 0.62;
        record.sprite.visible = true;
      }
    },
    update: (_dt, localWorldOffset) => {
      for (const record of remoteBirds.values()) {
        record.sprite.x = record.snapshot.x - localWorldOffset;
        record.sprite.y = record.snapshot.y;
        record.sprite.rotation = record.snapshot.rotation;
      }
    },
    clear: () => {
      for (const playerId of [...remoteBirds.keys()]) {
        destroyBird(playerId);
      }
    },
  };
};