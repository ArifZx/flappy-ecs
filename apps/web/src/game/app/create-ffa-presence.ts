import type { BirdVariant, NearbyPlayersSnapshot, PlayerSnapshot } from '@flappy/shared';
import { Container, Sprite, Text } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';

import { DISPLAY_RESOLUTION } from '../config/display';
import { UI_FONT_FAMILY } from '../config/font';

type CreateFfaPresenceParams = {
  layer: Container;
  sheet: Spritesheet;
};

type RemoteBirdRecord = {
  container: Container;
  sprite: Sprite;
  nameText: Text;
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

const formatPlayerName = (displayName: string): string => {
  const trimmed = displayName.trim();
  if (trimmed.length <= 12) {
    return trimmed || 'Player';
  }

  return `${trimmed.slice(0, 11)}...`;
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

    record.container.destroy({ children: true });
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

    const container = new Container();
    const sprite = new Sprite();
    sprite.anchor.set(0.5);
    sprite.alpha = 0.74;

    const nameText = new Text({
      text: formatPlayerName(snapshot.displayName),
      resolution: DISPLAY_RESOLUTION,
      style: {
        fontFamily: UI_FONT_FAMILY,
        fontSize: 8,
        fontWeight: '700',
        align: 'center',
        padding: 4,
        fill: 0x9cecff,
        stroke: { color: 0x1b2530, width: 1 },
      },
    });
    nameText.anchor.set(0.5, 1);
    nameText.position.set(0, -22);

    container.addChild(nameText, sprite);
    layer.addChild(container);

    const record: RemoteBirdRecord = {
      container,
      sprite,
      nameText,
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
        record.nameText.text = formatPlayerName(snapshot.displayName);
        record.container.position.set(record.snapshot.x, record.snapshot.y);
        record.sprite.rotation = snapshot.rotation;
        record.sprite.alpha = snapshot.alive ? 0.74 : 0.5;
        record.nameText.alpha = snapshot.alive ? 0.8 : 0.56;
        record.container.visible = true;
      }
    },
    update: (_dt, localWorldOffset) => {
      for (const record of remoteBirds.values()) {
        record.container.x = record.snapshot.x - localWorldOffset;
        record.container.y = record.snapshot.y;
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