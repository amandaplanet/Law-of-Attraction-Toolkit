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

export type PlacematItem = {
  id: string;
  text: string;
  list: 'inbox' | 'mine' | 'universe';
  done: boolean;
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
