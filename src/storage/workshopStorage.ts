import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workshop, WorkshopTopic, WantItem, WorkshopArchiveEntry, CustomTopic } from '../types';

const STORAGE_KEY = '@creative_workshop';

const BUILTIN_TOPICS: WorkshopTopic[] = ['body', 'home', 'relationships', 'work'];

const BUILTIN_CONFIG: Record<WorkshopTopic, { label: string; emoji: string; color: string }> = {
  body:          { label: 'My Body',          emoji: '🌿', color: '#4CAF50' },
  home:          { label: 'My Home',          emoji: '🏡', color: '#FF9800' },
  relationships: { label: 'My Relationships', emoji: '💗', color: '#E91E63' },
  work:          { label: 'My Work',          emoji: '✨', color: '#7B4FA6' },
};

const CUSTOM_COLORS = ['#9B72CC', '#2196F3', '#FF5722', '#009688', '#E91E63', '#FF9800'];

const EMPTY: Workshop = {
  body: [], home: [], relationships: [], work: [],
  customTopics: [],
  archive: [],
};

function isBuiltin(topic: string): topic is WorkshopTopic {
  return (BUILTIN_TOPICS as string[]).includes(topic);
}

/** Returns the WantItem array for any topic (built-in or custom). */
export function getTopicWants(workshop: Workshop, topic: string): WantItem[] {
  if (isBuiltin(topic)) return workshop[topic as WorkshopTopic];
  return workshop.customTopics.find((t) => t.id === topic)?.wants ?? [];
}

export async function getWorkshop(): Promise<Workshop> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return EMPTY;
    const workshop: Workshop = JSON.parse(json);
    // Migrations
    if (!workshop.archive) workshop.archive = [];
    if (!workshop.customTopics) workshop.customTopics = [];
    // Migrate old why: string → reasons: string[] for built-in topics only
    BUILTIN_TOPICS.forEach((t) => {
      if (!workshop[t]) workshop[t] = [];
      workshop[t].forEach((item: any) => {
        if (!item.reasons) {
          item.reasons = item.why ? [item.why] : [];
          delete item.why;
        }
      });
    });
    return workshop;
  } catch {
    return EMPTY;
  }
}

async function save(workshop: Workshop): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(workshop));
}

// ── Custom topics ─────────────────────────────────────────────────────────────

export async function addCustomTopic(label: string, emoji: string): Promise<CustomTopic> {
  const workshop = await getWorkshop();
  const color = CUSTOM_COLORS[workshop.customTopics.length % CUSTOM_COLORS.length];
  const topic: CustomTopic = {
    id: `custom_${Date.now()}`,
    label,
    emoji,
    color,
    wants: [],
  };
  workshop.customTopics.push(topic);
  await save(workshop);
  return topic;
}

export async function deleteCustomTopic(id: string): Promise<void> {
  const workshop = await getWorkshop();
  workshop.customTopics = workshop.customTopics.filter((t) => t.id !== id);
  await save(workshop);
}

// ── Want CRUD ─────────────────────────────────────────────────────────────────

export async function saveWantItem(topic: string, item: WantItem): Promise<void> {
  const workshop = await getWorkshop();
  if (isBuiltin(topic)) {
    workshop[topic as WorkshopTopic].push(item);
  } else {
    const ct = workshop.customTopics.find((t) => t.id === topic);
    if (ct) ct.wants.push(item);
  }
  await save(workshop);
}

export async function updateWantItem(topic: string, updated: WantItem): Promise<void> {
  const workshop = await getWorkshop();
  if (isBuiltin(topic)) {
    const arr = workshop[topic as WorkshopTopic];
    const idx = arr.findIndex((i) => i.id === updated.id);
    if (idx !== -1) arr[idx] = updated;
  } else {
    const ct = workshop.customTopics.find((t) => t.id === topic);
    if (ct) {
      const idx = ct.wants.findIndex((i) => i.id === updated.id);
      if (idx !== -1) ct.wants[idx] = updated;
    }
  }
  await save(workshop);
}

export async function deleteWantItem(topic: string, id: string): Promise<void> {
  const workshop = await getWorkshop();
  if (isBuiltin(topic)) {
    workshop[topic as WorkshopTopic] = workshop[topic as WorkshopTopic].filter((i) => i.id !== id);
  } else {
    const ct = workshop.customTopics.find((t) => t.id === topic);
    if (ct) ct.wants = ct.wants.filter((i) => i.id !== id);
  }
  await save(workshop);
}

// ── Archiving ─────────────────────────────────────────────────────────────────

export async function archiveTopic(topic: string): Promise<void> {
  const workshop = await getWorkshop();
  let items: WantItem[];
  let topicLabel: string;
  let topicEmoji: string;
  let topicColor: string;

  if (isBuiltin(topic)) {
    items = workshop[topic as WorkshopTopic];
    if (items.length === 0) return;
    const cfg = BUILTIN_CONFIG[topic as WorkshopTopic];
    topicLabel = cfg.label; topicEmoji = cfg.emoji; topicColor = cfg.color;
    workshop[topic as WorkshopTopic] = [];
  } else {
    const ct = workshop.customTopics.find((t) => t.id === topic);
    if (!ct || ct.wants.length === 0) return;
    items = ct.wants;
    topicLabel = ct.label; topicEmoji = ct.emoji; topicColor = ct.color;
    ct.wants = [];
  }

  const entry: WorkshopArchiveEntry = {
    id: Date.now().toString(),
    topic,
    topicLabel,
    topicEmoji,
    topicColor,
    archivedAt: new Date().toISOString(),
    items,
  };
  workshop.archive.push(entry);
  await save(workshop);
}

export async function archiveAllTopics(): Promise<void> {
  const workshop = await getWorkshop();
  const now = new Date().toISOString();

  for (const topic of BUILTIN_TOPICS) {
    if (workshop[topic].length === 0) continue;
    const cfg = BUILTIN_CONFIG[topic];
    workshop.archive.push({
      id: `${Date.now()}-${topic}`,
      topic,
      topicLabel: cfg.label,
      topicEmoji: cfg.emoji,
      topicColor: cfg.color,
      archivedAt: now,
      items: workshop[topic],
    });
    workshop[topic] = [];
  }

  for (const ct of workshop.customTopics) {
    if (ct.wants.length === 0) continue;
    workshop.archive.push({
      id: `${Date.now()}-${ct.id}`,
      topic: ct.id,
      topicLabel: ct.label,
      topicEmoji: ct.emoji,
      topicColor: ct.color,
      archivedAt: now,
      items: ct.wants,
    });
    ct.wants = [];
  }

  await save(workshop);
}

export async function getArchiveForTopic(topic: string): Promise<WorkshopArchiveEntry[]> {
  const workshop = await getWorkshop();
  return workshop.archive.filter((e) => e.topic === topic).reverse();
}

export async function getAllArchives(): Promise<WorkshopArchiveEntry[]> {
  const workshop = await getWorkshop();
  return [...workshop.archive].sort(
    (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
  );
}
