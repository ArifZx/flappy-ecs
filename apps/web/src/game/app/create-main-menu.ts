import type { GameMode } from '@flappy/shared';

export type MainMenuStartRequest = {
  mode: GameMode;
  displayName: string;
  roomId: string;
  durationSeconds: number;
};

type CreateMainMenuParams = {
  parent: HTMLElement;
  onStart: (request: MainMenuStartRequest) => void;
  onOpen: () => void;
};

export type MainMenuController = {
  open: () => void;
  close: () => void;
  setStatus: (message: string | null) => void;
  isOpen: () => boolean;
};

const MENU_MODES: Array<{
  mode: GameMode;
  title: string;
  description: string;
}> = [
  {
    mode: 'offline',
    title: 'Offline',
    description: 'Solo run with the local deterministic pipe map.',
  },
  {
    mode: 'free-for-all',
    title: 'Free For All',
    description: 'Open room, players can join or leave anytime, top 10 leaderboard stays visible.',
  },
  {
    mode: 'friends',
    title: 'Friends',
    description: 'Private room, 5-second countdown, fixed match timer, final leaderboard.',
  },
];

export const createMainMenu = ({
  parent,
  onStart,
  onOpen,
}: CreateMainMenuParams): MainMenuController => {
  let selectedMode: GameMode = 'offline';

  const overlay = document.createElement('section');
  overlay.className = 'main-menu';
  overlay.setAttribute('aria-label', 'Game mode menu');
  parent.appendChild(overlay);

  const panel = document.createElement('div');
  panel.className = 'main-menu__panel';
  overlay.appendChild(panel);

  const eyebrow = document.createElement('p');
  eyebrow.className = 'main-menu__eyebrow';
  eyebrow.textContent = 'Flappy ECS';
  panel.appendChild(eyebrow);

  const heading = document.createElement('h1');
  heading.className = 'main-menu__title';
  heading.textContent = 'Choose a mode';
  panel.appendChild(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'main-menu__subtitle';
  subtitle.textContent = 'Offline is playable now. Online modes are scaffolded next in the same flow.';
  panel.appendChild(subtitle);

  const modeGrid = document.createElement('div');
  modeGrid.className = 'main-menu__modes';
  panel.appendChild(modeGrid);

  const form = document.createElement('div');
  form.className = 'main-menu__form';
  panel.appendChild(form);

  const nameField = document.createElement('label');
  nameField.className = 'main-menu__field';
  form.appendChild(nameField);

  const nameLabel = document.createElement('span');
  nameLabel.className = 'main-menu__label';
  nameLabel.textContent = 'Display name';
  nameField.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.className = 'main-menu__input';
  nameInput.type = 'text';
  nameInput.maxLength = 18;
  nameInput.placeholder = 'Player';
  nameInput.value = 'Player';
  nameField.appendChild(nameInput);

  const roomField = document.createElement('label');
  roomField.className = 'main-menu__field';
  form.appendChild(roomField);

  const roomLabel = document.createElement('span');
  roomLabel.className = 'main-menu__label';
  roomLabel.textContent = 'Room code';
  roomField.appendChild(roomLabel);

  const roomInput = document.createElement('input');
  roomInput.className = 'main-menu__input';
  roomInput.type = 'text';
  roomInput.maxLength = 12;
  roomInput.placeholder = 'Optional for friends';
  roomField.appendChild(roomInput);

  const durationField = document.createElement('label');
  durationField.className = 'main-menu__field';
  form.appendChild(durationField);

  const durationLabel = document.createElement('span');
  durationLabel.className = 'main-menu__label';
  durationLabel.textContent = 'Room duration';
  durationField.appendChild(durationLabel);

  const durationSelect = document.createElement('select');
  durationSelect.className = 'main-menu__input';
  for (const duration of [45, 60, 90, 120]) {
    const option = document.createElement('option');
    option.value = String(duration);
    option.textContent = `${duration} seconds`;
    if (duration === 60) {
      option.selected = true;
    }
    durationSelect.appendChild(option);
  }
  durationField.appendChild(durationSelect);

  const modeNote = document.createElement('p');
  modeNote.className = 'main-menu__mode-note';
  panel.appendChild(modeNote);

  const status = document.createElement('p');
  status.className = 'main-menu__status';
  status.hidden = true;
  panel.appendChild(status);

  const actions = document.createElement('div');
  actions.className = 'main-menu__actions';
  panel.appendChild(actions);

  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.className = 'main-menu__start';
  actions.appendChild(startButton);

  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'menu-trigger';
  menuButton.textContent = 'Menu';
  menuButton.hidden = true;
  parent.appendChild(menuButton);

  const cards = new Map<GameMode, HTMLButtonElement>();

  const syncFields = (): void => {
    const isFriends = selectedMode === 'friends';
    roomField.hidden = !isFriends;
    durationField.hidden = !isFriends;

    if (selectedMode === 'offline') {
      startButton.textContent = 'Play Offline';
      modeNote.textContent = 'Pure local mode. This stays as the baseline flow while online features land incrementally.';
    } else if (selectedMode === 'free-for-all') {
      startButton.textContent = 'Join FFA';
      modeNote.textContent = 'Open session. Players can freely join or leave, while only the top 10 leaderboard is shown on screen.';
    } else {
      startButton.textContent = 'Enter Friends Room';
      modeNote.textContent = 'Planned flow: waiting room, configurable duration, synced 5-second countdown, and final leaderboard.';
    }
  };

  const syncCards = (): void => {
    for (const [mode, card] of cards) {
      card.dataset.selected = mode === selectedMode ? 'true' : 'false';
    }
  };

  const setSelectedMode = (mode: GameMode): void => {
    selectedMode = mode;
    syncCards();
    syncFields();
  };

  const setStatus = (message: string | null): void => {
    status.hidden = message === null;
    status.textContent = message ?? '';
  };

  for (const entry of MENU_MODES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'main-menu__mode-card';

    const cardTitle = document.createElement('span');
    cardTitle.className = 'main-menu__mode-title';
    cardTitle.textContent = entry.title;
    card.appendChild(cardTitle);

    const cardDescription = document.createElement('span');
    cardDescription.className = 'main-menu__mode-description';
    cardDescription.textContent = entry.description;
    card.appendChild(cardDescription);

    card.addEventListener('click', () => {
      setSelectedMode(entry.mode);
      setStatus(null);
    });

    cards.set(entry.mode, card);
    modeGrid.appendChild(card);
  }

  const open = (): void => {
    overlay.hidden = false;
    menuButton.hidden = true;
    onOpen();
  };

  const close = (): void => {
    overlay.hidden = true;
    menuButton.hidden = false;
  };

  startButton.addEventListener('click', () => {
    const request: MainMenuStartRequest = {
      mode: selectedMode,
      displayName: nameInput.value.trim() || 'Player',
      roomId: roomInput.value.trim().toUpperCase(),
      durationSeconds: Number.parseInt(durationSelect.value, 10),
    };

    onStart(request);
  });

  menuButton.addEventListener('click', open);

  setSelectedMode(selectedMode);

  return {
    open,
    close,
    setStatus,
    isOpen: () => !overlay.hidden,
  };
};