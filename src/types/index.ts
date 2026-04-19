export type FocusWheelSpoke = {
  index: number; // 0–11, where 0 = 1 o'clock
  text: string;
};

export type FocusWheel = {
  id: string;
  centerStatement: string;
  spokes: FocusWheelSpoke[]; // always 12 items
  createdAt: string;
  archivedAt: string | null;
};

export type BulletItem = {
  id: string;
  emoji: string;
  text: string;
};

export type Entry = {
  id: string;
  topic: string;
  bullets: BulletItem[];
  createdAt: string; // ISO date
};

export type WorkshopTopic = 'body' | 'home' | 'relationships' | 'work';

export type WantItem = {
  id: string;
  want: string;
  reasons: string[];
  createdAt: string;
};

export type CustomTopic = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  wants: WantItem[];
};

export type WorkshopArchiveEntry = {
  id: string;
  topic: string;       // built-in key or custom topic id
  topicLabel?: string; // always set for new entries; old entries fall back to TOPIC_CONFIG
  topicEmoji?: string;
  topicColor?: string;
  archivedAt: string;
  items: WantItem[];
};

export type PivotEntry = {
  id: string;
  dontWant: string;   // may be empty — field is optional
  doWants: string[];  // filled statements only
  createdAt: string;
};

export type PlacematItem = {
  id: string;
  text: string;
  list: 'inbox' | 'mine' | 'universe';
  done: boolean;
};

export type ArchivedPlacematItem = {
  id: string;
  text: string;
  list: 'inbox' | 'mine' | 'universe';
  done: boolean;
  archivedAt: string;
};

export type Placemat = {
  id: string;
  items: PlacematItem[];
  createdAt: string;
};

export type Workshop = {
  body: WantItem[];
  home: WantItem[];
  relationships: WantItem[];
  work: WantItem[];
  customTopics: CustomTopic[];
  archive: WorkshopArchiveEntry[];
};

export type ThirtyDayEntry = {
  date: string;             // YYYY-MM-DD
  emotionBefore: number | null;
  emotionAfter: number | null;
  meditationDone: boolean;
  bookDone: boolean;
  focusWheelDone: boolean;
  completed: boolean;
};

export type ThirtyDayProcess = {
  id: string;
  startedAt: string;        // ISO
  completedAt?: string;     // ISO — set when day 30 is done
  abandonedAt?: string;     // ISO — set when 4+ days missed and user restarts
  days: ThirtyDayEntry[];
};

export type ActivityEvent =
  | { type: 'meditation'; timestamp: string; durationMins: number }
  | { type: 'sixty_eight'; timestamp: string }
  | { type: 'emotion'; timestamp: string; level: number }
  | { type: 'placemat'; timestamp: string };
